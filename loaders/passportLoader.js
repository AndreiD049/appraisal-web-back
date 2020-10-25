const passport = require('passport');
const {OIDCStrategy} = require('passport-azure-ad');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const config = require('../config');
const UserService = require('../services/UserService');

const init = async ({app}) => {
  app.store = new MongoStore({
    mongooseConnection: mongoose.connection,
    ttl: 5 * 24 * 60 * 60
  })

  app.use(session({
    secret: config.creds.clientSecret,
    resave: true,
    saveUninitialized: false,
    store: app.store,
    cookie: {
      sameSite: false,
      maxAge: 5 * 24 * 60 * 60 * 1000,
      domain: config.creds.domain
    }
  }))

  passport.serializeUser(function(user, done) {
    done(null, user.oid);
  });

  passport.deserializeUser(function(oid, done) {
    app.store.get(oid, async (err, session) => {
      if (err) {
        done(err, null);
      }
      done(null, session);
    });
  });

  passport.use(new OIDCStrategy({
    identityMetadata: config.creds.identityMetadata,
    clientID: config.creds.clientID,
    responseType: config.creds.responseType,
    responseMode: config.creds.responseMode,
    redirectUrl: config.creds.redirectUrl,
    allowHttpForRedirectUrl: true,
    clientSecret: config.creds.clientSecret,
    passReqToCallback: false,
    validateIssuer: true,
    isB2C: false,
    issuer: config.creds.issuer,
    scope: ['profile'],
    useCookieInsteadOfSession: false,
    loggingLevel: 'debug',
    nonceLifetime: null,
    nonceMaxAmount: 5,
    clockSkew: null
  }, 
  async function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.oid) {
      return done(new Error("No oid found"), null);
    }
    // before attaching it to the req, add the info from mongo db
    let dbUser = await UserService.getUserByUsername(profile._json.preferred_username);
    if (dbUser === null) {
      // Add the user to the DB
      dbUser = await UserService.addDefaultUser(profile._json.preferred_username);
    }
    dbUser = dbUser.toJSON();
    let sessionUser = { oid: profile.oid, displayName: profile.displayName, name: profile.name, ...dbUser};
    process.nextTick(function () {
      app.store.set(profile.oid, sessionUser, (err) => {
        if (err) {
          return done(err, null);
        }
        return done(null, sessionUser);
      })
    });
  }));
  app.use(passport.initialize());
  app.use(passport.session());
}

module.exports = { init }
