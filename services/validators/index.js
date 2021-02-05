const appraisalValidators = require('./AppraisalValidators');
const userValidators = require('./UserValidators');
const mongoValidators = require('./mongoValidators');
const GeneralValidators = require('./GeneralValidators');
const ReportingValidators = require('./ReportingValidators');

/**
 * @param {function(): {result: boolean, message: string}} condition
 * @param {async function()} validationsTrue
 * @param {async function()} validationsFalse
 */
const If = (condition, validationsTrue, validationsFalse) => async () => {
  try {
    if (typeof condition === 'boolean') {
      return condition ? validationsTrue() : validationsFalse();
    }
    if (condition instanceof Function) {
      const conditionRes = await condition();
      if (conditionRes.result === true) {
        return validationsTrue();
      }
      if (conditionRes.result === false) {
        return validationsFalse();
      }
    }
    throw new Error('Invalid condition supplied');
  } catch (err) {
    return {
      result: false,
      message: err.message,
    };
  }
};

/**
 * @param {Array.<function(): {result: boolean, message: string}>} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const and = (validations, message = null) => async () => {
  try {
    if (validations.length === 0) {
      throw new Error('No validations provided');
    }
    const results = await Promise.all(validations.map((v) => v()));
    if (results.every((v) => v.result)) {
      return results[0];
    }
    const result = results.find((v) => v.result === false);
    if (message) result.message = message;
    return result;
  } catch (err) {
    return {
      result: false,
      message: message || err.message,
    };
  }
};

/**
 * @param {Array.<function(): {result: boolean, message: string}>} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const andSync = (validations) => () => {
  try {
    const l = validations.length;
    if (l === 0) {
      throw new Error('No validations provided');
    }
    let last;
    for (let i = 0; i < l; i += 1) {
      last = validations[i]();
      if (!last.result) break;
    }
    return last;
  } catch (err) {
    console.error(err);
    return {
      result: false,
      message: 'error',
    };
  }
};

/**
 * @param {Array.<function(): {result: boolean, message: string}>} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const or = (validations, message = null) => async () => {
  // sequential execution
  async function iterate(vals) {
    if (!vals.length) {
      throw new Error('Invalid validations. Expected array.');
    }
    if (vals.length === 1) {
      return vals[0]();
    }
    const first = await vals[0]();
    if (first.result) {
      return first;
    }
    return iterate(vals.slice(1));
  }

  try {
    if (validations.length === 0) {
      throw new Error('No validations provided');
    }
    const result = await iterate(validations);
    if (message) result.message = message;
    return result;
  } catch (err) {
    return {
      result: false,
      message: message || 'error',
    };
  }
};

/**
 * @param {Array.<function(): {result: boolean, message: string}>} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const orSync = (validations) => () => {
  try {
    const l = validations.length;
    if (l === 0) {
      throw new Error('No validations provided');
    }
    let last;
    for (let i = 0; i < l; i += 1) {
      last = validations[i]();
      if (last.result) break;
    }
    return last;
  } catch (err) {
    console.error(err);
    return {
      result: false,
      message: 'error',
    };
  }
};

/**
 * @param {function(): {result: boolean, message: string}} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const not = (validation, message = null) => async () => {
  try {
    const val = await validation();
    val.result = !val.result;
    val.message = message || `Not - ${val.message}`;
    return val;
  } catch (err) {
    console.error(err);
    return {
      result: false,
      message: message || 'error',
    };
  }
};

/**
 * @param {function(): {result: boolean, message: string}} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const notSync = (validation, message = null) => () => {
  try {
    const val = validation();
    val.result = !val.result;
    val.message = message || val.message;
    return val;
  } catch (err) {
    return {
      result: false,
      message: message || 'error',
    };
  }
};

const perform = async (validation, throwEx = true) => {
  const v = await validation();
  if (!v.result) {
    if (throwEx) throw new Error(v.message);
    return v;
  }
  return v;
};

const performSync = (validation, throwEx = true) => {
  const v = validation();
  if (!v.result) {
    if (throwEx) throw new Error(v.message);
    return v;
  }
  return v;
};

module.exports = {
  If,
  and,
  andSync,
  or,
  orSync,
  not,
  notSync,
  perform,
  performSync,
  validate: {
    ...appraisalValidators,
    ...userValidators,
    ...mongoValidators,
    ...GeneralValidators,
    ...ReportingValidators,
  },
};
