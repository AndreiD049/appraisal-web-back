const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const meRouter = require('../api/routes/me');
const appraisalPeriodsRouter = require('../api/routes/periods');
const userRouter = require('../api/routes/user');
const teamRouter = require('../api/routes/team');
const securityRouter = require('../api/routes/security');

const init = async ({ app }) => {
  app.use(morgan('tiny'));

  app.get('/status', (req, res) => {
    res.status(200).end();
  });

  app.use(cors());

  app.all('/*', function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      next();
  });
  app.use(bodyParser.urlencoded({ extended : true }));
  app.use(bodyParser.json());

  app.use('/api', meRouter);
  app.use('/api/periods', appraisalPeriodsRouter);
  app.use('/api/users', userRouter);
  app.use('/api/teams', teamRouter);
  app.use('/api/security', securityRouter);

  return app;
};

module.exports = { init };