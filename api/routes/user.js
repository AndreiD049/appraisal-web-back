const userRouter = require('express').Router();
const UserService = require('../../services/UserService');

// Router for /api/users

// before each requestm check if there is a user
userRouter.use(async (req, res, next) => {
  if (!req.user)
    next(new error("user is not attached to the request"));
  next();
});

/**
 * Endpoint for getting Users whose:
 * 1. Security Level is lower than mine
 * 2. Don't have a organization
 */
userRouter.get('/', async(req, res, next) => {
  try {
    const users = await UserService.getUserTeamMembers(req.user);
    const newcomers = await UserService.getNewcomers();
    res.json(users.concat(newcomers));
  } catch (err) {
    next(err);
  }
});

/**
 * I want to be able to update users via PUT call
 */
userRouter.put('/:id', async(req, res, next) => {
  try {
    const id = req.params['id'];
    const user = req.body;
    if (!user.id)
      throw new Error('No valid id found in request body');
    if (!(await UserService.isTeamMember(req.user, id))) {
      throw new Error(`Cannot update user ${user.id}. User is not a part of your teams.`);
    }
    let result;
    if (req.user.id === user.id) {
      result = await (await UserService.updateSelf(user)).populate('organizations').populate('teams').execPopulate();
    } else {
      result = await (await UserService.updateUser(user)).populate('organizations').populate('teams').execPopulate();
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
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
    const members = await UserService.getUserTeamMembers(req.user);
    res.json(members.map(member => member));
  } catch (err) {
    next(err);
  }
});


module.exports = userRouter;

