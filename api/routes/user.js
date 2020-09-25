const userRouter = require('express').Router();
const UserService = require('../../services/UserService');

// Router for /api/users

// Before each requestm check if there is a user
userRouter.use(async (req, res, next) => {
  if (!req.user || !req.user.organizations)
    next(new Error("User is not attached to the request"));
  next();
});

userRouter.get('/organizations', async( req, res, next) => {
  try {
    organizations = await UserService.getCurrentUserOrganizations(req.user);
    res.json(organizations);
  } catch (err) {
    next(err);
  }
});

userRouter.get('/team-members', async (req, res, next) => {
  try {
    const members = await UserService.getCurrentUserTeamMembers(req.user);
    res.json(members.map(member => member.id));
  } catch (err) {
    next(err);
  }
});

module.exports = userRouter;

