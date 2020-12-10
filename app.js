const express = require('express');
const loaders = require('./loaders');

// async function initApp() {
// const app = express();
// app.set('trust proxy', true);
//
// await loaders.init({ expressApp: app });
// return app;
// }

const app = express();
loaders.init({ expressApp: app });

module.exports = app;
