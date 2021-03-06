const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const meRouter = require('../api/routes/me');
const appraisalPeriodsRouter = require('../api/routes/periods');
const appraisalItemsRouter = require('../api/routes/appraisal-items');
const userRouter = require('../api/routes/user');
const teamRouter = require('../api/routes/team');
const securityRouter = require('../api/routes/security');
const settingsRouter = require('../api/routes/settings');
const reportingRouter = require('../api/routes/reporting');
const { taskAPI, taskFlowAPI, taskRuleAPI, taskPlanningAPI } = require('../components/tasks');
const { auditsRouter } = require('../api/routes/audits');

const init = ({ app }) => {
  app.use(morgan('tiny'));

  app.get('/status', (req, res) => {
    res.status(200).end();
  });

  app.use(cors());

  app.all('/*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use('/api', meRouter);
  app.use('/api/periods', appraisalPeriodsRouter);
  app.use('/api/appraisal-items', appraisalItemsRouter);
  app.use('/api/audits', auditsRouter);
  app.use('/api/users', userRouter);
  app.use('/api/teams', teamRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/reporting', reportingRouter);
  app.use('/api/tasks', taskAPI);
  app.use('/api/task-rules', taskRuleAPI);
  app.use('/api/task-flows', taskFlowAPI);
  app.use('/api/task-planning', taskPlanningAPI);

  return app;
};

module.exports = { init };
