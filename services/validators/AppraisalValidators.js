/**
 * This file contains valious validation functions.
 * Function schema
 * @param {any} args - any arguments function might use
 * @returns {async function(): {result: boolean, message: string}}
 */

const periodExists = (period) => async () => ({
  result: Boolean(period),
  message: 'Period doesn\'t exist.',
});

const itemExists = (item) => async () => ({
  result: Boolean(item),
  message: 'Item doesn\'t exist.',
});

const periodStatus = (period, status) => async () => ({
  result: Boolean(period.status === status),
  message: `Period '${period.name}' status is not valid. Expected (${status})`,
});

const itemStatus = (item, status) => async () => ({
  result: Boolean(item.status === status),
  message: `Item '${item.content}' status is not valid. Expected '${status}'.`,
});

const itemType = (item, type) => async () => ({
  result: Boolean(item.type === type),
  message: `Item '${item.content}' type is not valid. Expected '${type}'.`,
});

const itemSameUser = (item, user) => async () => ({
  result: Boolean(String(item.user) === String(user.id)),
  message: `Item '${item.content}'s user is not the same as '${user.username}'`,
});

module.exports = {
  periodExists,
  itemExists,
  periodStatus,
  itemStatus,
  itemType,
  itemSameUser,
};
