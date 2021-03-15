const moment = require('moment');
const constants = require('../../config/constants');
const UserService = require('../../services/UserService');
const Task = require('./task');
const taskDAL = require('./taskDAL');
const { and, validate, perform, If } = require('../../services/validators');
const MessagePublisher = require('../MessagePublisher');
const createTransaction = require('../../models/dbutils/transaction');

const { types, DayTypes } = constants.tasks;
const {TASK} = constants.securities;

const TaskService = {
  async getDailyTasks(fromDate, toDate, users, user) {
    const dbUser = await UserService.getUser(user.id);
    const toDateCalculated = moment(toDate);
    if (fromDate > toDate) {
      toDateCalculated.add(1, 'day');
    }
    const rules = await taskDAL.getUngeneratedRules(users, toDateCalculated.toDate());
    await this.extendRules(dbUser, rules, moment(toDateCalculated).endOf('month').toDate());
    return taskDAL.getTasks(users, dbUser, fromDate, toDateCalculated.toDate())
  },

  async getBusyTasks(user) {
    return taskDAL.getTasksByStatus(constants.tasks.status.InProgress, {
      userStarted: user,
      isBackgroundTask: false,
    });
  },

  /**
   * Get the first task started by User that is:
   * 1. Background = false
   * 2. Status = Paused
   * Sorted by actualStartDate - ascending
   * @param {Object} user 
   */
  async getTaskToUnpause(user) {
    return taskDAL.getOneTask({
      userStarted: user.id,
      status: constants.tasks.status.Paused,
      isBackgroundTask: false,
    }, null, {
      actualStartDate: 1,
    });
  },

  /**
   * Date from and Date to are including
   * Provided Date from and Date to (which are valid dates):
   * 1. Get all task planning items between those dates
   * 2. Get only items of users who are part of the requested teams 
   * @param {String} dateFrom 
   * @param {String} dateTo 
   */
  async getTaskPlanningItems(dateFrom, dateTo, teams) {
    const momentFrom = moment(dateFrom).hours(0).minutes(0).seconds(0);
    const momentTo = moment(dateTo).hours(23).minutes(59).seconds(59);
    const users = (await UserService.getUsersFromTeams(teams)).map((u) => u.id);
    return taskDAL.getTaskPlanningItems(momentFrom.toDate(), momentTo.toDate(), users);
  },

  async createTask(data, user) {
    const dbUser = await UserService.getUser(user.id);
    return taskDAL.createTask({
      ...data,
      createdUser: user.id,
      organizationId: dbUser?.organization?.id,
    });
  },

  // Create a single task planning item, data is already validated
  async createTaskPlanningItem(data, user) {
    const dbUser = await UserService.getUser(user.id);
    await perform(validate.userExists(dbUser))
    const planningDate = new Date(data.date);
    const calls = data.flows.map((flow) => {
      return this.createFlowTasks(flow, planningDate, data.user, dbUser);
    });
    await Promise.all(calls);
    return taskDAL.createTaskPlanningItem(data, dbUser);
  },

  /**
   * Create Task Planning items provided by user,
   * TODO: when creating an item, you should also generate the tasks for the flows/date assigned 
   * @param {Array} items 
   * @param {Object} user 
   */
  async createTaskPlanningItems(items, user) {
    const dbUser = await UserService.getUser(user.id);
    const calls = items.map(async (item) => {
      const createdPlanning = await taskDAL.createTaskPlanningItem(item, dbUser);
      // generate tasks for created flows
      const flowCalls = createdPlanning.flows.map((flow) => {
        return this.createFlowTasks(flow, createdPlanning.date, createdPlanning.user, dbUser);
      });
      await Promise.all(flowCalls);
      return createdPlanning;
    });
    return Promise.all(calls); 
  },

  async addFlowToPlanning(planningId, flowId, user) {
    const dbUser = await UserService.getUser(user.id);
    await perform(validate.userExists(dbUser));
    const planning = await taskDAL.getTaskPlanningItem(planningId);
    if (!planning) throw new Error('Planning was not found');
    await this.createFlowTasks(flowId, planning.date, planning.user, user);
    return taskDAL.addFlowToPlanning(planningId, flowId, dbUser);
  },

  async removeFlowFromPlanning(planningId, flowId, user) {
    const dbUser = await UserService.getUser(user.id);
    await perform(validate.userExists(dbUser));
    const planning = await taskDAL.getTaskPlanningItem(planningId);
    if (!planning) throw new Error('Planning was not found');
    await this.removeFlowTasks(flowId, planning.date, planning.user, dbUser);
    return taskDAL.removeFlowFromPlanning(planningId, flowId, dbUser);
  },

  async updateTask(id, data, user, transaction = null) {
    const result = await taskDAL.updateTask(id, {
      ...data,
      modifiedUser: user.id,
    }, transaction);
    MessagePublisher.publish(constants.connections.topics.tasks, {
      action: constants.connections.actions.UPDATE,
      target: user.id,
      initiator: user.id,
      data: result,
    });
    return result;
  },

  async updateTaskStatus(id, data, user, trans = null) {
    const initial = await taskDAL.getTask(id);
    const update = { ...data, };
    const { status } = data;
    // Validate
    await perform(and([
      validate.isTruthy(initial),
      validate.userAuthorized(user, TASK.code, TASK.grants.update),
      validate.isTruthy(initial.status !== status, `Status is already ${status}`),
      If(status === constants.tasks.status.Paused, 
        validate.isTruthy(initial.status === constants.tasks.status.InProgress, 'Can only set to Paused from InProgress')),
      validate.isTruthy(initial.assignedTo.filter((u) => u.id === user.id).length > 0, 'Cannot update a task that is not assigned to you')
    ]));
    // if new status is InProgress, set the userStarted and actualStartDate if not specified
    if (status === constants.tasks.status.InProgress) {
      const startDate = data.actualStartDate ?? new Date();
      update.userStarted = user.id;
      update.lastStartDate = new Date();
      if (!initial.actualStartDate) {
        update.actualStartDate = startDate;
      }
    }
    // if status changes to Paused
    // update actual duration = now - actual start date
    if (status === constants.tasks.status.Paused) {
      const duration = moment.duration(moment().diff(initial.lastStartDate));
      update.actualDuration = initial.actualDuration + Math.round(duration.asMinutes());
    }
    // if status is Finished or cancelled
    if (status === constants.tasks.status.Finished ||
        status === constants.tasks.status.Cancelled) {
      const finishDate = data.actualFinishDate ?? new Date();
      // if last status is inProgress, we calculate the duration, same as for Paused
      if (initial.status === constants.tasks.status.InProgress) {
        const duration = moment.duration(moment().diff(initial.lastStartDate));
        update.actualDuration = initial.actualDuration + Math.round(duration.asMinutes());
      }
      // also we insert the actualFinishDate and userFinished
      update.userFinished = user.id;
      update.actualFinishDate = finishDate;
    }
    const transaction = trans ?? await createTransaction();
    return transaction.execute(async () => {
      const updated = {};
      // if initial status is InProgress and new status is not Paused
      if (initial.status === constants.tasks.status.InProgress &&
          status !== constants.tasks.status.Paused) {
        // find a Paused task to unpause, get the first one started
        const paused = await this.getTaskToUnpause(user);
        // if Paused task found, unpause it and return
        if (paused?.id) {
          const unpaused = await this.updateTaskStatus(paused.id, {
            status: constants.tasks.status.InProgress,
          }, user, transaction);
          updated.unpaused = unpaused.result;
        }
      }
      updated.result =  await this.updateTask(id, update, user, transaction);
      return updated;
    });
  },

  /**
   * Get all rules assigned to users of my teams, or assigned to flows of my teams
   */
  async getTaskRules(user) {
    const dbUser = await UserService.getUser(user.id);
    const users = (await UserService.getTeamUsers(user)).map((u) => u.id).concat(user.id);
    // TODO: add flows
    const result = await taskDAL.getTaskRules(dbUser, users);
    return result;
  },

  async getTaskRule(id) {
    return taskDAL.getTaskRule(id);
  },

  /**
   * Get all rules that have a flow assigned to them
   * If date is provided, get only rules that are valid on that date
   * @param {String} flowId 
   * @param {Date} date 
   */
  async getTaskRulesByFlow(flowId, date = null) {
    return taskDAL.getTaskRulesByFlow(flowId, date);
  },

  async createTaskRule(data, user) {
    const transaction = await createTransaction();
    return transaction.execute(async () => {
      const dbUser = await UserService.getUser(user.id);
      const rule = await taskDAL.createTaskRule({
        ...data,
        createdUser: user?.id,
        organizationId: dbUser?.organization?.id,
      }, transaction);
      // Extend the created rule for 1 month initially
      await this.extendRules(dbUser, [rule], moment(rule.validFrom).add(1, 'month'), transaction);
      return rule;
    });
  },

  async updateTaskRule(ruleId, data, user) {
    const transaction = await createTransaction();
    return transaction.execute(async () => {
      let rule = await this.getTaskRule(ruleId, user);
      const validations = and([
        validate.userAuthorized(
          user,
          constants.securities.TASK_RULE.code,
          constants.securities.TASK_RULE.grants.update,
        ),
        If(data.validFrom, validate.isTruthy(!Number.isNaN(+new Date(data.validFrom)), 'Valid from should be a valid date')),
        If(data.validTo, validate.isTruthy(!Number.isNaN(+new Date(data.validTo)), 'Valid from should be a valid date')),
      ]);
      await perform(validations);
      // if i update either validFrom or validTo
      // 1st phase, generate more tasks or delete the unnecessary ones
      if (data.validFrom || data.validTo) {
        if (data.validFrom && rule.validFrom > new Date(data.validFrom)) {
          await taskDAL.createTasks(await this.generateTasksBetween(rule, data.validFrom, rule.validFrom, user), transaction)
        }
        // if i insert valid from, delete all rules that are unmodified before that date
        if (data.validFrom && rule.validFrom < new Date(data.validFrom)) {
          await taskDAL.deleteTasksOfRule(rule.id, {}, null, data.validFrom, transaction)
        }
        if (data.validTo) {
          await taskDAL.deleteTasksOfRule(rule.id, {}, data.validTo, null, transaction);
          // if rule was generated beyond new validTo, update it to the validTo date
          // Because we just deleted all the tasks from it onwards
          if (new Date(rule.generatedUntil) > new Date(data.validTo)) {
            rule = await taskDAL.updateTaskRule(rule.id, { generatedUntil: data.validTo }, transaction);
          }
        }
      }
      // 2nd phase, if i update the title, description or background
      // i just update all unmodified tasks
      if (data.title || data.description || typeof data.isBackgroundTask === 'boolean') {
        const update = {};
        if (data.title) update.title = data.title;
        if (data.description) update.description = data.description;
        if (typeof data.isBackgroundTask === 'boolean') update.isBackgroundTask = data.isBackgroundTask;
        await taskDAL.updateTasksOfRule(rule.id, {}, update, transaction);
      }
      // phase 3, if i update expectedStartTime or duration
      if (data.taskStartTime || data.taskDuration) {
        await taskDAL.deleteTasksOfRule(rule.id, {}, moment().hours(0).minutes(0).seconds(0).toDate(), null, transaction);
        rule = await taskDAL.updateTaskRule(rule.id, { generatedUntil: new Date() }, transaction);
      }
      return taskDAL.updateTaskRule(ruleId, {
        ...data,
        modifiedUser: user.id,
      }, transaction);
    });
  },

  /**
   * Generate tasks given a rule and a dateTo.
   * Important. You cannot generate a task if it's more than a year in the future
   * @param {TaskRule} rule 
   * @param {Date} dateTo 
   */
  async generateTasksBetween(rule, dateFrom, dateTo, user, transaction = null) {
    // Define date from - rule's generatedUntil date
    // iterate from date from to date to (exclusive)
    // for each date, validate it
    // if valid, generate a task
    if (rule.users.length) {
      const dates = [];
      for (let i = moment(dateFrom); i.isBefore(dateTo); i.add(1, 'd')) {
        dates.push(i.toDate());
      }
      const tasks = await Promise.all(dates.map((date) => {
        const valid = this.validateRule(rule, date);
        if (valid) {
          if (rule.isSharedTask) {
            return this.generateSharedTask(rule, date, user, transaction);
          }
          return rule.users.map((u) => new Task({ rule, date, assignedTo: [u], user}))
        }
        return null;
      }));
      // tasks to be created
      return tasks.flat().filter((t) => t !== null);
    } 
    return null;
  },

  /**
   * 
   * @param {Object} rule 
   * @param {Date} date 
   * @param {Object} user 
   */
  async generateSharedTask(rule, date, user, transaction = null) {
    // First check if the task was not created yet on that date
    const existingTask = (await taskDAL.getTasksOnDate(date, {
      ruleId: rule.id,
    }))[0];
    if (existingTask) {
      // if it was, update the task by appending rule.users to task.assignedTo and return null
      const newUsers = new Set(rule.users.map((u) => String(u)).concat(existingTask.assignedTo.map((u) => String(u.id))));
      await this.updateTask(existingTask.id, {
        assignedTo: Array.from(newUsers),
      }, user, transaction);
      return null;
    }
    // if ti wasn't, create a task ad return it
    return new Task({ rule, date, assignedTo: rule.users, user});
  },

  /**
   * Extend the rules that are not yet generate for a specific date
   * @param {*} user 
   * @param {*} date 
   */
  async extendRules(user, rules, date, trans = null) {
    /**
     * After rules are determined:
     * For each rule,
     * Determine the date until which it can be extended
     * It's either validTo, or 1 month in the future, whichever is closer (but not farther than a year)
     * For each user of the rule,
     * Generate tasks until the max date for that user (but don't create them yet, only return the array)
     * Collect all tasks to be generated into an array, and insert them all at once
     */
    const transaction = trans ?? await createTransaction();
    await transaction.execute(async () => {
      await Promise.all(rules.map(async (rule) => {
        const oldDate = rule.generatedUntil;
        let maxDate = moment.min(moment(date).add(1, 'month'), moment().add(1, 'year'));
        if (rule.validTo) {
          maxDate = moment.min(maxDate, moment(rule.validTo), moment().add(1, 'year'));
        }
        await taskDAL.updateTaskRule(rule.id, { generatedUntil: maxDate }, transaction);
        const dateFrom = moment(oldDate ?? rule.validFrom);
        await taskDAL.createTasks(await this.generateTasksBetween(rule, dateFrom, maxDate, user, transaction), transaction);
      }));
    });
  },

  /**
   * Generate a task related to a flow
   * Given the flow, rule, date of the task
   * Important, only creates the Object, does not add it to the DB
   * If it's a shared rule:
   *  - check if the task was already created
   *  - if so, do not create a new one, just update the existing, and return null
   * @param {{id: String}} flow 
   * @param {{id: String}} rule 
   * @param {Date} date 
   * @param {String} assignedTo
   * @param {{id: String}} user 
   */
  async generateFlowTask(flowId, rule, date, assignedTo, user) {
    if (rule.isSharedTask) {
      const task = (await taskDAL.getTasksOnDate(date, {
        ruleId: rule.id,
      }))[0];
      if (task?.id) {
        const assignedSet = new Set(task.assignedTo.map((u) => u.id));
        assignedSet.add(String(assignedTo));
        await taskDAL.updateTask(task.id, {
          flowId,
          assignedTo: Array.from(assignedSet)
        });
        return null;
      }
    }
    return new Task({ rule, flowId, date, assignedTo: [assignedTo], user });
  },

  /**
   * Create all tasks related to a flow
   * @param {String} flowId
   * @param {Date} date Date for which the flow was assigned
   * @param {String} assignedTo User id to which the flow was assigned
   * @param {{id: String}} user User who assigned the flow
   */
  async createFlowTasks(flowId, date, assignedTo, user) {
    // find all rules that are assigned to this flow and are valid on @date
    const dbUser = await UserService.getUser(user.id);
    const rules = await this.getTaskRulesByFlow(flowId, date);
    const calls = rules.map(async (rule) => {
      if (this.validateRule(rule, date)) {
        //  If rule is valid, generate a task for it, save it in array
        return this.generateFlowTask(flowId, rule, date, assignedTo, dbUser);
      }
      return null;
    });
    // After all rules were processed, create all tasks saved into the array
    const tasks = (await Promise.all(calls)).filter((t) => Boolean(t));
    await taskDAL.createTasks(tasks);
  },

  async removeFlowTask(task, assignedTo, user) {
    const rule = await taskDAL.getTaskRule(task.ruleId);
    if (!rule) throw new Error('Task doesn\'t have a rule');
    // if a task is not shared, delete it 
    if (!rule.isSharedTask) return taskDAL.deleteTask(task.id);
    const ruleUsers = new Set(rule.users.map((u) => u.id));
    // if a task is shared, and user is not in the rule.users, remove the user from assignedTo 
    if (!ruleUsers.has(assignedTo)) {
      const updatedAssignedTo = task.assignedTo
        .map((u) => u.id)
        .filter((id) => String(id) !== String(assignedTo));
      return this.updateTask(task.id, {
        assignedTo: updatedAssignedTo,
      }, user);
    }
    // if task is shared, but user is in rule.users, do nothing, we don't need to remove that task
    return null;
  },

  /**
   * @param {String} flowId Flow which was removed
   * @param {Date} date Date on which the flow was removed
   * @param {String} assignedTo User from which the flow was removed
   * @param {Object} user User who removed the flow
   */
  async removeFlowTasks(flowId, date, assignedTo, user) {
    // find all tasks on date, related to flow
    const tasks = await taskDAL.getTasksOnDate(date, { flowId, status: constants.tasks.status.New });
    // for each task
    // call removeFlowTask on it
    const calls = tasks.map(async (task) => {
      return this.removeFlowTask(task, assignedTo, user);
    });
    return Promise.all(calls);
  },

  /**
   * Validate a rule agains a date.
   * First check the type of the rule
   * Then, depending on rule type, decide whether rule is valid or not
   * Daily rule: 
   *  - if daily type is calendar, just return true
   *  - else get the weekday, if it's > 0 (sunday) and < 6 (saturday), then return yes
   *  - else return false
   */
  validateRule(rule, date) {
    const { type } = rule;
    // if date is not valid, return false
    if (!moment.isDate(date) && !moment.isMoment(date)) return false;
    // if date is farther than a year from now, return false
    if (moment().add(1, 'y').isBefore(date)) return false;
    switch (type) {
      case types.Daily:
        return this.dailyValidate(rule, date);
      case types.Weekly:
        return false;
      case types.Monthly:
        return false;
      default:
        return false;
    }
  },

  dailyValidate(rule, date) {
    if (rule.dailyType === DayTypes.Calendar) return true;
    const weekDay = moment(date).day();
    if (weekDay > 0 && weekDay < 6) return true;
    return false;
  },
};

module.exports = TaskService; 
