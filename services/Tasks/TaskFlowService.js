const { TaskFlowModel } = require("../../models/Tasks");

const TaskFlowService = {
  // Get flows
  async getTaskFlows(filters, user) {
    const query = {
      ...(filters.name && { name: filters.name }),
      ...(filters.teams && { teams: { $in: filters.teams } }),
      organizationId: user.organization,
    };
    return TaskFlowModel.find(query);
  },

  async getTaskFlow(id, user) {
    return TaskFlowModel.findById(id);
  },

  // Create a new Flow
  async createTaskFlow(data, user) {
    const { name, teams, organizationId } = data;
    return TaskFlowModel.create({
      name, teams, organizationId,
      createdUser: user?.id,
    });
  },

  async updateTaskFlow(id, update, user) {
    const { name, teams } = update;
    return TaskFlowModel.findByIdAndUpdate(id, {
      ...(name && { name }),
      ...(teams && { teams }),
      modifiedUser: user.id,
    }, { new: true });
  },

  async deleteTaskFlow(id, user) {
    return TaskFlowModel.findOneAndDelete(id);
  },
};

module.exports = TaskFlowService;
