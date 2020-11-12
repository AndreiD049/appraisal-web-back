/* eslint-disable max-classes-per-file */
const BaseValidator = require('./BaseValidator');
const UserService = require('../UserService');

class ValidateUserInTeam extends BaseValidator {
  /**
   * Checks if @userTo is a member of @userFrom teams
   * @param {*} userFrom - User who makes the request
   * @param {*} userTo - User to be checked
   */
  constructor(userFrom, userTo) {
    super();
    this.userFrom = userFrom;
    this.userTo = userTo;
  }

  async validate() {
    const result = {
      valid: true,
      error: '',
    };

    if (!(await UserService.isTeamMember(this.userFrom, this.userTo.id))) {
      result.valid = false;
      result.error = `User '${this.userTo.username}' is not member of '${this.userFrom.username}' teams.`;
    }

    return this.advance(result);
  }
}

module.exports = {
  ValidateUserInTeam,
};
