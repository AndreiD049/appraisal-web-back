const PermissionModel = require('../../models/PermissionModel');
const PermissionCodeModel = require('../../models/PermissionCodeModel');
const UserService = require('../UserService');

const PermissionService = {
  populate(doc) {
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
      code,
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
      code,
    }, updatedObject, { new: true });
    return result;
  },
  deletePermissionCode: async (code) => {
    const result = await PermissionCodeModel.findOneAndDelete({
      code,
    });
    return result;
  },
  // Permissions
  async getPermissionById(id) {
    const result = await this.populate(PermissionModel.findById(id,
      'code reference permissionType grants organization'));
    return result;
  },
  async getPermissionsByCode(name) {
    const code = await PermissionCodeModel.findOne({
      code: name,
    });
    const result = await this.populate(PermissionModel.find({
      code: code.id,
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
      name,
    }, permission, { new: true });
    return result;
  },
  deletePermission: async (id) => {
    const result = await PermissionModel.findByIdAndDelete(id);
    return result;
  },
  // User Permissions
  async getUserPermissions(id) {
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
  async getUserOrganizationMembersPermissions(id) {
    const dbUser = await UserService.getUser(id);
    const users = await UserService.getUserTeamMembers(dbUser);
    const ids = users.map((u) => u.id).concat(dbUser.id);
    const result = await this.populate(PermissionModel.find({
      permissionType: 'User',
      reference: { $in: ids },
      organization: dbUser.organization.id,
    }, 'code reference permissionType grants organization')
      .populate({ path: 'reference', select: 'username' }));
    return result;
  },
  async getUserPermissionsByCode(id, code) {
    const dbUser = await UserService.getUser(id);
    const codeDb = await PermissionCodeModel.findOne({
      code,
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
  async getAllRolesPermissions(orgId) {
    const result = await this.populate(PermissionModel.find({
      permissionType: 'Role',
      organization: orgId,
    }, 'code reference permissionType grants organization')
      .populate({ path: 'reference', select: 'name' }));
    return result || [];
  },
  async getRolePermissions(id, orgId) {
    const result = await this.populate(PermissionModel.find({
      permissionType: 'Role',
      reference: id,
      organization: orgId,
    }, 'code reference permissionType grants organization')
      .populate({ path: 'reference', select: 'name' }));
    return result || [];
  },
  async getRolePermissionsByCode(id, code, orgId) {
    const codeDb = await PermissionCodeModel.findOne({
      code,
    });
    const result = await this.populate(PermissionModel.find({
      code: codeDb.id,
      permissionType: 'Role',
      reference: id,
      organization: orgId,
    }, 'code reference permissionType grants organization')
      .populate({ path: 'reference', select: 'name' }));
    return result || [];
  },
};

module.exports = PermissionService;
