const express = require('express');
const loaders = require('./loaders');

async function initApp() {
  const app = express();
  app.set('trust proxt', true);

  await loaders.init({ expressApp: app });
  return app;
}

module.exports = initApp;


