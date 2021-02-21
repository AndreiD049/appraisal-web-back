const { TaskModel } = require('../../models/Tasks/TaskModel');
const { TaskRuleModel } = require('../../models/Tasks/TaskRuleModel');
const { TaskFlowModel } = require('../../models/Tasks/TaskFlowModel');
const { constants } = require('../../config');

const taskDAL = {

  /**
   * Tasks
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

  async getTask(id) {
    return TaskModel.findById(id).populate({ path: 'assignedTo', select: 'username' });
  },

  async getOneTask(query, fields = null, sort = null) {
    return TaskModel.findOne(query, fields, sort);
  },

  async createTask(data) {
    return (await TaskModel.create(data)).populate({ path: 'assignedTo', select: 'username' }).execPopulate();
  },

  async createTasks(tasks) {
    return TaskModel.insertMany(tasks);
  },

  async updateTask(id, data) {
    return TaskModel.findByIdAndUpdate(id, data, { new: true, }).populate({ path: 'assignedTo', select: 'username' });
  },

  async deleteTask(id) {
    return TaskModel.findOneAndDelete(id);
  },

  async getTaskRules(user, users = [], flows = []) {
    const query = {
      organizationId: user?.organization?.id,
    };
    if (users.length) query.users = { $in: users };
    if (flows.length) query.relatedFlows = flows;
    return TaskRuleModel.find(query).populate({ path: 'users', select: 'username' });
  },

  async getTaskRule(id) {
    return TaskRuleModel.findOne({
      _id: id,
    }).populate({ path: 'users', select: 'username' });
  },

  async createTaskRule(data) {
    return (await TaskRuleModel.create(data)).populate({ path: 'users', select: 'username' }).execPopulate();
  },

  async updateTaskRule(id, data) {
    return TaskRuleModel.findByIdAndUpdate(id, data, { new: true }).populate({ path: 'users', select: 'username' });
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
            { validTo: { $lte: date } }
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

  // Get flows
  async getTaskFlows(query) {
    return TaskFlowModel.find(query);
  },

  async getTaskFlow(id) {
    return TaskFlowModel.findById(id);
  },

  // Create a new Flow
  async createTaskFlow(data) {
    return TaskFlowModel.create(data);
  },

  async updateTaskFlow(id, data) {
    return TaskFlowModel.findByIdAndUpdate(id, data, { new: true });
  },

  async deleteTaskFlow(id) {
    return TaskFlowModel.findOneAndDelete(id);
  },
};

module.exports = taskDAL;