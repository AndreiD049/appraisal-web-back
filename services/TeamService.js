const { TeamModel } = require('../models/TeamModel');

const TeamService = {
  /**
   * Get the list of all teams created
   */
  getTeams: async () => {
    const teams = await TeamModel.find({});

    return teams;
  },

  addTeam: async (name, user) => {
    const newTeam = new TeamModel({
      name,
      createdUser: user.id,
      createdDate: new Date(),
    });

    return newTeam.save();
  },
};

module.exports = TeamService;
