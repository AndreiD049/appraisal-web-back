const mongoose = require('mongoose');
const config = require('../config');
const createViews = require('../models/dbutils/migrations/views');
const createCodes = require('../models/dbutils/migrations/permissionCodes');

const init = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    await createCodes();
    await createViews();
  } catch (e) {
    console.error('Error connecting to mongodb', e);
  }
};

module.exports = {
  init,
};
