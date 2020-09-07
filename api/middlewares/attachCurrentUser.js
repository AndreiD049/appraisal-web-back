const UserService = require('../../services/UserService');

const attachCurrentUser = async (req, res, next) => {
  try {
    req.user = await UserService.getCurrentUser();
    return next();
  } catch (e) {
    console.error(`Error attaching user to the request: ${e}`);
    return next(e);
  }
};

module.exports = attachCurrentUser;