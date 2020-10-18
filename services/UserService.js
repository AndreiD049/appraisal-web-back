const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');
const TeamService = require('./TeamService');

const UserService = {
  getUser: async (id) => {
    let user = await UserModel.findById(id).populate('organizations');
    return user;
  },

  getUserByUsername: async (username) => {
    let user = await UserModel.find({
      username: username
    }).populate('organizations');
    return user.length ? user[0] : null;
  },

  updateUser: async (user) => {
    let updatedUser = await UserModel.findByIdAndUpdate(user.id, user, { new: true });
    return updatedUser;
  },

  updateSelf: async (user) => {
    delete user.securityLevel;
    delete user.organizations;
    let updatedUser = await UserModel.findByIdAndUpdate(user.id, user, { new: true });
    return updatedUser;
  },

  addDefaultUser: async (id) => {
    let newUser = new UserModel({
      username: id,
      securityLevel: 1
    });
    return await newUser.save();
  },

  getCurrentUserOrganizations: async (user) => {
    const dbUser = await UserModel.findById(user.id);
    const result = await OrganizationModel.find({
      _id: { $in: dbUser.organizations }
    });
    return result;
  },

  /*
   *  User team members are:
   *    1. Users that have the same teams as the current user
   *    2. Users that have securityLevel lower than the user
   */
  getCurrentUserTeamMembers: async function(user) {
    const dbUser = await UserModel.findById(user.id);
    const members = await UserModel.find(
      {
        $and: [
          { securityLevel: { $lt: dbUser.securityLevel } },
          { teams: { $in: dbUser.teams } },
          { organizations: { $in: dbUser.organizations } }
        ]
      }
    );
    return members;
  },

  /**
   * I want to be able to get all the users from my organization that have the securityLevel lower or equal than me
   * + i want to include myself here
   */
  getUserOrganizationUsers: async function(user) {
    const dbUser = await UserModel.findById(user.id);
    const users = await UserModel.find(
      {
        $or: [
          { _id: dbUser.id },
          { $and: [
            { securityLevel: { $lt: dbUser.securityLevel } },
            { organizations: { $in: dbUser.organizations } }
          ]}
        ]
      }).populate('organizations').populate('teams');
    return users || [];
  },

  /**
   * I want to be able to get all the users without any organization
   */
  getNewcomers: async function() {
    const users = await UserModel.find(
      { organizations: { $exists: true, $eq: [] }, 
    }).populate('teams');
    return users || [];
  },

  /*
   * Is the memberId user in my team:
   *  1. True if he has securityLevel lower than me
   *  2. And if he is in at least one of my teams
   *  3. And if he is in at least one of my organizations
   *  4. If he is not a part of any organizations
   */
  isTeamMember: async function(curentUser, memberId) {
    const dbUser = await UserModel.findById(curentUser.id);
    if (dbUser.id === memberId)
      return true;
    const user = await UserModel.find({
      $and: [
        { _id: memberId },
        { securityLevel: { $lt: dbUser.securityLevel } },
        { $or: [
          { teams: { $in: dbUser.teams }},
          { teams: { $eq: [] }}
        ]},
        { $or: [
          { organizations: { $in: dbUser.organizations } },
          { organizations: { $eq: [] } }
        ]}
      ]
    });
    return user.length !== 0;
  }

};

module.exports = UserService;