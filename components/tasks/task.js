const { DateTime } = require('luxon');

class Task {
  /**
   * Params: rule, array of users assignedTo, user who generates the task
   * @param {{
   *  rule: Object, 
   *  flowId: String,
   *  date: Date,  
   *  assignedTo: [Object], 
   *  user: Object
   * }} data 
   */
  constructor(data) {
    const startDateTime = DateTime.fromJSDate(data.date).set({
      hour: data.rule.taskStartTime.getHours(),
      minute: data.rule.taskStartTime.getMinutes(),
      second: data.rule.taskStartTime.getSeconds(),
    })
    const endDateTime = startDateTime.plus({ minute: data.rule.taskDuration });
    this.ruleId = data.rule.id;
    this.title = data.rule.title;
    this.expectedStartDate = startDateTime.toJSDate();
    this.duration = data.rule.taskDuration;
    this.createdUser = data.user?._id ?? data.user.id;
    this.isBackgroundTask = data.rule.isBackgroundTask;
    this.organizationId = data.user?.organization?.id;
    this.assignedTo = data.assignedTo;
    this.zone = data.rule.zone;
    if (data.flowId) this.flowId = data.flowId;
    if (data.rule.priority) this.priority = data.rule.priority;
    if (data.rule.description) this.description = data.rule.description;
    if (data.rule.remarks) this.remarks = data.rule.remarks;
  }
};

module.exports = Task;