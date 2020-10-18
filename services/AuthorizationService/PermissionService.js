const PermissionModel = require('../../models/PermissionModel');
const PermissionCodeModel = require('../../models/PermissionCodeModel');
const RoleModel = require('../../models/RoleModel');
const UserService = require('../../services/UserService');

const PermissionService = {
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
  getPermissionById: async (id) => {
    const result = await PermissionModel.findById(id, 
      'code reference permissionType grants')
    .populate({ path: 'code', select: 'code description' });
    return result;
  },
  getPermissionsByCode: async (name) => {
    const code = await PermissionCodeModel.findOne({
      code: name
    });
    const result = await PermissionModel.find({
      code: code.id
    }, 'code reference permissionType grants')
    .populate({ path: 'code', select: 'code description' });
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
  getUserPermissions: async (id) => {
    const result = await PermissionModel.find({
      permissionType: 'User',
      reference: id
    }, 'code reference permissionType grants')
    .populate({ path: 'code', select: 'code description' });
    return result || [];
  },
  getUserOrganizationMembersPermissions: async (id) => {
    const dbUser = await UserService.getUser(id);
    const users = await UserService.getUserOrganizationUsers(dbUser);
    const ids = users.map(u => u.id);
    const result = await PermissionModel.find({
      permissionType: 'User',
      reference: { $in: ids }
    }, 'code reference permissionType grants')
    .populate({ path: 'reference', select: 'username' })
    .populate({ path: 'code', select: 'code description' });
    return result;
  },
  getUserPermissionsByCode: async (id, code) => {
    const codeDb = await PermissionCodeModel.findOne({
      code: code
    });
    const result = await PermissionModel.find({
      code: codeDb.id,
      permissionType: 'User',
      reference: id
    }, 'code reference permissionType grants')
    .populate({ path: 'code', select: 'code description' });

    return result;
  },
  // Roles
  getAllRolesPermissions: async () => {
    const result = await PermissionModel.find({
      permissionType: 'Role',
    }, 'code reference permissionType grants')
    .populate({ path: 'reference', select: 'name' })
    .populate({ path: 'code', select: 'code description' });
    return result || [];
  },
  getRolePermissions: async (id) => {
    const result = await PermissionModel.find({
      permissionType: 'Role',
      reference: id
    }, 'code reference permissionType grants')
    .populate({ path: 'reference', select: 'name' })
    .populate({ path: 'code', select: 'code description' });
    return result || [];
  },
  getRolePermissionsByCode: async (id, code) => {
    const codeDb = await PermissionCodeModel.findOne({
      code: code
    });
    const result = await PermissionModel.find({
      code: codeDb.id,
      permissionType: 'Role',
      reference: id
    }, 'code reference permissionType grants')
    .populate({ path: 'reference', select: 'name' })
    .populate({ path: 'code', select: 'code description' });
    return result || [];
  },
}

module.exports = PermissionService;