const teamRouter = require('express').Router();
const TeamService = require('../../services/TeamService');

// Before each requestm check if there is a user
teamRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('User is not attached to the request'));
  next();
});

teamRouter.get('/', async (req, res, next) => {
  try {
    const result = await TeamService.getTeams();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

teamRouter.post('/', async (req, res, next) => {
  try {
    const { body } = req;
    if (!body.name) {
      throw new Error('Team name was not provided');
    }
    const result = await TeamService.addTeam(body.name, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = teamRouter;
