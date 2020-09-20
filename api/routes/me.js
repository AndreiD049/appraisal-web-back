const passport = require('passport');
const UserService = require('../../services/UserService');
const meRouter = require('express').Router();
const config = require('../../config');

meRouter.get('/me', async (req, res, next) => {
  if (!req.user) {
    res.status(403).end();
  }
  else {
    // get the latest user updates
    let userDB = await UserService.getUser(req.user.id);
    req.app.store.get(req.user.oid, (err, session) => {
      if (err) {
        next(err);
      }
      req.user = {...session, ...userDB};
      req.app.store.set(req.user.oid, req.user, (err) => {
        if (err)
          next(err);
        res.json(req.user);
      });
    })
  }
});


meRouter.get('/login', function(req, res, next) {
  passport.authenticate('azuread-openidconnect', {
    response: res,
    failureRedirect: '/login',
    state: 'login',
    tenantIdOrName: config.creds.tenantId,
  })(req, res, next);
},
(req, res, next) => {
  res.redirect('/');
});

meRouter.get('/logout', function(req, res, next) {
  req.session.destroy();
  req.logout();
  res.redirect(config.creds.destroySessionUrl);
})

meRouter.post('/auth/openid/return',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect', 
      { 
        response: res,                      
        failureRedirect: '/login',
        tenantIdOrName: config.creds.tenantId
      }
    )(req, res, next);
  },
  (req, res, next) => {
    res.redirect('/');
})

module.exports = meRouter;