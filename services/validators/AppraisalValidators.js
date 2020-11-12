/* eslint-disable max-classes-per-file */
const BaseValidator = require('./BaseValidator');
const { securities } = require('../../config').constants;
const { AuthorizationService: Auth } = require('../AuthorizationService');

/**
 * Check in the database if period exist
 */
class ValidatePeriodExists extends BaseValidator {
  /**
   * @param {any} period - Appraisal period
   */
  constructor(period) {
    super();
    this.period = period;
  }

  async validate() {
    const result = {
      valid: Boolean(this.period),
      error: this.period ? '' : 'Period does not exist.',
    };
    return this.advance(result);
  }
}

class ValidatePeriodActive extends BaseValidator {
  /**
   * @param {any} period - Appraisal period
   */
  constructor(period) {
    super();
    this.period = period;
  }

  async validate() {
    const valid = this.period.status === 'Active';
    return this.advance({
      valid,
      error: valid ? '' : `Period ${this.period.name} status is not 'Active'`,
    });
  }
}

class ValidateItemActive extends BaseValidator {
  /**
   * @param {*} item - Appraisal item
   * @param {*} user - Requesting user
   */
  constructor(item, user) {
    super();
    this.item = item;
    this.user = user;
  }

  async validate() {
    const valid = this.item.status === 'Active';
    return this.advance({
      valid,
      error: valid ? '' : `Item ${this.item.content} status is not 'Active'`,
    });
  }
}

/**
 * Check in the database if item exists
 */
class ValidateItemExists extends BaseValidator {
  /**
   * @param {*} item - Appraisal item
   */
  constructor(item) {
    super();
    this.item = item;
  }

  async validate() {
    const result = {
      valid: Boolean(this.item),
      error: this.item ? '' : 'Item does not exist.',
    };
    return this.advance(result);
  }
}

class ValidateItemCanBeDeleted extends BaseValidator {
  /**
   * @param {*} item - Appraisal item
   * @param {*} user - Requesting user
   */
  constructor(item, user) {
    super();
    this.item = item;
    this.user = user;
  }

  async validate() {
    const result = {
      valid: true,
      error: '',
    };
    const allowedDeleteFinished = await Auth
      .Authorize(
        this.user,
        securities.APPRAISALDETAILS.code,
        securities.APPRAISAL_DETAILS.grants.deleteFinished,
      );
    if (!allowedDeleteFinished) {
      // if this.item has a period, check if it's active
      if (this.item.period) {
        this.squeeze(new ValidatePeriodActive(), 'and');
      }
      // this.item has related already
      if (this.item.relatedItemId) {
        result.valid = false;
        result.error = 'Item has a related entry. Cannot be deleted.';
      }
      // if this.item's status is finihed, it cannot be deleted
      if (this.item.status === 'Finished') {
        result.valid = false;
        result.error = 'Item\'s status is finished. Cannot delete.';
      }
    }
    return this.advance(result);
  }
}

class ValidateItemTypeIsNot extends BaseValidator {
  /**
   * @param {string} type - item type
   */
  constructor(item, type) {
    super();
    this.item = item;
    this.type = type;
  }

  async validate() {
    const result = {
      valid: true,
      error: '',
    };
    if (this.item.type === this.type) {
      result.valid = false;
      result.error = `Item type validation failed - ${this.item.type}`;
    }
    return this.advance(result);
  }
}

class ValidateItemCanBeUpdated extends BaseValidator {
  /**
   * @param {*} item - Appraisal item
   * @param {*} period - Appraisal period
   * @param {*} user - Requesting user
   */
  constructor(period, item, update, user) {
    super();
    this.item = item;
    this.period = period;
    this.update = update;
    this.user = user;
  }

  async validate() {
    const result = {
      valid: true,
      error: '',
    };
    const AD = securities.APPRAISAL_DETAILS;
    const ADO = securities.APPRAISAL_DETAILS_OTHER;
    // Can user update finished items, for himeself or other users
    const canUpdateFinished = this.user.id === this.item.user
      ? await Auth.Authorize(this.user, AD.code, AD.grants.updateFinished)
      : await Auth.Authorize(this.user, ADO.code, ADO.grants.updateFinished);
    // Can update items of other users
    const canUpdateOtherUsers = await Auth.Authorize(this.user, ADO.code, ADO.grants.update);
    // if item has a period, check if user can update finished items
    if (this.period) this.squeeze(new ValidatePeriodActive(), 'and', !canUpdateFinished);
    // check if user can update finished items
    this.squeeze(new ValidateItemActive(this.item, this.user), 'and', !canUpdateFinished);
    // if user updating is not the owner of the item, check if he has the authorization to do it
    if (this.user.id !== this.item.user && !canUpdateOtherUsers) {
      result.valid = false;
      result.error = 'Cannot update items of other users';
    }
    return this.advance(result);
  }
}

class ValidateItemCanBeInserted extends BaseValidator {
  /**
   * @param {*} period - Appraisal Period
   * @param {*} item - Appraisal Item
   * @param {*} user - Requesting user
   */
  constructor(period, item, user) {
    super();
    this.period = period;
    this.item = item;
    this.user = user;
  }

  async validate() {
    const result = {
      valid: true,
      error: '',
    };
    // Securities constants
    const AD = securities.APPRAISAL_DETAILS;
    const ADO = securities.APPRAISAL_DETAILS_OTHER;

    if (this.period) {
    // Can user create items in finished periods
      const canInsertInFinished = this.user.id === this.item.user
        ? await Auth.Authorize(this.user, AD.code, AD.grants.createFinished)
        : await Auth.Authorize(this.user, ADO.code, ADO.createFinished);
      this.squeeze(new ValidatePeriodActive(this.period), 'and', !canInsertInFinished);
    }

    // Can user create items
    const canInsert = this.user.id === this.item.user
      ? await Auth.Authorize(this.user, AD.code, AD.grants.create)
      : await Auth.Authorize(this.user, ADO.code, ADO.grants.create);

    if (!canInsert) {
      result.valid = false;
      result.error = 'No access to create items.';
    }

    return this.advance(result);
  }
}

class ValidateIsSameUser extends BaseValidator {
  /**
   * Check whether user making the request is the same as
   * the owner of the item
   * @param {*} item - Appraisal item
   * @param {*} user - Requesting user
   */
  constructor(item, user) {
    super();
    this.item = item;
    this.user = user;
  }

  async validate() {
    const result = {
      valid: true,
      error: '',
    };
    if (this.item.user !== this.user.id) {
      result.valid = false;
      result.error = 'Item doesn\'t belong to user.';
    }
    return this.advance(result);
  }
}

module.exports = {
  ValidatePeriodExists,
  ValidatePeriodActive,
  ValidateItemActive,
  ValidateItemExists,
  ValidateItemCanBeInserted,
  ValidateItemCanBeDeleted,
  ValidateItemCanBeUpdated,
  ValidateItemTypeIsNot,
  ValidateIsSameUser,
};
