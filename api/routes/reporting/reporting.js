const reportingRouter = require('express').Router();
const reportsRouter = require('./reports');
const templateRouter = require('./templates');

// before each requestm check if there is a user
reportingRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

reportingRouter.use('/reports', reportsRouter);
reportingRouter.use('/templates', templateRouter);

module.exports = reportingRouter;
