const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');

const UserService = {
  // Get current user information
  // TODO: Rewrite after authentication implemented
  getCurrentUser: async () => {
    return await (await UserModel.findById("testuser")).toJSON();
  },

  getUser: async (id) => {
    let user = await UserModel.findById(id);
    return user === null ? null : user.toJSON();
  },

  getUserDoc: async (id) => {
    let user = await UserModel.findById(id);
    return user === null ? null : user;
  },

  addDefaultUser: async (id) => {
    let newUser = new UserModel({
      _id: id,
      securityLevel: 1
    });
    return await (await newUser.save()).toJSON();
  },

  getCurrentUserOrganizations: async (user) => {
    const organizations = await OrganizationModel.find({
      _id: { $in: user.organizations }
    });
    return organizations;
  }
};

module.exports = UserService;