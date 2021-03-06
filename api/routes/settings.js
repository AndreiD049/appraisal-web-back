const settingsRouter = require('express').Router();
const { RoleService } = require('../../services/AuthorizationService');
const UserService = require('../../services/UserService');

// Router for /api/settings

// before each requestm check if there is a user
settingsRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

// GET /api/settings/users
settingsRouter.get('/users', async (req, res, next) => {
  try {
    const [users, newcomers] = await Promise.all([
      UserService.getOrganizationUsers(req.user),
      UserService.getNewcomers(),
    ]);
    res.json(users.concat(newcomers));
  } catch (err) {
    next(err);
  }
});

/**
 * I want to be able to update users via PUT call
 * PUT /api/settings/users/:id
 */
settingsRouter.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.body;
    const role = await RoleService.getRoleById(user.role);
    const securityLevel = role ? role.securityLevel : 0;
    if ((await UserService.compareSecurityLevels(req.user, user)) === -1)
      throw new Error(`Cannot update user ${user.username}. (Greater securityLevel)`);
    if ((await RoleService.getUserRoleSecurityLevel(req.user.id)) < securityLevel)
      throw new Error(`Cannot assign this role to user ${user.username}`);
    let result;
    if (req.user.id === id) {
      result = await (await UserService.updateSelf(user))
        .populate('organizations teams team')
        .execPopulate();
    } else {
      result = await (await UserService.updateUser(user))
        .populate('organizations teams team')
        .execPopulate();
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = settingsRouter;
