const moment = require('moment');
const constants = require('../../config/constants');
const UserService = require('../../services/UserService');
const Task = require('./task');
const { updateTask } = require('./taskDAL');
const taskDAL = require('./taskDAL');
const { and, or, validate, perform, If } = require('../../services/validators');

const { types, DayTypes } = constants.tasks;
const {TASK} = constants.securities;

const TaskService = {
  async getDailyTasks(fromDate, toDate, users, user) {
    const toDateCalculated = moment(toDate);
    if (fromDate > toDate) {
      toDateCalculated.add(1, 'day');
    }
    const rules = await taskDAL.getUngeneratedRules(users, toDateCalculated.toDate());
    await this.extendRules(user, rules, moment(toDateCalculated).endOf('month').toDate());
    return taskDAL.getTasks(users, user, fromDate, toDateCalculated.toDate())
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

  async createTask(data, user) {
    return taskDAL.createTask({
      ...data,
      createdUser: user.id,
      organizationId: user.organization?.id,
    });
  },

  async updateTask(id, data, user) {
    const result = await taskDAL.updateTask(id, data);
    return result;
  },

  async updateTaskStatus(id, data, user) {
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
        }, user);
        updated.unpaused = unpaused.result;
      }
    }
    updated.result =  await updateTask(id, update, user);
    return updated;
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

  async createTaskRule(data, user) {
    const rule = await taskDAL.createTaskRule({
      ...data,
      createdUser: user?.id,
      organizationId: user?.organization?.id,
    });
    // Extend the created rule for 1 month initially
    await this.extendRules(user, [rule], moment(rule.validFrom).add(1, 'month'));
    return rule;
  },

  async updateTaskRule(ruleId, data, user) {
    return taskDAL.updateTaskRule(ruleId, data);
  },

  /**
   * Generate tasks given a rule and a dateTo.
   * Important. You cannot generate a task if it's more than a year in the future
   * @param {TaskRule} rule 
   * @param {Date} dateTo 
   */
  async generateTasksUntil(rule, dateTo, assignedTo, user) {
    // Define date from - rule's generatedUntil date
    // iterate from date from to date to (exclusive)
    // for each date, validate it
    // if valid, generate a task
    const dateFrom = moment(rule.generatedUntil ?? rule.validFrom);
    const maxDate = moment.min(dateTo, moment().add(1, 'y'));
    const dates = [];
    for (let i = dateFrom; i.isBefore(maxDate); i.add(1, 'd')) {
      dates.push(i.toDate());
    }
    const calls = dates.map(async (date) => {
      const valid = await this.validateRule(rule, date);
      if (valid) {
        return new Task({ rule, date, assignedTo: [assignedTo], user });
      }
      return null;
    })
    // tasks to be created
    const tasks = (await Promise.all(calls)).filter((t) => t !== null);
    return tasks;
  },

  /**
   * Extend the rules that are not yet generate for a specific date
   * @param {*} user 
   * @param {*} date 
   */
  async extendRules(user, rules, date) {
    /**
     * After rules are determined:
     * For each rule,
     * Determine the date until which it can be extended
     * It's either validTo, or 1 month in the future, whichever is closer (but not farther than a year)
     * For each user of the rule,
     * Generate tasks until the max date for that user (but don't create them yet, only return the array)
     * Collect all tasks to be generated into an array, and insert them all at once
     */
    await Promise.all(rules.map(async (rule) => {
      let oldDate;
      try {
        oldDate = rule.generatedUntil;
        let maxDate = moment.min(moment(date).add(1, 'month'), moment().add(1, 'year'));
        if (rule.validTo) {
          maxDate = moment.min(maxDate, moment(rule.validTo), moment().add(1, 'year'));
        }
        await this.updateTaskRule(rule.id, { generatedUntil: maxDate }, user);
        await Promise.all(rule.users.map(async (u) =>  {
          return taskDAL.createTasks(await this.generateTasksUntil(rule, maxDate, u, user));
        }));
      } catch (err) {
        await this.updateTaskRule(rule.id, { generatedUntil: oldDate }, user);
        throw err;
      }
    }));
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
  async validateRule(rule, date) {
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
