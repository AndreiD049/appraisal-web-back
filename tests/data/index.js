const mongoose = require('mongoose');
const roles = require('./roles');
const permissioncodes = require('./permissioncodes');
const organizations = require('./organizations');
const permissions = require('./permissions');
const teams = require('./teams');
const users = require('./users');

const clearDatabase = async () => {
  if (process.env.NODE_ENV === 'test') {
    await mongoose.connection.dropDatabase();
  }
};

const create = async () => {
  if (process.env.NODE_ENV === 'test') {
    await teams();
    await organizations();
    await roles();
    await users();
    await permissioncodes();
    await permissions();
  }
};

module.exports = {
  create,
  clearDatabase,
};
