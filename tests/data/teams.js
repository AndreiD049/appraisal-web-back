const { Types } = require("mongoose");
const TeamModel = require("../../models/TeamModel");

const data = [
  {
    name: 'Team A',
    createdUser: new Types.ObjectId(),
  },
  {
    name: 'Team B',
    createdUser: new Types.ObjectId(),
  },
  {
    name: 'Team C',
    createdUser: new Types.ObjectId(),
  },
]

const teams = async () => {
  await TeamModel.TeamModel.deleteMany({});
  await TeamModel.TeamModel.create(data, { validateBeforeSave: false });
};

module.exports = teams;