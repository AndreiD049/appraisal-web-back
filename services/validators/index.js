const appraisalValidators = require('./AppraisalValidators');
const userValidators = require('./UserValidators');
const mongoValidators = require('./mongoValidators');

/**
 * @param {Array.<function(): {result: boolean, message: string}>} validations
 * @return {function(): {result: boolean, message: string}} validations
 */
const and = (validations) => async () => {
  try {
    if (validations.length === 0) {
      throw new Error('No validations provided');
    }
    const results = await Promise.all(validations.map((v) => v()));
    if (results.every((v) => v.result)) {
      return results[0];
    }
    return results.find((v) => v.result === false);
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
const or = (validations) => async () => {
  try {
    if (validations.length === 0) {
      throw new Error('No validations provided');
    }
    const results = await Promise.all(validations.map((v) => v()));
    if (results.some((v) => v.result)) {
      return results.find((v) => v.result);
    }
    return results[results.length - 1];
  } catch (err) {
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
const not = (validation) => async () => {
  try {
    const val = await validation();
    val.result = !val.result;
    val.message = `Not - ${val.message}`;
    return val;
  } catch (err) {
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
const notSync = (validation) => () => {
  try {
    const val = validation();
    val.result = !val.result;
    return val;
  } catch (err) {
    return {
      result: false,
      message: 'error',
    };
  }
};

const perform = async (validation) => {
  const v = await validation();
  if (!v.result) {
    throw new Error(v.message);
  } else {
    return v;
  }
};

const performSync = (validation) => {
  const v = validation();
  if (!v.result) {
    throw new Error(v.message);
  } else {
    return v;
  }
};

module.exports = {
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
  },
};
