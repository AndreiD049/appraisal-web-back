const expressLoader = require('./express');
const errorHandler = require('./errorHandler');
const mongooseLoader = require('./mongooseLoader');
const authLoader = require('./authLoader');

/**
 * Initializes all loaders (auth, express, errorhandler)
 *
 * @param {Object}
 */
const init = ({ expressApp }) => {
  authLoader.init({ app: expressApp });
  expressLoader.init({ app: expressApp });
  errorHandler.init({ app: expressApp });
};

module.exports = { init, expressLoader, errorHandler, mongooseLoader };
