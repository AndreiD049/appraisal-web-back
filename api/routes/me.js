const passport = require('passport');
const UserService = require('../../services/UserService');
const meRouter = require('express').Router();
const config = require('../../config');

meRouter.get('/me', async (req, res, next) => {
  if (!req.user) {
    res.status(403).end();
  } else {
    // get the latest user updates
    const userDB = await (await UserService.getUser(req.user.id)).toJSON();
    req.app.store.get(req.user.oid, (err, session) => {
      if (err) {
        next(err);
      }
      req.user = { ...session, ...userDB };
      req.app.store.set(req.user.oid, req.user, (err) => {
        if (err) next(err);
        res.json(req.user);
      });
    });
  }
});

meRouter.get('/login', (req, res, next) => {
  passport.authenticate('azuread-openidconnect', {
    response: res,
    failureRedirect: '/login',
  })(req, res, next);
},
(req, res, next) => {
  res.redirect('/');
});

meRouter.get('/logout', (req, res, next) => {
  req.session.destroy();
  req.logout();
  res.redirect(config.creds.destroySessionUrl);
});

meRouter.post('/auth/openid/return',
  (req, res, next) => {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,
        failureRedirect: '/login',
      })(req, res, next);
  },
  (req, res, next) => {
    res.redirect('/');
  });

module.exports = meRouter;
