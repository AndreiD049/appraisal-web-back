/**
 * This file contains valious validation functions.
 * Function schema
 * @param {any} args - any arguments function might use
 * @returns {async function(): {result: boolean, message: string}}
 */

const isAggregationValid = (aggregation, message = null) => async () => {
  try {
    JSON.parse(aggregation);
    return {
      result: true,
      message,
    };
  } catch (err) {
    return {
      result: false,
      message: message ? `${message} - ${err.message}` : `Aggregation not valid - ${err.message}`,
    };
  }
};

module.exports = {
  isAggregationValid,
};
