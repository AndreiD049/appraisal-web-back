const securityRouter = require('express').Router();
const { PermissionService, RoleService } = require('../../services/AuthorizationService');
const UserService = require('../../services/UserService');
const { cacheRequest } = require('../middlewares');

const validateBody = (body) => {
  const result = {
    valid: true,
    errMessage: '',
  };
  if (!body.grants) {
    result.valid = false;
    result.errMessage = "Permission should have 'grants' field.";
  }
  if (!Array.isArray(body.grants)) {
    result.valid = false;
    result.errMessage = 'Grants shuld be an array';
  }
  if (!body.permissionType || ['User', 'Role'].indexOf(body.permissionType) === -1) {
    result.valid = false;
    result.errMessage = `permissionType is not valid - ${body.permissionType}`;
  }
  if (body.code.id) {
    // eslint-disable-next-line no-param-reassign
    body.code = body.code.id;
  }
  if (body.reference.id) {
    // eslint-disable-next-line no-param-reassign
    body.reference = body.reference.id;
  }
  return result;
};

const validateBodyRequest = async (req, res, next) => {
  try {
    const dbUser = await UserService.getUser(req.user?.id);
    req.body.organization = dbUser?.organization?.id;
    const { body } = req;
    const result = validateBody(body);
    if (!result.valid) {
      throw new Error(result.errMessage);
    }
    next();
  } catch (err) {
    next(err);
  }
};

const handleCreate = (req, res, next) => {
  req.body.createdUser = req.user.id;
  req.body.createdDate = new Date();
  next();
};

// Before each requestm check if there is a user
securityRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('User is not attached to the request'));
  next();
});

securityRouter.get(
  '/roles',
  cacheRequest({ maxAge: 3600, mustRevalidate: true }),
  async (req, res, next) => {
    try {
      const roles = await RoleService.getRoles();
      res.json(roles);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get current user's permissions
 */
securityRouter.get('/permissions/me', cacheRequest({ maxAge: 600 }), async (req, res, next) => {
  try {
    const dbUser = await UserService.getUser(req.user?.id);
    const { id, role, organization } = dbUser;
    if (!organization) {
      return res.json([]);
    }
    const userPermissions =
      (await PermissionService.getUserPermissions(id)).filter((p) => p.code) || [];
    const rolePermissions =
      (await PermissionService.getRolePermissions(role && role.id, organization.id)).filter(
        (p) => p.code,
      ) || [];
    const result = userPermissions;
    rolePermissions.forEach((element) => {
      if (result.filter((el) => el.code.code === element.code.code).length === 0)
        result.push(element);
    });
    return res.json(result.map((s) => ({ code: s.code.code, grants: s.grants })));
  } catch (err) {
    return next(err);
  }
});

/**
 * Add new permission
 */
securityRouter.post('/permissions', validateBodyRequest, handleCreate, async (req, res, next) => {
  try {
    const { body } = req;
    const result = await PermissionService.addPermission(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

securityRouter.put('/permissions/:id', validateBodyRequest, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const result = await PermissionService.updatePermissionById(id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

securityRouter.delete('/permissions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await PermissionService.deletePermission(id);
    res.status(204).json(result);
  } catch (err) {
    next(err);
  }
});

securityRouter.get(
  '/permissions/user/:id',
  cacheRequest({ noCache: true }),
  async (req, res, next) => {
    try {
      const userId = req.params.id;

      const permissions = await PermissionService.getUserPermissions(userId);
      res.json(permissions);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get permissions of the user's in my organization
 */
securityRouter.get(
  '/permissions/organization',
  cacheRequest({ noCache: true }),
  async (req, res, next) => {
    try {
      const result = await PermissionService.getUserOrganizationMembersPermissions(req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get permissions of all roles in the database
 */
securityRouter.get('/permissions/role', cacheRequest({ noCache: true }), async (req, res, next) => {
  try {
    const dbUser = await UserService.getUser(req.user.id);
    const result = await PermissionService.getAllRolesPermissions(dbUser?.organization?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Get all permission codes
 */
securityRouter.get(
  '/permissions/code',
  cacheRequest({ maxAge: 3600, mustRevalidate: true }),
  async (req, res, next) => {
    try {
      const result = await PermissionService.getPermissionCodes();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = securityRouter;
