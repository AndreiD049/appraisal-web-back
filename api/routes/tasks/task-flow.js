const taskFlowRouter = require('express').Router();
const { TaskFlowService } = require('../../../services/Tasks');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { TASK_FLOW } = require('../../../config/constants').securities;

taskFlowRouter.get('/', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.read), async (req, res, next) => {
  try {
    const filter = req.params;
    const result = await TaskFlowService.getTaskFlows(filter, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.get('/:id', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.read), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskFlowService.getTaskFlow(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.post('/', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.create), async (req, res, next) => {
  try {
    const data = res.body;
    const result = await TaskFlowService.createTaskFlow(data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.put('/:id', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.update), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await TaskFlowService.updateTaskFlow(id, data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.delete('/:id', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.delete), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskFlowService.deleteTaskFlow(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = taskFlowRouter;