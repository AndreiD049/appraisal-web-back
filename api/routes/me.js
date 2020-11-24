const passport = require('passport');
const meRouter = require('express').Router();
const UserService = require('../../services/UserService');
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
      req.app.store.set(req.user.oid, req.user, (e) => {
        if (e) next(e);
        res.json(req.user);
      });
    });
  }
});

meRouter.get(
  '/login',
  (req, res, next) => {
    try {
      passport.authenticate('azuread-openidconnect', {
        response: res,
        failureRedirect: '/login',
      })(req, res, next);
    } catch (err) {
      req.session.destroy();
      next(err);
    }
  },
  (req, res) => {
    res.redirect('/');
  },
);

meRouter.get('/logout', (req, res) => {
  req.session.destroy();
  req.logout();
  res.redirect(config.creds.destroySessionUrl);
});

meRouter.post(
  '/auth/openid/return',
  (req, res, next) => {
    passport.authenticate('azuread-openidconnect', {
      response: res,
      failureRedirect: '/login',
    })(req, res, next);
  },
  (req, res) => {
    res.redirect('/');
  },
);

module.exports = meRouter;
