const mongoose = require('mongoose');
const config = require('../config');
const createViews = require('../models/dbutils/migrations/views');
const createCodes = require('../models/dbutils/migrations/permissionCodes');

const init = async () => {
  try {
    console.info('Connecting to ', config.MONGODB_URI);
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.info('Succesfully connected to MONGODB');
    console.info('Creating Permission codes...');
    await createCodes();
    console.info('Permission codes created');
    console.info('Creating views...');
    await createViews();
  } catch (e) {
    console.error('Error connecting to mongodb', e);
  }
};

module.exports = {
  init,
};
