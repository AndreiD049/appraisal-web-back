const taskMainRouter = require('express').Router();
const taskRouter = require('./task');
const taskRuleRouter = require('./task-rule');
const taskFlowRouter = require('./task-flow');

taskMainRouter.use('/api/tasks', taskRouter);
taskMainRouter.use('/api/task-rules', taskRuleRouter);
taskMainRouter.use('/api/task-flows', taskFlowRouter);

module.exports = taskMainRouter;
