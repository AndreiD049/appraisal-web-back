const taskRuleRouter = require('express').Router();
const TaskService = require('../taskService');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { TASK_RULE } = require('../../../config/constants').securities;
const { taskRuleSchema } = require('../taskUtils');

// before each request check if there is a user
taskRuleRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

taskRuleRouter.get('/', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.read), async (req, res, next) => {
  try {
    const result = await TaskService.getTaskRules(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.get('/:id', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.read), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskService.getTaskRule(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.post('/', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.create), async (req, res, next) => {
  try {
    console.log(req.body);
    await taskRuleSchema.validateAsync(req.body);
    const data = req.body;
    const result = await TaskService.createTaskRule(data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.put('/:id', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.update), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await TaskService.updateTaskRule(id, data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.delete('/:id', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.delete), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskService.deleteTaskRule(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = taskRuleRouter;