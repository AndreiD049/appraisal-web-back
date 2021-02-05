const taskRouter = require('express').Router();
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { TaskService } = require('../../../services/Tasks');
const { TASK } = require('../../../config/constants').securities;

// before each requestm check if there is a user
taskRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

taskRouter.get('/', AuthorizeReq(TASK.code, TASK.grants.read), async (req, res, next) => {
  try {
    const { query } = req;
    const result = await TaskService.getTasks(query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

taskRouter.get('/:id', AuthorizeReq(TASK.code, TASK.grants.read), async (req, res, next) => {
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