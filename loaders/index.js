const expressLoader = require('./express');
const errorHandler = require('./errorHandler');
const mongooseLoader = require('./mongooseLoader');
const passportLoader = require('./passportLoader');

const init = async ({ expressApp }) => {
  await mongooseLoader.init();
  await passportLoader.init({ app: expressApp });
  await expressLoader.init({ app: expressApp });
  console.log('Express initialized');
  await errorHandler.init({ app: expressApp });
  console.log('Error handlers set.');
};

module.exports = { init };
