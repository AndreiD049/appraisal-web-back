const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');

const UserService = {
  getUser: async (id) => {
    let user = await UserModel.findById(id);
    return user;
  },


  addDefaultUser: async (id) => {
    let newUser = new UserModel({
      _id: id,
      securityLevel: 1
    });
    return await newUser.save();
  },

  getCurrentUserOrganizations: async (user) => {
    const organizations = await OrganizationModel.find({
      _id: { $in: user.organizations }
    });
    return organizations;
  },

  /*
   *  User team members are:
   *    1. Users that have the same teams as the current user
   *    2. Users that have securityLevel lower than the user
   */
  getCurrentUserTeamMembers: async function(user) {
    const members = await UserModel.find(
      {
        $and: [
          { securityLevel: { $lt: user.securityLevel } },
          { teams: { $in: user.teams } },
          { organizations: { $in: user.organizations } }
        ]
      }
    );
    return members;
  },

  /*
   * Is the memberId user in my team:
   *  1. True if he has securityLevel lower than me
   *  2. And if he is in at least one of my teams
   *  3. And if he is in at least one of my organizations
   */
  isTeamMember: async function(curentUser, memberId) {
    const user = await UserModel.find({
      $and: [
        { _id: memberId },
        { securityLevel: { $lt: curentUser.securityLevel } },
        { teams: { $in: curentUser.teams } },
        { organizations: { $in: curentUser.organizations } }
      ]
    });
    return user.length !== 0;
  }

};

module.exports = UserService;