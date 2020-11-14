const { options } = require("../../api/routes/periods");

class BaseValidator {
  constructor() {
  /**
   * Operation type.
   * Defines what to do with the validation result.
   * Example: if validation result is 'false', and the operation
   * type is 'or', we can proceed to the next validator, if it's 'and'
   * we can already return to the user
   */
    this.opType = '';
    this.next = null;
    this.head = this;
  }

  get nextValidator() {
    return this.next;
  }

  set nextValidator(value) {
    const nxt = value;
    nxt.head = this.head;
    this.next = nxt;
  }

  /**
   * Asserts the current validator for necessary fields and functions.
   * @param {object} validator - validator to be checked
   */
  static assert(validator) {
    if (!('nextValidator' in validator)) throw new Error('Validator is invalid. nextValidator proprty missing');
    if (!('or' in validator)) throw new Error('Validator not valid. "or" function missing');
    if (!('and' in validator)) throw new Error('Validator not valid. "and" function missing');
    if (!('validate' in validator)) throw new Error('Validator not valid. "validate" function missing');
  }

  /**
   * Having the result of the validation, we can either
   * move to the next validator, or return to the client.
   * @param {{valid: boolean, error: string}} result - result of the validation
   */
  async advance(result) {
    if (!this.nextValidator) {
      return result;
    }
    if (result.valid) {
      if (this.opType === 'or') {
        return result;
      } if (this.opType === 'and') {
        return this.nextValidator.validate();
      }
    } else {
      if (this.opType === 'or') {
        return this.nextValidator.validate();
      } if (this.opType === 'and') {
        return result;
      }
    }
    return result;
  }

  /**
   * This is an abstract method. It should be overwritten in the children.
   * Validate the request and pass the execution to the parrent
   * depending on operation type
   * @param {any} _request - the object containing all necessary info for validation.
   * @returns {{valid: boolean, error: string}} result of the validation
   */
  // eslint-disable-next-line no-unused-vars
  async validate() {
    const result = this;
    return {
      valid: false,
      error: `This method is meant to be overriden. ${result}`,
    };
  }

  /**
   * Validate the chain and throw an error if it fails
   */
  async validateThrow() {
    const result = await this.head.validate();
    if (!result.valid) {
      throw new Error(result.error);
    }
  }

  /**
   * Receiving a validator as a parameter, will set the next validator
   * and the operation type to 'or'
   * Returning the validator (the HEAD of the chain)
   * @param {any} validator
   * @param {boolean} condition
   */
  or(validator, condition = true) {
    if (condition) {
      this.opType = 'or';
      this.nextValidator = validator;
      return validator;
    }
    return this;
  }

  /**
   * Receiving a validator as a parameter, will set the next @validator
   * and the operation type to 'and'
   * Returning the validator (the HEAD of the chain)
   * @param {any} validator
   */
  and(validator, condition = true) {
    if (condition) {
      this.opType = 'and';
      this.nextValidator = validator;
      return validator;
    }
    return this;
  }

  /**
   * Squeeze validator.
   * Get the current parameter validator, and insert it as a next validator.
   * If there is already a next, move it to become the next of the @validator
   * Returning the validator (to allow chaining, if multiple validators need to be squeezed)
   * @param {object} validator - instance of BaseValidator
   */
  squeeze(validator, opType = 'or', condition = true) {
    if (condition) {
      if (!this.next) {
        return this[opType](validator);
      }
      const currentHead = this.next;
      const newHead = validator;
      newHead.opType = this.opType;
      this.opType = opType;
      // current next is the @validator
      this.nextValidator = validator;
      // @validator's next is the initial next item
      newHead.nextValidator = currentHead;
      return newHead;
    }
    return this;
  }
}

module.exports = BaseValidator;
