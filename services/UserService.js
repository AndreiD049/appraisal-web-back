const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');
const { Types } = require('mongoose');

const UserService = {
  getUser: async (id) => {
    let user = await UserModel.findById(id).populate('organizations');
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
    const organizations = user.organizations.every(o => Types.ObjectId.isValid(o)) ? 
      user.organizations :
      user.organizations.map(o => o.id);
    const result = await OrganizationModel.find({
      _id: { $in: organizations }
    });
    return result;
  },

  /*
   *  User team members are:
   *    1. Users that have the same teams as the current user
   *    2. Users that have securityLevel lower than the user
   */
  getCurrentUserTeamMembers: async function(user) {
    const organizations = user.organizations.every(o => Types.ObjectId.isValid(o)) ? 
      user.organizations :
      user.organizations.map(o => o.id);
    const members = await UserModel.find(
      {
        $and: [
          { securityLevel: { $lt: user.securityLevel } },
          { teams: { $in: user.teams } },
          { organizations: { $in: organizations } }
        ]
      }
    );
    return members;
  },

  /**
   * I want to be able to get all the users from my organization that have the securityLevel lower than me
   * + i want to include myself here
   */
  getUserOrganizationUsers: async function(user) {
    const organizations = user.organizations.every(o => Types.ObjectId.isValid(o)) ? 
      user.organizations :
      user.organizations.map(o => o.id);
    const users = await UserModel.find(
      {
        $or: [
          { _id: user.id },
          { $and: [
            { securityLevel: { $lt: user.securityLevel } },
            { organizations: { $in: organizations } }
          ]}
        ]
      }).populate('organizations');
    return users || [];
  },

  /**
   * I want to be able to get all the users without any organization
   */
  getNewcomers: async function() {
    const users = await UserModel.find(
      { organizations: { $exists: true, $eq: [] }, 
    });
    return users || [];
  },

  /*
   * Is the memberId user in my team:
   *  1. True if he has securityLevel lower than me
   *  2. And if he is in at least one of my teams
   *  3. And if he is in at least one of my organizations
   */
  isTeamMember: async function(curentUser, memberId) {
    const organizations = curentUser.organizations.every(o => Types.ObjectId.isValid(o)) ? 
      curentUser.organizations :
      curentUser.organizations.map(o => o.id);
    const user = await UserModel.find({
      $and: [
        { _id: memberId },
        { securityLevel: { $lt: curentUser.securityLevel } },
        { teams: { $in: curentUser.teams } },
        { organizations: { $in: organizations } }
      ]
    });
    return user.length !== 0;
  }

};

module.exports = UserService;