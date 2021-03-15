const Joi = require('joi');
const taskPlanningRouter = require('express').Router();
const TaskService = require('../taskService');
const endpointWrapper = require('../../../utils/endpointWrapper');
const { TASK_PLANNING } = require('../../../config/constants').securities;
const { AuthorizeReq } = require('../../../services/AuthorizationService/AuthorizationService');
const { taskPlanningSchema } = require('../taskUtils');

// before each request check if there is a user
taskPlanningRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

/**
 * Get task items in a specific date range
 */
taskPlanningRouter.get('/', AuthorizeReq(TASK_PLANNING.code, TASK_PLANNING.grants.read), async (req, res, next) => {
  try {
    await Joi.object({
      dateFrom: Joi.date().required(),
      dateTo: Joi.date().required(),
      teams: Joi.array().required(),
    }).validateAsync(req.query);
    const { dateFrom , dateTo, teams } = req.query;
    const result = await TaskService.getTaskPlanningItems(dateFrom, dateTo, teams);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskPlanningRouter.post('/', AuthorizeReq(TASK_PLANNING.code, TASK_PLANNING.grants.create), async (req, res, next) => {
  await endpointWrapper(next, async () => {
    await taskPlanningSchema.validateAsync([req.body]);
    const data = req.body;
    const result = await TaskService.createTaskPlanningItem(data, req.user)
    res.json(result);
  });
});

/**
 * Insert multiple task items
 */
taskPlanningRouter.post('/items', AuthorizeReq(TASK_PLANNING.code, TASK_PLANNING.grants.create), async (req, res, next) => {
  try {
    await taskPlanningSchema.validateAsync(req.body);
    const data = req.body;
    const result = await TaskService.createTaskPlanningItems(data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Get a specific Date task item and update it's flows
 */
taskPlanningRouter.put('/:id', AuthorizeReq(TASK_PLANNING.code, TASK_PLANNING.grants.update), async (req, res, next) => {
  try {
    res.json({});
  } catch (err) {
    next(err);
  }
});

taskPlanningRouter.put('/:planningId/add-flow/:id', AuthorizeReq(TASK_PLANNING.code, TASK_PLANNING.grants.update), async (req, res, next) => {
  await endpointWrapper(next, async () => {
    const { planningId, id } = req.params; 
    await Joi.string().required().validateAsync(id);
    await Joi.string().required().validateAsync(planningId);
    const result = await TaskService.addFlowToPlanning(planningId, id, req.user);
    res.json(result);
  });
});

taskPlanningRouter.delete('/:planningId/flows/:id', AuthorizeReq(TASK_PLANNING.code, TASK_PLANNING.grants.delete), async (req, res, next) => {
  await endpointWrapper(next, async () => {
    const { planningId, id } = req.params; 
    await Joi.string().required().validateAsync(id);
    await Joi.string().required().validateAsync(planningId);
    const result = await TaskService.removeFlowFromPlanning(planningId, id, req.user);
    res.json(result);
  });
});

module.exports = taskPlanningRouter;