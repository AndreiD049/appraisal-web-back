/**
 * This file contains valious validation functions.
 * Function schema
 * @param {any} args - any arguments function might use
 * @returns {async function(): {result: boolean, message: string}}
 */

const isTruthy = (x, message = null) => async () => ({
  result: Boolean(x),
  message: message || 'False - validation failed.',
});

const areEqual = (x, y, message = null) => async () => ({
  result: x === y,
  message: message || `Expected ${x} === ${y}.`,
});

module.exports = {
  isTruthy,
  areEqual,
};
