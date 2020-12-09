const expressLoader = require('./express');
const errorHandler = require('./errorHandler');
const mongooseLoader = require('./mongooseLoader');
const passportLoader = require('./passportLoader');

const init = ({ expressApp }) => {
  passportLoader.init({ app: expressApp });
  expressLoader.init({ app: expressApp });
  errorHandler.init({ app: expressApp });
};

module.exports = { init, expressLoader, errorHandler, mongooseLoader, passportLoader };
