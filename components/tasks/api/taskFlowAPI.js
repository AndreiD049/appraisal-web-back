const Joi = require('joi');
const taskFlowRouter = require('express').Router();
const TaskFlowService = require('../taskFlowService');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { TASK_FLOW } = require('../../../config/constants').securities;

taskFlowRouter.get('/', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.read), async (req, res, next) => {
  try {
    const result = await TaskFlowService.getTaskFlows(req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.get('/:id', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.read), async (req, res, next) => {
  try {
    await Joi.object({
      id: Joi.string(),
    }).validateAsync(req.params);
    const { id } = req.params;
    // const result = await TaskService.getTaskFlow(id, req.user);
    const result = await TaskFlowService.getTaskFlow(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.post('/', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.create), async (req, res, next) => {
  try {
    await Joi.object({
      name: Joi.string().required(),
      teams: Joi.array().required(),
      color: Joi.string().required(),
    }).validateAsync(req.body);
    const data = req.body;
    const result = await TaskFlowService.createTaskFlow(data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskFlowRouter.put('/:id', AuthorizeReq(TASK_FLOW.code, TASK_FLOW.grants.update), async (req, res, next) => {
  try {
    await Joi.object({
      id: Joi.string().required(),
    }).validateAsync(req.params);
    const { id } = req.params;
    await Joi.object({
      name: Joi.string(),
      teams: Joi.array(),
      color: Joi.string(),
      isActive: Joi.boolean(),
    }).validateAsync(req.body);
    const data = req.body;
    // const result = await TaskService.updateTaskFlow(id, data, req.user);
    const result = await TaskFlowService.updateTaskFlow(id, data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = taskFlowRouter;