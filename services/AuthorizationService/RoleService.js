const RoleModel = require('../../models/RoleModel');
const UserService = require('../UserService');

const RoleService = {
  async getRoles() {
    const result = await RoleModel.find({}, 'name description securityLevel');
    return result;
  },
  async getUserRole(id) {
    const user = await UserService.getUser(id);
    if (user.role) return user.role;
    return null;
  },
  async getUserRoleSecurityLevel(id) {
    const role = await this.getUserRole(id);
    if (role) return role.securityLevel;
    return 0;
  },
  async getRoleById(id) {
    const role = await RoleModel.findById(id);
    return role;
  },
  async getRoleByName(name) {
    const role = await RoleModel.findOne({
      name,
    });
    return role;
  },
  async getRolesByName(name) {
    const role = await RoleModel.find({
      name,
    });
    return role;
  },
  async addRole(role) {
    const newRole = new RoleModel(role);
    const result = await newRole.savefunction();
    return result;
  },
  async updateRoleById(id, role) {
    const result = await RoleModel.findByIdAndUpdate(id, role, { new: true });
    return result;
  },
  async updateRoleByName(name, role) {
    const result = await RoleModel.findOneAndUpdate({
      name,
    }, role, { new: true });
    return result;
  },
};

module.exports = RoleService;
