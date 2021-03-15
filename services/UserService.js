const { UserModel } = require('../models/UserModel');
const { OrganizationModel } = require('../models/OrganizationModel');

const UserService = {
  populate: (doc) =>
    doc
      .populate({ path: 'role', select: 'name securityLevel' })
      .populate({ path: 'teams team', select: 'name' })
      .populate({ path: 'organizations', select: 'name' })
      .populate({ path: 'organization', select: 'name' }),

  async getUser(id) {
    const user = await this.populate(UserModel.findById(id));
    return user;
  },

  async getUserByUsername(username) {
    const user = await this.populate(
      UserModel.find({
        username,
      }),
    );
    return user.length ? user[0] : null;
  },

  async updateUser(user) {
    const updatedUser = await this.populate(
      UserModel.findByIdAndUpdate(user.id, user, { new: true }),
    );
    return updatedUser;
  },

  async updateSelf(user) {
    const arg = user;
    delete arg.organizations;
    const updatedUser = await this.populate(
      UserModel.findByIdAndUpdate(arg.id, arg, { new: true }),
    );
    return updatedUser;
  },

  async getUserRoleSecurityLevel(user) {
    const dbUser = await this.getUser(user.id);
    return dbUser && dbUser.role ? dbUser.role.securityLevel : 0;
  },

  async addDefaultUser(id) {
    const newUser = new UserModel({
      username: id,
    });
    return newUser.save();
  },

  async getCurrentUserOrganizations(user) {
    const dbUser = await UserModel.findById(user.id);
    const result = await OrganizationModel.find({
      _id: { $in: dbUser.organizations },
    });
    return result;
  },

  async getOrganizationUsers(user) {
    const dbUser = await UserModel.findById(user.id);
    const result = await this.populate(
      UserModel.find({
        organizations: dbUser.organization,
      }),
    );
    return result;
  },

  /*
   *  User team members are:
   *    1. Users that have the same teams as the current user
   *    2. Returned users should have roles with lower securitylevel than ME
   */
  async getUserTeamMembers(user) {
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
          as: 'roleObj',
        },
      },
      {
        $match: {
          teams: { $in: dbUser.teams },
          organizations: dbUser.organization._id,
          'roleObj.securityLevel': { $lt: dbUser.role.securityLevel },
        },
      },
      {
        $addFields: {
          id: '$_id',
        },
      },
      {
        $project: {
          _id: 0,
          roleObj: 0,
        },
      },
    ]);
    const result = await UserModel.populate(members, {
      path: 'teams team organizations organization role',
      select: 'name',
    });
    return result;
  },

  // Get all the users from that team
  async getTeamUsers(user) {
    const dbUser = await this.getUser(user.id);
    if (!dbUser.role || !dbUser.organization) {
      return [];
    }
    return UserModel.find({
      teams: { $in: dbUser.teams },
      organizations: dbUser.organization._id,
    }).populate({
      path: 'teams team organizations organization role',
      select: 'name',
    });
  },

  /**
   * Given an array of teams, return all users that are part of those teams
   * @param {Array} teams 
   */
  async getUsersFromTeams(teams) {
    if (!Array.isArray(teams)) throw new Error('teams must be an array');
    if (!teams.every((i) => typeof i === 'string')) throw new Error('Invalid argument supplied');
    return UserModel.find({
      teams: {$in: teams},
    }).populate({
      path: 'teams team organizations organization role',
      select: 'name',
    })
  },

  /**
   * Given an array of teams, return all users that are part of those teams
   * @param {Array} teams 
   */
  async getUsersFromPrimaryTeams(teams = []) {
    return UserModel.find({
      team: teams,
    }).populate({
      path: 'teams team organizations organization role',
      select: 'name securityLevel',
    })
  },

  /**
   * I want to be able to get all the users without any organization
   */
  async getNewcomers() {
    const users = await UserModel.find({
      organizations: { $exists: true, $eq: [] },
    }).populate({ path: 'teams organizations organization role', select: 'name' });
    return users || [];
  },

  /*
   * Is the memberId user in my team:
   *  1. And if he is in at least one of my teams
   *  2. And if he is in at least one of my organizations
   *  3. If he is not a part of any organizations
   */
  async isTeamMember(askingUser, targetUser) {
    const dbUser = await UserModel.findById(askingUser.id);
    if (dbUser.id === targetUser.id) return true;
    const newComers = (await this.getNewcomers()).map((m) => m.id.toString());
    if (newComers.indexOf(targetUser.id) !== -1) return true;
    const teammembers = (await this.getUserTeamMembers(dbUser)).map((m) => m.id.toString());
    return teammembers.indexOf(targetUser.id) !== -1;
  },

  async compareSecurityLevels(askingUser, targetUser) {
    const [slAsking, slTarget] = await Promise.all([
      this.getUserRoleSecurityLevel(askingUser),
      this.getUserRoleSecurityLevel(targetUser),
    ]);
    if (slAsking < slTarget) return -1;
    if (slAsking === slTarget) return 0;
    return 1;
  },
};

module.exports = UserService;
