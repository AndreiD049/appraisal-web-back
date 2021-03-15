const moment = require('moment');
const { TaskModel } = require('../../models/Tasks/TaskModel');
const { TaskRuleModel } = require('../../models/Tasks/TaskRuleModel');
const { TaskFlowModel } = require('../../models/Tasks/TaskFlowModel');
const { TaskPlanningModel } = require('../../models/Tasks');

const taskDAL = {

  /**
   * Region Tasks
   */
  async getTasks(assignedTo, user, from, to = null) {
    const startDate = { $gte: from };
    if (to !== null) {
      startDate.$lte = to;
    } 
    const query = {
      $or: [
        { expectedStartDate: startDate },
        { actualStartDate: startDate }
      ],
      assignedTo: {$in: assignedTo},
      organizationId: user?.organization?.id,
    };
    return TaskModel.find(query).populate({ path: 'assignedTo', select: 'username' });
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

  async getTasksOnDate(date, options) {
    const dtStart = moment(date).startOf('day');
    const dtEnd = moment(date).endOf('day');
    const query = {
      ...options,
      $and: [
        { expectedStartDate: { $gte: dtStart.toDate() } },
        { expectedStartDate: { $lte: dtEnd.toDate() } }
      ]
    };
    return TaskModel.find(query).populate({ path: 'assignedTo', select: 'username' });
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

  async deleteTask(id) {
    return TaskModel.findOneAndDelete(id);
  },

  /**
   * Region Task Rules
   */

  async getTaskRules(user, users = [], flows = []) {
    const query = {
      organizationId: user?.organization?.id,
    };
    if (users.length) query.users = { $in: users };
    if (flows.length) query.relatedFlows = flows;
    return TaskRuleModel.find(query).populate({ path: 'users', select: 'username' });
  },

  async getTaskRulesByFlow(flowId, date = null) {
    const query = {
      flows: flowId,
    };
    const dtEnd = moment(date).endOf('day').toDate();
    if (date instanceof Date) {
      query.validFrom = { $lte: dtEnd, };
      query.$or = [
        { validTo: null },
        { validTo: { $gt: dtEnd } },
      ];
    }
    return TaskRuleModel.find(query);
  },

  async getTaskRule(id) {
    return TaskRuleModel.findById(id).populate({ path: 'users createdUser', select: 'username' });
  },

  async createTaskRule(data, transaction = null) {
    const doc = new TaskRuleModel(data);
    return (await doc.save({ session: transaction })).populate({ path: 'users', select: 'username' });
  },

  async updateTaskRule(id, data, transaction) {
    return TaskRuleModel.findByIdAndUpdate(id, data, { new: true, session: transaction }).populate({ path: 'users', select: 'username' });
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

  async getTaskPlanningItem(id) {
    return TaskPlanningModel.findById(id);
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

  async addFlowToPlanning(planningId, flowId, user) {
    const planning = await TaskPlanningModel.findById(planningId);
    if (!planning) throw new Error('Planning not found', planningId);
    if (planning.flows.map((f) => String(f)).indexOf(String(flowId)) !== -1)
      throw new Error('Flow is already assigned');
    return TaskPlanningModel.findByIdAndUpdate(planningId, {
      flows: planning.flows.concat(flowId),
      modifiedUser: user.id,
    }, { new: true }) .populate({
     path: 'flows user',
     select: 'name color username',
    });
  },

  async removeFlowFromPlanning(planningId, flowId, user) {
    const planning = await TaskPlanningModel.findById(planningId);
    if (!planning) throw new Error('Planning not found', planningId);
    if (!planning.flows.find((f) => String(f) === flowId))
      throw new Error('Flow was not found');
    return TaskPlanningModel.findByIdAndUpdate(planningId, {
      flows: planning.flows.filter((f) => String(f) !== flowId),
      modifiedUser: user.id,
    }, { new: true }).populate({
     path: 'flows user',
     select: 'name color username',
    });
  },

};

module.exports = taskDAL;