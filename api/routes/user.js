const userRouter = require('express').Router();
const UserService = require('../../services/UserService');

// Router for /api/users

// Before each requestm check if there is a user
userRouter.use(async (req, res, next) => {
  if (!req.user || !req.user.organizations)
    next(new Error("User is not attached to the request"));
  next();
});

/* 
    I want to be able to get other user's info. But i cannot do that
  if the user is not on my team.
*/
userRouter.get('/user/:id', async (req, res, next) => {
  try {
    const id = req.params['id'];
    // Check if we are logged in
    if (!req.user)
      throw new Error('No user attached to the requst');
    // Check if the user in question is my team-member
    if (!(await UserService.isTeamMember(req.user, id)))
      throw new Error(`Cannot get user info. ${id} is not on your team`);
    // Fetch user's info from the database and return it
    const data = await UserService.getUser(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
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
    res.json(members.map(member => member));
  } catch (err) {
    next(err);
  }
});

module.exports = userRouter;

