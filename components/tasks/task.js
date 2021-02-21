const moment = require('moment');

class Task {
  constructor(data) {
    const startDateTime = moment(data.date).set({
      hour: data.rule.taskStartTime.getHours(),
      minute: data.rule.taskStartTime.getMinutes(),
      second: data.rule.taskStartTime.getSeconds(),
    });
    const endDateTime = moment(startDateTime).add(data.rule.taskDuration, 'minutes');
    this.ruleId = data.rule.id;
    this.title = data.rule.title;
    this.expectedStartDate = startDateTime.toDate();
    this.expectedFinishDate = endDateTime.toDate();
    this.createdUser = data.user?._id ?? data.user.id;
    this.isBackgroundTask = data.rule.isBackgroundTask;
    this.organizationId = data.user?.organization?.id;
    this.assignedTo = data.assignedTo;
    if (data.rule.priority) this.priority = data.rule.priority;
    if (data.rule.description) this.description = data.rule.description;
    if (data.rule.remarks) this.remarks = data.rule.remarks;
  }
};

module.exports = Task;