const { Types } = require("mongoose");
const { OrganizationModel } = require('../../models/OrganizationModel');

const data = [
  {
    name: "Test",
    createdUser: new Types.ObjectId(),
  }
]

const organizations = async () => {
  await OrganizationModel.deleteMany({});
  await OrganizationModel.create(data);
};

module.exports = organizations;