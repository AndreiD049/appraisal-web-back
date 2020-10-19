const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');
const TeamService = require('./TeamService');

const UserService = {
  getUser: async (id) => {
    let user = await UserModel.findById(id);
    return user;
  },

  getUserByUsername: async (username) => {
    let user = await UserModel.find({
      username: username
    });
    return user.length ? user[0] : null;
  },

  updateUser: async (user) => {
    let updatedUser = await UserModel.findByIdAndUpdate(user.id, user, { new: true });
    return updatedUser;
  },

  updateSelf: async (user) => {
    delete user.organizations;
    let updatedUser = await UserModel.findByIdAndUpdate(user.id, user, { new: true });
    return updatedUser;
  },

  addDefaultUser: async (id) => {
    let newUser = new UserModel({
      username: id,
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
   */
  getCurrentUserTeamMembers: async function(user) {
    const dbUser = await UserModel.findById(user.id);
    const members = await UserModel.find(
      {
        $and: [
          { teams: { $in: dbUser.teams } },
          { organizations: dbUser.organization }
        ]
      }
    );
    return members;
  },

  /**
   * I want to be able to get all the users from my organization 
   * + i want to include myself here
   */
  getUserOrganizationUsers: async function(user) {
    const dbUser = await UserModel.findById(user.id);
    const users = await UserModel.find(
      {
        $or: [
          { _id: dbUser.id },
          { $and: [
            { organizations: dbUser.organization }
          ]}
        ]
      });
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
   *  1. And if he is in at least one of my teams
   *  2. And if he is in at least one of my organizations
   *  3. If he is not a part of any organizations
   */
  isTeamMember: async function(curentUser, memberId) {
    const dbUser = await UserModel.findById(curentUser.id);
    if (dbUser.id === memberId)
      return true;
    const user = await UserModel.find({
      $and: [
        { _id: memberId },
        { $or: [
          { teams: { $in: dbUser.teams }},
          { teams: { $eq: [] }}
        ]},
        { $or: [
          { organizations: dbUser.organization },
          { organizations: { $eq: [] } }
        ]}
      ]
    });
    return user.length !== 0;
  }

};

module.exports = UserService;