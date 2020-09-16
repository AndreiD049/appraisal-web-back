const AppraisalPeriodModel = require('../models/AppraisalPeriodModel');
const AppraisalItemModel = require('../models/AppraisalItemModel');

const AppraisalService = {
  getPeriodsOverview: async function(user) {
    if (!user || !user.id)
      return null;
    /* 
     * Get all periods that are:
     *    1. Finished and user is a part of them
     *    2. Active and have the same OrganizationId as one of the user's organizations
     */ 
    let docs = await AppraisalPeriodModel.find().or([
      { "users": user.id, status: "Finished" },
      { status: "Active", organizationId: { $in: user.organizations } }
    ]);
    return docs.map(el => el.toJSON())
  },

  // Logic specific to period JSON
  periodJSON: function(period, userId) {
    if (period.usersFinished.indexOf(userId) !== -1)
      period.status = 'Finished'
    return ({
      name: period.name,
      status: period.status,
      organizationId: period.organizationId,
      id: period.id,
      createdDate: period.createdDate,
      createdUser: period.createdUser
    });
  },

  getPeriodById: async function(id) {
    const period = await AppraisalPeriodModel.findById(id).exec();
    return period.toJSON();
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

    return items.map(it => it.toJSON());
  },

  getItemById: async function(itemId) {
    const item = await AppraisalItemModel.findById(itemId).exec();
    return item.toJSON();
  },

  /*
   *  Validation rules:
   *    1. I cannot insert the item if the period has status Finished
   *    2. I cannot insert the item if the body is not valid
   */ 
  addItemToPeriod: async function (periodId, item, user) {
    if (!user.id)
      throw new Error('Item has no valid id');
    const period = await this.getPeriodById(periodId);
    if (!period)
      throw new Error('Item has invalid Period id');
    if (period.status === 'Finished')
      throw new Error('Period is already finished');
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
    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, update, {new: true}).exec();
    return updated.toJSON();
  },

  /*
   * Validation:
   * 1. I cannot delete an item that is already finished
   * 2. I cannot delete an item whose period is already finished
   */
  deleteItem: async function(itemId) {
    const item = (await AppraisalItemModel.findById(itemId).exec()).toJSON();
    const period = (await AppraisalPeriodModel.findById(item.periodId).exec()).toJSON();
    if (item.status === 'Finished')
      throw new Error('Finished item cannot be deleted');
    // Check period finished
    if (period.status === 'Finished')
      throw new Error('Finished period items cannot be deleted');
    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted.toJSON();
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