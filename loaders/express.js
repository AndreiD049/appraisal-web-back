const bodyParser = require('body-parser');
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
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use('/api', meRouter);
  app.use('/api/periods', appraisalPeriodsRouter);
  app.use('/api/appraisal-items', appraisalItemsRouter);
  app.use('/api/audits', auditsRouter);
  app.use('/api/users', userRouter);
  app.use('/api/teams', teamRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/reporting', reportingRouter);

  return app;
};

module.exports = { init };
