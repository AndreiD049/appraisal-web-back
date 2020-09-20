const UserService = require('../../services/UserService');

const attachCurrentUser = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.id = req.user._json.preferred_username;
    }
    return next();
  } catch (e) {
    console.error(`Error attaching user id to the request: ${e}`);
    return next(e);
  }
};

module.exports = attachCurrentUser;