const PermissionService = require('./PermissionService');
const UserService = require('../UserService');

const AuthorizationService = {
  // Receives a user, a permission code, and a grant,
  // Returns true if user has this permission or not
  Authorize: async (user, code, grant) => {
<<<<<<< HEAD
    if (!user) return false;
    const userDb = await UserService.getUser(user.id);
    if (!userDb) return false;
    const { id, role, organization } = userDb;
    // Get user's permissions and check if grant is there
    if (id) {
      const userPermissions = await PermissionService.getUserPermissionsByCode(id, code);
      if (userPermissions.length > 0) {
        if (userPermissions.filter((r) => r.grants.indexOf(grant) !== -1).length > 0) {
          return true;
=======
    try {
      const { id, role, organization } = await UserService.getUser(user.id);
      // Get user's permissions and check if grant is there
      if (id) {
        const userPermissions = await PermissionService.getUserPermissionsByCode(id, code);
        if (userPermissions.length > 0) {
          if (userPermissions.filter((r) => r.grants.indexOf(grant) !== -1).length > 0) {
            return true;
          }
          return false;
>>>>>>> 3ff858cce089145d9979caa46d82eacc9a2a0648
        }
      }
      if (role) {
        const rolePermissions = await PermissionService
          .getRolePermissionsByCode(role.id, code, organization.id);
        if (rolePermissions.filter((r) => r.grants.indexOf(grant) !== -1).length > 0) {
          return true;
        }
      }
      return false;
    } catch {
      // Return false in case any error occured
      return false;
    }
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
