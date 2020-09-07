const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const meRouter = require('../api/routes/me');
const appraisalPeriodsRouter = require('../api/routes/periods');
const userRouter = require('../api/routes/user');
const middlewares = require('../api/middlewares');

const init = async ({ app }) => {
  app.use(morgan('tiny'));

  app.get('/status', (req, res) => {
    res.status(200).end();
  });

  app.use(cors());
  app.use(bodyParser.json());

  app.use(middlewares.attachCurrentUser);

  app.use('/api', meRouter);
  app.use('/api/periods', appraisalPeriodsRouter);
  app.use('/api/users', userRouter);

  return app;
};

module.exports = { init };