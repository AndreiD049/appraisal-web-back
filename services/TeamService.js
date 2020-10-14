const TeamModel = require('../models/TeamModel');

const TeamService = {
  /**
   * Get the list of all teams created
   */
  getTeams: async () => {
    let teams = await TeamModel.find({});

    return teams;
  },

  addTeam: async (name, user) => {
    try {
      let newTeam = new TeamModel({
        name: name,
        createdUser: user.id,
        createdDate: new Date()
      });

      return (await newTeam.save());
    } catch (err) {
      throw err;
    }
  }
}

module.exports = TeamService;