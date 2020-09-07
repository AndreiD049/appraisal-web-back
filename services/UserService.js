const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');

const UserService = {
  // Get current user information
  // TODO: Rewrite after authentication implemented
  getCurrentUser: async () => {
    return await (await UserModel.findById("testuser")).toJSON();
  },

  getCurrentUserOrganizations: async (user) => {
    const organizations = await OrganizationModel.find({
      _id: { $in: user.organizations }
    });
    return organizations;
  }
};

module.exports = UserService;