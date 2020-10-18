const AppraisalPeriodModel = require('../models/AppraisalPeriodModel');
const AppraisalItemModel = require('../models/AppraisalItemModel');
const UserService = require('./UserService');
const UserModel = require('../models/UserModel');
const { Types } = require('mongoose');

const AppraisalService = {
  getPeriodsOverview: async function(user) {
    if (!user || !user.id)
      return null;
    /* 
     * Get all periods that are:
     *    1. Finished and user is a part of them
     *    2. Active and have the same OrganizationId as one of the user's organizations
     */ 
    const dbUser = await UserModel.findById(user.id);
    let docs = await AppraisalPeriodModel.find().or([
      { "users": dbUser.id, status: "Finished" },
      { status: "Active", organizationId: { $in: dbUser.organizations } }
    ]).populate('createdUser');
    return docs.map(el => el.calculateStatus(dbUser))
  },

  getPeriodById: async function(id) {
    const period = await AppraisalPeriodModel.findById(id).exec();
    return period;
  },

  createPeriod: async function(user, period) {
    const newPeriod = new AppraisalPeriodModel({...period});
    return await newPeriod.save();
  },

  getItemsByPeriodId: async function(id, user) {
    if (!user.id)
      return null;
    // Get items of current period/User
    const items = await AppraisalItemModel.find({
      periodId: id,
      user: user.id
    }).exec();

    return items;
  },

  getItemById: async function(itemId) {
    const item = await AppraisalItemModel.findById(itemId).exec();
    return item;
  },

  /*
   *  Validation rules:
   *    1. I cannot insert the item if the period has status Finished
   *    2. I cannot insert the item if the body is not valid
   *    3. I cannot insert an item of Training Suggested for myself
   */ 
  addItemToPeriod: async function (periodId, item, user) {
    if (!user.id)
      throw new Error('Item has no valid id');
    const period = await this.getPeriodById(periodId);
    if (!period)
      throw new Error('Item has invalid Period id');
    if (period.status === 'Finished')
      throw new Error('Period is already finished');
    if (period.usersFinished && period.usersFinished.indexOf(user.id) !== -1)
      throw new Error('Period is already finished');
    if (item.type === 'Training_Suggested' && item.user === user.id) 
      throw new Error('You cannot add an \'Suggested Training\' item of yourself');
    const model = new AppraisalItemModel({
      type: item.type,
      status: item.status,
      content: item.content,
      periodId: periodId,
      organizationId: period.organizationId,
      user: user.id,
      createdUser: user.id
    });
    return await model.save();
  },

  // Add item to another user
  // Check if user is a team member
  addItemToPeriodOfMember: async function(periodId, item, user) {
    if (!user.id)
      throw new Error('User has no valid id');
    // Get the user to whom we add the item
    const subject_user = await UserService.getUser(item.user);
    if (!(await UserService.isTeamMember(user, subject_user)))
      throw new Error(`User '${subject_user.id}' is not a member of '${user.id}' teams`);
    const period = await this.getPeriodById(periodId);
    if (!period)
      throw new Error('Item has invalid Period id');
    if (period.status === 'Finished')
      throw new Error('Finished period items cannot be updated');
    const model = new AppraisalItemModel({
      type: item.type,
      status: item.status,
      content: item.content,
      periodId: periodId,
      organizationId: period.organizationId,
      user: subject_user.id,
      createdUser: user.id
    });
    return await model.save();
  },

  /*
   * Validation: 
   * 1. I cannot update a finished item
   * 2. I cannot update an item whose period is already finished
   */
  updateItem: async function (itemId, update) {
    const item = (await AppraisalItemModel.findById(itemId).exec()).toJSON();
    const period = (await AppraisalPeriodModel.findById(item.periodId).exec()).toJSON();
    if (item.status === 'Finished')
      throw new Error('Finished item cannot be updated');
    // Check period finished
    if (period.status === 'Finished')
      throw new Error('Finished period items cannot be updated');
    if (item.type === 'Training_Suggested') 
      throw new Error('You cannot update an \'Suggested Training\' item of yourself');
    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, update, {new: true}).exec();
    return updated;
  },

  // Update item of another user
  updateItemOfMember: async function (itemId, update, user) {
    const item = (await AppraisalItemModel.findById(itemId).exec()).toJSON();
    const subject_user = await UserService.getUser(item.user);
    // Check if user can update subjec_user's items at all
    if (!(await UserService.isTeamMember(user, subject_user)))
      throw new Error(`User '${subject_user.id}' is not a member of '${user.id}' teams`);

    const period = (await AppraisalPeriodModel.findById(item.periodId).exec()).toJSON();
    // Check if period was already finished completely
    if (period.status === 'Finished')
      throw new Error('Finished period items cannot be updated');
    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, update, {new: true}).exec();
    return updated;
  },

  /*
   * Validation:
   * 1. I cannot delete an item that is already finished
   * 2. I cannot delete an item whose period is already finished
   * 3. I cannot delete an Training suggested item of myself
   */
  deleteItem: async function(itemId, user) {
    const item = (await AppraisalItemModel.findById(itemId).exec()).toJSON();
    const period = (await AppraisalPeriodModel.findById(item.periodId).exec()).toJSON();
    if (item.status === 'Finished')
      throw new Error('Finished item cannot be deleted');
    // Check period finished
    if (period.status === 'Finished')
      throw new Error('Finished period items cannot be deleted');
    if (period.usersFinished && period.usersFinished.indexOf(user.id) !== -1)
      throw new Error('Finished period items cannot be deleted');
    // if type Training_suggested, check if you can delete it
    if (item.type === 'Training_Suggested' && item.user === user.id) 
      throw new Error('You cannot delete an \'Suggested Training\' item of yourself');
    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted;
  },

  // Delete item of another user
  deleteItemOfMember: async function(itemId, user) {
    const item = (await AppraisalItemModel.findById(itemId).exec()).toJSON();
    const subject_user = await UserService.getUser(item.user);
    // Check if user can update subjec_user's items at all
    if (!(await UserService.isTeamMember(user, subject_user)))
      throw new Error(`User '${subject_user.id}' is not a member of '${user.id}' teams`);

    const period = (await AppraisalPeriodModel.findById(item.periodId).exec()).toJSON();
    // Check period finished
    if (period.status === 'Finished')
      throw new Error('Finished period items cannot be deleted');
    if (item.type !== 'Training_Suggested') 
      throw new Error('You cannot delete items of this type from other users');
    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted;
  },

  finishItem: async function(item) {
    const itemDb = await AppraisalItemModel.findById(item.id).exec();
    if (['Finished', 'InProgress'].indexOf(itemDb.status) !== -1) 
      throw new Error(`Item '${itemDb.content}' is already finished`);
    // if item type is Planned, change the status to InProgress
    if (itemDb.type === 'Planned') {
      itemDb.status = 'InProgress';
    } else {
      itemDb.status = 'Finished';
    }
    itemDb.save();
  },

  finishPeriod: async function(periodId, user) {
    console.log(periodId);
    const period = await AppraisalPeriodModel.findById(periodId);
    if (!period)
      throw new Error('Period was not found');
    if (period.status === 'Finished')
      throw new Error('Period is already finished');
    if (!user || !user.id)
      throw new Error("User is no logged in");
    if (period.usersFinished.indexOf(user.id) !== -1)
      throw new Error("User already finished this period");
    // Get all the items for this user and period
    const items = await this.getItemsByPeriodId(periodId, user);
    // We need to change the item status accordingly
    items.forEach(async (item) => {
      await this.finishItem(item);
    });
    // Next, we need to add current user id to the period usersFinished
    period.usersFinished.push(user.id);
    period.save();
    return true;
  }
};

module.exports = AppraisalService;