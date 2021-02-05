const { TaskModel } = require("../../models/Tasks");

const TaskService = {
  async getTasks(filters, user) {
    const query = {
      ...(filters?.status && {status: filters.status}),
      ...(filters?.priority && {priority: filters.priority}),
      ...(filters?.ruleId && {ruleId: filters.ruleId}),
      ...(filters?.title && {title: filters.title}),
      ...(filters?.expectedStartDate && {expectedStartDate: filters.expectedStartDate}),
      ...(filters?.actualStartDate && {actualStartDate: filters.actualStartDate}),
      ...(filters?.actualFinishDate && {actualFinishDate: filters.actualFinishDate}),
      ...(filters?.assignedTo && {assignedTo: filters.assignedTo}),
      ...(filters?.createdUser && {createdUser: filters.createdUser}),
      organizationId: user?.organization?.id,
    };
    // Filter on dateFrom or dateTo?
    // only filter if not already filtered on date
    if (!query.expectedStartDate && (filters.dateFrom || filters.dateTo)) {
      query .expectedStartDate = {};
      if (filters.dateFrom) {
        query.expectedStartDate.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.expectedStartDate.$lte =  new Date(filters.dateTo);
      }
    }
    return TaskModel.find(query);
  },

  async getTask(id, user) {
    return TaskModel.findById(id);
  },

  async createTask(data, user) {
    return TaskModel.create({
      ...data,
      organizationId: user?.organization?.id,
      createdUser: user?.id,
    });
  },

  async updateTask(id, data, user) {
    const {
      status,
      priority,
      title,
      description,
      remarks,
      actualStartDate,
      actualFinishDate,
      actualDuration,
      assignedTo,
    } = data;
    return TaskModel.findByIdAndUpdate(id, {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(title && { title }),
      ...(description && { description }),
      ...(remarks && { remarks }),
      ...(actualStartDate && { actualStartDate }),
      ...(actualFinishDate && { actualFinishDate }),
      ...(actualDuration && { actualDuration }),
      ...(assignedTo && { assignedTo }),
      modifiedUser: user?.id,
    }, { new: true, });
  },

  async deleteTask(id, user) {
    return TaskModel.findOneAndDelete(id);
  },

};

module.exports = TaskService;

