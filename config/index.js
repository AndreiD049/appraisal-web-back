const dotenv = require('dotenv');
const constants = require('./constants');

dotenv.config();

module.exports = {
  port: process.env.PORT,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  MONGODB_URI:
    process.env.NODE_ENV === 'test' ? process.env.MONGODB_URI_TEST : process.env.MONGODB_URI,
  constants,
};
