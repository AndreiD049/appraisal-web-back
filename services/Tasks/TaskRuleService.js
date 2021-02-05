const { TaskRuleModel } = require("../../models/Tasks");

const TaskRuleService = {
  async getTaskRules(filter, user) {
    const query = {
      ...(filter.title && { title: filter.title }),
      ...(filter.description && { description: filter.description }),
      ...(filter.type && { type: filter.type }),
      ...(filter.dailyType && { dailyType: filter.dailyType }),
      ...(filter.weeklyDays && { weeklyDays: filter.weeklyDays }),
      ...(filter.monthlyMonths && { monthlyMonths: filter.monthlyMonths }),
      ...(filter.monthlyOn && { monthlyOn: filter.monthlyOn }),
      ...(filter.monthlyOnType && { monthlyOnType: filter.monthlyOnType }),
      ...(filter.isBackgroundTask && { isBackgroundTask: filter.isBackgroundTask }),
      ...(filter.isSharedTask && { isSharedTask: filter.isSharedTask }),
      ...(filter.users && { users: filter.users }),
      ...(filter.flows && { flows: filter.flows }),
      organizationId: user?.id,
    };
    return TaskRuleModel.find(query);
  },

  async getTaskRule(id, user) {
    return TaskRuleModel.findById(id);
  },

  async createTaskRule(data, user) {
    return TaskRuleModel.create({
      ...data,
      createdUser: user?.id,
      organizationId: user?.organization,
    });
  },

  async updateTaskRule(id, data, user) {
    const {
      title,
      description,
      type,
      dailyType,
      weeklyDays,
      monthlyMonths,
      monthlyOn,
      monthlyOnType,
      isBackgroundTask,
      isSharedTask,
      taskStartTime,
      taskDuration,
      users,
      flows,
    } = data;
    return TaskRuleModel.findByIdAndUpdate(id, {
      ...(title && { title }),
      ...(description && { description }),
      ...(type && { type }),
      ...(dailyType && { dailyType }),
      ...(weeklyDays && { weeklyDays }),
      ...(monthlyMonths && { monthlyMonths }),
      ...(monthlyOn && { monthlyOn }),
      ...(monthlyOnType && { monthlyOnType }),
      ...(isBackgroundTask && { isBackgroundTask }),
      ...(isSharedTask && { isSharedTask }),
      ...(taskStartTime && { taskStartTime }),
      ...(taskDuration && { taskDuration }),
      ...(users && { users }),
      ...(flows && { flows }),
      modifiedUser: user?.id,
    }, { new: true });
  },

  async deleteTaskRule(id, user) {
    return TaskRuleModel.findByIdAndDelete(id);
  },
};

module.exports = TaskRuleService;
