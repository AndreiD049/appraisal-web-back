/**
 * This file contains valious validation functions.
 * Function schema
 * @param {any} args - any arguments function might use
 * @returns {async function(): {result: boolean, message: string}}
 */
const mongoose = require('mongoose');

const viewExists = (view) => async () => ({
  result: ((await mongoose
    .connection
    .db
    .listCollections()
    .toArray())
    .filter((c) => c.name === view).length > 0),
  message: `View ${view} doesn't exist`,
});

const viewName = (view) => async () => ({
  result: view.toLowerCase().endsWith('view'),
  message: `View name '${view}' is not valid.`,
});

module.exports = {
  viewExists,
  viewName,
};
