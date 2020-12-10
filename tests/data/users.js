const OrganizationModel = require('../../models/OrganizationModel');
const RoleModel = require('../../models/RoleModel');
const TeamModel = require('../../models/TeamModel');
const UserModel = require('../../models/UserModel');

const data = [
  {
    username: 'admin@test.com',
    fullname: 'test user',
    role: 'Admin',
    organization: 'Test',
    teams: ['Team A', 'Team B', 'Team C'],
    organizations: ['Test'],
  },
  {
    username: 'user@test.com',
    fullname: 'test user',
    role: 'User',
    organization: 'Test',
    teams: ['Team A'],
    organizations: ['Test'],
  },
];

const users = async () => {
  await UserModel.UserModel.deleteMany({});
  await Promise.all(
    data.map(async (user) => {
      const role = await RoleModel.RoleModel.findOne({ name: user.role });
      const org = await OrganizationModel.OrganizationModel.findOne({ name: user.organization });
      const orgs = await Promise.all(
        user.organizations.map(async (o) =>
          OrganizationModel.OrganizationModel.findOne({ name: o }),
        ),
      );
      const teams = await Promise.all(
        user.teams.map(async (team) => TeamModel.TeamModel.findOne({ name: team })),
      );
      await UserModel.UserModel.create({
        ...user,
        role: role.id,
        organization: org.id,
        organizations: orgs.map((o) => o.id),
        teams: teams.map((t) => t.id),
      });
    }),
  );
};

module.exports = users;
