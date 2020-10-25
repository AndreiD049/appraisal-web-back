const PermissionModel = require('../../models/PermissionModel');
const PermissionCodeModel = require('../../models/PermissionCodeModel');
const RoleModel = require('../../models/RoleModel');
const UserService = require('../../services/UserService');

const PermissionService = {
  populate: function(doc) {
    return doc
      .populate({ path: 'code', select: 'code description' })
      .populate({ path: 'organization', select: 'name' });
  },
  // Permission Codes
  getPermissionCodes: async () => {
    const result = await PermissionCodeModel.find({}, 'code description grants');
    return result;
  },
  getPermissionCode: async (code) => {
    const result = await PermissionCodeModel.find({
      code: code
    }, 'code description');
    return result;
  },
  addPermissionCode: async (codeObject) => {
    const doc = new PermissionCodeModel(codeObject);
    const result = await doc.save();
    return result;
  },
  updatePermissionCode: async (code, updatedObject) => {
    const result = await PermissionCodeModel.findOneAndUpdate({
      code: code
    }, updatedObject, { new: true });
    return result;
  },
  deletePermissionCode: async (code) => {
    const result = await PermissionCodeModel.findOneAndDelete({
      code: code
    });
    return result;
  },
  // Permissions
  getPermissionById: async function(id) {
    const result = await this.populate(PermissionModel.findById(id, 
      'code reference permissionType grants organization'));
    return result;
  },
  getPermissionsByCode: async function(name) {
    const code = await PermissionCodeModel.findOne({
      code: name
    });
    const result = await this.populate(PermissionModel.find({
      code: code.id
    }, 'code reference permissionType grants organization'));
    return result;
  },
  addPermission: async (permission) => {
    const doc = new PermissionModel(permission);
    const result = await doc.save();
    return result;
  },
  updatePermissionById: async (id, permission) => {
    const result = await PermissionModel.findByIdAndUpdate(id, permission, { new: true });
    return result;
  }, 
  updatePermissionByCode: async (name, permission) => {
    const result = await PermissionModel.findOneAndUpdate({
      name: name,
    }, permission, { new: true });
    return result;
  },
  deletePermission: async (id) => {
    const result = await PermissionModel.findByIdAndDelete(id);
    return result;
  },
  // User Permissions
  getUserPermissions: async function(id) {
    const dbUser = await UserService.getUser(id);
    if (!dbUser.organization) {
      return [];
    }
    const result = await this.populate(PermissionModel.find({
      permissionType: 'User',
      reference: id,
      organization: dbUser.organization.id,
    }, 'code reference permissionType grants organization'));
    return result || [];
  },
  getUserOrganizationMembersPermissions: async function(id) {
    const dbUser = await UserService.getUser(id);
    const users = await UserService.getUserTeamMembers(dbUser);
    const ids = users.map(u => u.id).concat(dbUser.id);
    const result = await this.populate(PermissionModel.find({
      permissionType: 'User',
      reference: { $in: ids },
      organization: dbUser.organization.id,
    }, 'code reference permissionType grants organization')
    .populate({ path: 'reference', select: 'username' }));
    return result;
  },
  getUserPermissionsByCode: async function(id, code) {
    const dbUser = await UserService.getUser(id);
    const codeDb = await PermissionCodeModel.findOne({
      code: code
    });
    const result = await this.populate(PermissionModel.find({
      code: codeDb.id,
      permissionType: 'User',
      reference: id,
      organization: dbUser.organization.id,
    }, 'code reference permissionType grants organization'));

    return result;
  },
  // Roles
  getAllRolesPermissions: async function(orgId) {
    const result = await this.populate(PermissionModel.find({
      permissionType: 'Role',
      organization: orgId
    }, 'code reference permissionType grants organization')
    .populate({ path: 'reference', select: 'name' }));
    return result || [];
  },
  getRolePermissions: async function(id, orgId) {
    const result = await this.populate(PermissionModel.find({
      permissionType: 'Role',
      reference: id,
      organization: orgId
    }, 'code reference permissionType grants organization')
    .populate({ path: 'reference', select: 'name' }));
    return result || [];
  },
  getRolePermissionsByCode: async function(id, code, orgId) {
    const codeDb = await PermissionCodeModel.findOne({
      code: code
    });
    const result = await this.populate(PermissionModel.find({
      code: codeDb.id,
      permissionType: 'Role',
      reference: id,
      organization: orgId
    }, 'code reference permissionType grants organization')
    .populate({ path: 'reference', select: 'name' }));
    return result || [];
  },
}

module.exports = PermissionService;