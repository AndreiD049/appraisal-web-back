const RoleModel = require("../../models/RoleModel");

const RoleService = {
  getRoles: async () => {
    const result = await RoleModel.find({}, 'name description');
    return result;
  },
  getRoleById: async (id) => {
    const role = await RoleModel.findById(id);
    return role;
  },
  getRoleByName: async (name) => {
    const role = await RoleModel.findOne({
      name: name
    });
    return role;
  },
  getRolesByName: async (name) => {
    const role = await RoleModel.find({
      name: name
    });
    return role;
  },
  addRole: async (role) => {
    const newRole = new RoleModel(role);
    const result = await newRole.save();
    return result;
  },
  updateRoleById: async (id, role) => {
    const result = await RoleModel.findByIdAndUpdate(id, role, { new: true });
    return result;
  },
  updateRoleByName: async (name, role) => {
    const result = await RoleModel.findOneAndUpdate({
      name: name
    }, role, { new: true });
    return result;
  }
};

module.exports = RoleService;