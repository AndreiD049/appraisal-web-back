const taskRuleRouter = require('express').Router();
const { TaskRuleService } = require('../../../services/Tasks');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { TASK_RULE } = require('../../../config/constants').securities;

// before each requestm check if there is a user
taskRuleRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

taskRuleRouter.get('/', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.read), async (req, res, next) => {
  try {
    const filter = req.params;
    const result = await TaskRuleService.getTaskRules(filter, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.get('/:id', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.read), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskRuleService.getTaskRule(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.post('/', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.create), async (req, res, next) => {
  try {
    const data = res.body;
    const result = await TaskRuleService.createTaskRule(data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.put('/:id', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.update), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await TaskRuleService.updateTaskRule(id, data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRuleRouter.delete('/:id', AuthorizeReq(TASK_RULE.code, TASK_RULE.grants.delete), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskRuleService.deleteTaskRule(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = taskRuleRouter;