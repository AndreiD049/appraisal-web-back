const express = require('express');
const loaders = require('./loaders');

const app = express();
loaders.init({ expressApp: app });

module.exports = app;
