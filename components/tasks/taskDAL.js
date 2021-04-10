const { DateTime } = require('luxon');
const { TaskModel } = require('../../models/Tasks/TaskModel');
const { TaskRuleModel } = require('../../models/Tasks/TaskRuleModel');
const { TaskFlowModel } = require('../../models/Tasks/TaskFlowModel');
const { TaskPlanningModel } = require('../../models/Tasks');
const {status} = require('../../config').constants.tasks;

const taskDAL = {

  /**
   * Region Tasks
   */
  async getTasks(assignedTo, user, from, to = null, additional = null, transaction = null) {
    const startDate = { $gte: from };
    if (to !== null) {
      startDate.$lte = to;
    } 
    const query = {
      $or: [
        { expectedStartDate: startDate },
        { actualStartDate: startDate },
        {
          expectedStartDate: { $lt: from },
          status: { $in: [status.New, status.InProgress, status.Paused] }
        },
        {
          actualStartDate: { $lt: from },
          status: { $in: [status.New, status.InProgress, status.Paused] }
        }
      ],
      organizationId: user?.organization?.id,
      ...additional,
    };
    if (assignedTo.length > 0) {
      query.assignedTo = { $in: assignedTo };
    }
    return TaskModel.find(query).session(transaction).populate({ path: 'assignedTo', select: 'username' });
  },

  async getTasksByStatus(status, options = null) {
    let query = {
      status,
    }
    if (options) {
      query = {
        ...query,
        ...options,
      };
    }
    return TaskModel.find(query).populate({ path: 'assignedTo', select: 'username' });
  },

  async getUnmodifiedTasks(query = {}) {
    return TaskModel.find({
      modifiedUser: null,
      ...query,
    }).populate({ path: 'assignedTo', select: 'username' });
  },

  async getTasksOnDate(date, options, transaction = null) {
    const dtStart = DateTime.fromJSDate(date).startOf('day');
    const dtEnd = DateTime.fromJSDate(date).endOf('day');
    const query = {
      ...options,
      $and: [
        { expectedStartDate: { $gte: dtStart.toJSDate() } },
        { expectedStartDate: { $lte: dtEnd.toJSDate() } }
      ]
    };
    return TaskModel.find(query).session(transaction).populate({ path: 'assignedTo', select: 'username' });
  },

  async getTask(id) {
    return TaskModel.findById(id).populate({ path: 'assignedTo', select: 'username' });
  },

  async getOneTask(query, fields = null, sort = null) {
    return TaskModel.findOne(query, fields, sort).populate({ path: 'assignedTo', select: 'username' });
  },

  async createTask(data) {
    return (await TaskModel.create(data)).populate({ path: 'assignedTo', select: 'username' }).execPopulate();
  },

  async createTasks(tasks, transaction = null) {
    if (!tasks) return null;
    return TaskModel.insertMany(tasks, { session: transaction });
  },

  async updateTask(id, data, transaction) {
    return TaskModel.findByIdAndUpdate({ _id: id }, data, { new: true, upsert: false, session: transaction }).populate({ path: 'assignedTo', select: 'username' });
  },

  async updateTasksOfRule(ruleId, query, data, transaction = null) {
    return TaskModel.updateMany({
      ruleId,
      modifiedUser: null,
      ...query,
    }, data, { new: true, session: transaction });
  },

  async updateTasksOfRuleCb(ruleId, query, cb, transaction = null) {
    const tasks = await TaskModel.find({
      ruleId,
      modifiedUser: null,
      ...query,
    });
    const calls = tasks.map(async (task) => cb(task, transaction));
    const result = await Promise.all(calls);
    return result;
  },

  async deleteTasksOfRule(ruleId, query, dateFrom = null, dateTo = null, transaction = null) {
    const dateQuery = {
      expectedStartDate: {
        $exists: true,
      }
    };
    if (dateFrom !== null) {
      dateQuery.expectedStartDate.$gte = dateFrom;
    }
    if (dateTo !== null) {
      dateQuery.expectedStartDate.$lt = dateTo;
    }
    return TaskModel.deleteMany({
      ruleId,
      modifiedUser: null,
      ...query,
      ...dateQuery,
    }, { session: transaction });
  },

  async deleteTask(id, transaction = null) {
    return TaskModel.findByIdAndDelete(id).session(transaction);
  },

  /**
   * Region Task Rules
   */

  async getTaskRules(user, users = [], flows = []) {
    const query = {
      organizationId: user?.organization?.id,
      $or: []
    };
    if (users.length) query.$or.push({ users: { $in: users }});
    if (flows.length) query.$or.push({flows: { $in: flows }});
    return TaskRuleModel.find(query).populate({ path: 'users flows', select: 'username color name' });
  },

  async getTaskRulesByFlow(flowId, date = null, transaction = null) {
    const query = {
      flows: flowId,
    };
    const dtEnd = DateTime.fromJSDate(date).endOf('day').toJSDate();
    if (date instanceof Date) {
      query.validFrom = { $lte: dtEnd, };
      query.$or = [
        { validTo: null },
        { validTo: { $gt: dtEnd } },
      ];
    }
    return TaskRuleModel.find(query).session(transaction);
  },

  async getTaskRule(id, transaction = null) {
    return TaskRuleModel.findById(id).session(transaction).populate({ path: 'users createdUser flows', select: 'username color name' });
  },

  async createTaskRule(data, transaction = null) {
    const doc = new TaskRuleModel(data);
    const result = await doc.save({ session: transaction });
    return TaskRuleModel.populate(result, { path: 'users createdUser flows', select: 'username color name' });
  },

  async updateTaskRule(id, data, transaction) {
    return TaskRuleModel.findByIdAndUpdate(id, data, { new: true, session: transaction }).populate({ path: 'users flows', select: 'username color name' });
  },

  async deleteTaskRule(id) {
    return TaskRuleModel.findByIdAndDelete(id);
  },

  /**
   * Based on user and date, get rules:
   *  1. that are still valid on the date provided
   *    - date validTo is <= than date or:
   *    - date validTo is empty
   *  2. that have the date generatedUntil < date provided 
   *  3. where user provided is found in users array
   */
  async getUngeneratedRules(users, date) {
    const rules = TaskRuleModel.find({
      $and: [
        {
          $or: [
            { validTo: null },
            { validTo: { $gt: date } }
          ]
        },
        {
          $or: [
            { generatedUntil: { $lt: date } },
            { generatedUntil: null },
          ]
        },
        { users: { $in: users } },
      ]
    });
    return rules;
  },

  /**
   * Region Task FLows
   */

  // Get flows
  async getTaskFlows(teams, organizationId) {
    return TaskFlowModel.find({
      organizationId,
      teams: {$in: teams},
    })
      .populate({ path: 'teams', select: 'name' });
  },

  async getTaskFlow(id) {
    return TaskFlowModel.findById(id)
      .populate({ path: 'teams', select: 'name' });
  },

  // Create a new Flow
  async createTaskFlow(data) {
    return TaskFlowModel.populate(await TaskFlowModel.create(data), {
      path: 'teams', select: 'name' 
    });
  },

  async updateTaskFlow(id, data) {
    return TaskFlowModel.findByIdAndUpdate(id, data, { new: true })
      .populate({ path: 'teams', select: 'name' });
  },

  /**
   * Region Task Planning
   */

  async getTaskPlanningItem(id, transaction = null) {
    return TaskPlanningModel.findById(id).session(transaction);
  },

  async getTaskPlanningItems(dateFrom, dateTo, users) {
    return TaskPlanningModel.find({
      date: {
        $gte: dateFrom,
        $lte: dateTo
      },
      user: {$in: users},
    })
      .populate('flows user', 'name color username');
  },

  async getTaskPlanningItemsByFlow(flowId, user, transaction = null) {
    return TaskPlanningModel.find({
      flows: flowId,
      organizationId: user.organization?.id,
    }).session(transaction)
      .populate('flows user', 'name color username');
  },

  async createTaskPlanningItem(item, user) {
    if (!user.id || !user.organization?.id) throw new Error('User is not valid');
    return TaskPlanningModel.populate(await TaskPlanningModel.create({
      ...item,
      createdUser: user.id,
      organizationId: user.organization.id,
    }),
    {
     path: 'flows user',
     select: 'name color username',
    });
  },

  async addFlowToPlanning(planningId, flowId, user, transaction = null) {
    const planning = await TaskPlanningModel.findById(planningId).session(transaction);
    if (!planning) throw new Error('Planning not found', planningId);
    if (planning.flows.map((f) => String(f)).indexOf(String(flowId)) !== -1)
      throw new Error('Flow is already assigned');
    return TaskPlanningModel.findByIdAndUpdate(planningId, {
      flows: planning.flows.concat(flowId),
      modifiedUser: user.id,
    }, { new: true, session: transaction }).populate({
     path: 'flows user',
     select: 'name color username',
    });
  },

  async removeFlowFromPlanning(planningId, flowId, user, transaction = null) {
    const planning = await TaskPlanningModel.findById(planningId).session(transaction);
    if (!planning) throw new Error('Planning not found', planningId);
    if (!planning.flows.find((f) => String(f) === flowId))
      throw new Error('Flow was not found');
    return TaskPlanningModel.findByIdAndUpdate(planningId, {
      flows: planning.flows.filter((f) => String(f) !== flowId),
      modifiedUser: user.id,
    }, { new: true, session: transaction }).populate({
     path: 'flows user',
     select: 'name color username',
    });
  },

};

module.exports = taskDAL;
