/**
 * This file contains valious validation functions.
 * Function schema
 * @param {any} args - any arguments function might use
 * @returns {async function(): {result: boolean, message: string}}
 */
const { AuthorizationService } = require('../AuthorizationService');
const UserService = require('../UserService');

const userExists = (user) => async () => ({
  result: Boolean(user),
  message: "User doesn't exist.",
});

const userAuthorized = (user, code, grant) => async () => ({
  result: await AuthorizationService.Authorize(user, code, grant),
  message: `Access denied. Code: ${code}, Grant: ${grant}`,
});

const userInTeam = (userFrom, userTo) => async () => ({
  result: Boolean(await UserService.isTeamMember(userFrom, userTo)),
  message: `User '${userTo.username}' is not member of '${userFrom.username}' teams.`,
});

module.exports = {
  userExists,
  userAuthorized,
  userInTeam,
};
