const mongoose = require('mongoose');
const { RoleModel } = require('../../models/RoleModel');

const data = [
  {
    name: 'Admin',
    description: 'Admin role',
    securityLevel: 2,
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    name: 'User',
    description: 'User role',
    securityLevel: 1,
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    name: 'Newcomer',
    description: 'Zero permissions',
    securityLevel: 0,
    createdUser: new mongoose.Types.ObjectId(),
  },
];

const roles = async () => {
  await RoleModel.deleteMany({});
  await RoleModel.create(data);
};

module.exports = roles;
