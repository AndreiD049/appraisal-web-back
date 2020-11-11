const PermissionService = require('./PermissionService');
const UserService = require('../UserService');

const AuthorizationService = {
  // Receives a user, a permission code, and a grant,
  // Returns true if user has this permission or not
  Authorize: async (user, code, grant) => {
    const { id, role, organization } = await UserService.getUser(user.id);
    if (role) {
      const rolePermissions = await PermissionService
        .getRolePermissionsByCode(role.id, code, organization.id);
      if (rolePermissions.filter((r) => r.grants.indexOf(grant) !== -1).length > 0) {
        return true;
      }
    }
    // Get user's permissions and check if grant is there
    if (id) {
      const userPermissions = await PermissionService.getUserPermissionsByCode(id, code);
      if (userPermissions.filter((r) => r.grants.indexOf(grant) !== -1).length > 0) {
        return true;
      }
    }
    return false;
  },

  /**
   * Function used as express middleware, for checking if user has access
   * to make the request before the request itself.
   * Function assumes user is attached to the request
   */
  AuthorizeReq(code, grant, message = 'Access Denied!') {
    return async function result(req, res, next) {
      if (!(await AuthorizationService.Authorize(req.user, code, grant))) {
        next(new Error(`${message} (code: ${code}, grant: ${grant})`));
      } else {
        next();
      }
    };
  },
};

module.exports = AuthorizationService;
