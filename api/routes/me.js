const middlewares = require('../middlewares');
const meRouter = require('express').Router();

meRouter.get('/me', middlewares.attachCurrentUser, (req, res, next) => {
  if (!req.user) {
    res.status(403).end();
  }
  else {
    res.json(req.user);
  }
})

module.exports = meRouter;