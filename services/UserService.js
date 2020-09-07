const UserModel = require('../models/UserModel');

const UserService = {
  // Get current user information
  // TODO: Rewrite after authentication implemented
  getCurrentUser: async () => {
    return await (await UserModel.findById("testuser")).toJSON();
  }
};

module.exports = UserService;