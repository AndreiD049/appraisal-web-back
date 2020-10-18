const PermissionService = require("./PermissionService");

const AuthorizationService = {
  // Receives a user, a permission code, and a grant,
  // Returns true if user has this permission or not
  Authorize: async (user, code, grant) => {
    const { id, role } = user;
    if (role) {
      const rolePermissions = await PermissionService.getRolePermissionsByCode(role, code)
      if (rolePermissions.filter(r => r.grants.indexOf(grant) !== -1).length > 0) {
        return true;
      }
    }
    // Get user's permissions and check if grant is there
    const userPermissions = await PermissionService.getUserPermissionsByCode(user.id, code);
    if (userPermissions.filter(r => r.grants.indexOf(grant) !== -1).length > 0) {
      return true;
    }
    return false;
  }  
}

module.exports = AuthorizationService;