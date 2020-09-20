const mongoose = require('mongoose');
const config = require('../config');

const init = async () => {
  try
  {
    console.log(config.MONGODB_URI);
    await mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Succesfully connected to MONGODB');
  } catch (e)
  {
    console.error("Error connecting to mongodb");
  }
};

module.exports = {
  init
};