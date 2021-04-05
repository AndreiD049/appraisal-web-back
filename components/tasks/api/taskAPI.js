const taskRouter = require('express').Router();
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const TaskService = require('../taskService');
const UserService = require('../../../services/UserService');
const { TASK } = require('../../../config/constants').securities;
const { dailyTypeSchema, taskSchema, taskStatusUpdateSchema, checkBusySchema } = require('../taskUtils');

// before each requestm check if there is a user
taskRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

taskRouter.get('/', AuthorizeReq(TASK.code, TASK.grants.read), async (req, res, next) => {
  try {
    await dailyTypeSchema.validateAsync(req.query);
    const { fromDate, toDate, users } = req.query;
    const userDb = await UserService.getUser(req.user.id);
    const result = await TaskService.getDailyTasks(fromDate, toDate, users, userDb);
    res.json(result);
  } catch (err) {
    next(err);
  }
});


taskRouter.get('/check-busy', AuthorizeReq(TASK.code, TASK.grants.read), async (req, res, next) => {
  try {
    await checkBusySchema.validateAsync(req.query);
    const { user } = req.query;
    const result = await TaskService.getBusyTasks(user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRouter.get('/:id(^[a-f\d]{24}$)', AuthorizeReq(TASK.code, TASK.grants.read), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskService.getTask(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRouter.post('/', AuthorizeReq(TASK.code, TASK.grants.create), async (req, res, next) => {
  try {
    const data = req.body;
    await taskSchema.validateAsync(data);
    const result = await TaskService.createTask(data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRouter.put('/:id', AuthorizeReq(TASK.code, TASK.grants.update), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await TaskService.updateTask(id, data, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRouter.put('/:id/status', AuthorizeReq(TASK.code, TASK.grants.update), async (req, res, next) => {
  try {
    await taskStatusUpdateSchema.validateAsync(req.body);
    const { id } = req.params;
    const result = await TaskService.updateTaskStatus(id, req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRouter.delete('/:id', AuthorizeReq(TASK.code, TASK.grants.delete), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TaskService.deleteTask(id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = taskRouter;