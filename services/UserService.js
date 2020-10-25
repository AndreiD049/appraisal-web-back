const UserModel = require('../models/UserModel');
const OrganizationModel = require('../models/OrganizationModel');
const TeamService = require('./TeamService');
const RoleModel = require('../models/RoleModel');

const UserService = {
  populate: (doc) => {
    return doc
      .populate({ path: 'role', select: 'name securityLevel' })
      .populate({ path: 'teams', select: 'name' })
      .populate({ path: 'organizations', select: 'name' })
      .populate({ path: 'organization', select: 'name' });
  },

  getUser: async function(id) {
    let user = await this.populate(UserModel.findById(id));
    return user;
  },

  getUserByUsername: async function(username) {
    let user = await this.populate(UserModel.find({
      username: username
    }));
    return user.length ? user[0] : null;
  },

  updateUser: async function(user) {
    let updatedUser = await this.populate(UserModel.findByIdAndUpdate(user.id, user, { new: true }));
    return updatedUser;
  },

  updateSelf: async function(user) {
    delete user.organizations;
    let updatedUser = await this.populate(UserModel.findByIdAndUpdate(user.id, user, { new: true }));
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
   *    2. Returned users should have roles with lower securitylevel than ME
   */
  getUserTeamMembers: async function(user) {
    const dbUser = await this.getUser(user.id);
    if (!dbUser.role || !dbUser.organization) {
      return [];
    }
    const members = await UserModel.aggregate([
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'roleObj'
        }
      },
      {
        $match: {
          teams: { $in: dbUser.teams },
          organizations: dbUser.organization._id,
          'roleObj.securityLevel': { $lt: dbUser.role.securityLevel }
        }
      },
      {
        $addFields: {
          'id': '$_id'
        }
      },
      {
        $project: {
          '_id': 0,
          'roleObj': 0
        }
      }
    ]);
    const result = await UserModel.populate(members, {path: 'teams organizations organization role', select: 'name'});
    return result;
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
    const teammembers = (await this.getUserTeamMembers(dbUser)).map(m => m.id.toString());
    return teammembers.indexOf(memberId) !== -1;
  }

};

module.exports = UserService;