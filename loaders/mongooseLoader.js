const mongoose = require('mongoose');
const config = require('../config');

const init = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Succesfully connected to MONGODB');
  } catch (e) {
    console.error('Error connecting to mongodb', e);
  }
};

module.exports = {
  init,
};
