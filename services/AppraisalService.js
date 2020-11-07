const AppraisalPeriodModel = require('../models/AppraisalPeriodModel');
const { AppraisalItemModel } = require('../models/AppraisalItemModel');
const UserService = require('./UserService');
const UserModel = require('../models/UserModel');

const validations = {
  validateItem(item) {
    if (!item) {
      throw new Error('Item is not valid');
    }
  },
  validateUser(user) {
    if (!user.id) {
      throw new Error('User has no id');
    }
    if (!user.organization) {
      throw new Error('User has no organization');
    }
    if (!user.role) {
      throw new Error('User has no role');
    }
  },
  validatePeriodActive(period, message) {
    if (period.status === 'Finished') throw new Error(message || `Invalid period status - ${period.status}`);
  },
  async validateItemUpdate(item, update) {
    if (item.relatedItemId && (!update.content || update.content !== item.content)) throw new Error('Item has related entries. Cannot update.');
    const period = await AppraisalPeriodModel.findById(item.periodId);
    if (period) {
      this.validatePeriodActive(period);
    }
    this.validateItemNotFinished(item);
  },
  async validateItemDelete(item) {
    this.validateItem(item);
    if (item.relatedItemId) throw new Error('Item has related entries. Cannot delete.');
    const period = await AppraisalPeriodModel.findById(item.periodId);
    if (period) {
      this.validatePeriodActive(period);
    }
    this.validateItemNotFinished(item);
  },
  async validateItemFinish(item) {
    const period = await AppraisalPeriodModel.findById(item.periodId);
    this.validatePeriodActive(period);
    if (item.status !== 'Active') {
      throw new Error(`Item type invalid - ${item.type}`);
    }
  },
  validateItemNotFinished(item) {
    if (item.status === 'Finished') throw new Error('Error: item is finished');
  },
  validateItemTypeIsNot(item, type) {
    if (item.type === type) throw new Error(`Error: item.type is ${type}`);
  },
  async validateUserInTeam(user, teamMember) {
    if (!(await UserService.isTeamMember(user, teamMember.id))) throw new Error('Cannot update. User is not a member of my teams.');
  },
};

const AppraisalService = {
  async getPeriodsOverview(user) {
    if (!user || !user.id) return null;
    /*
     * Get all periods that are:
     *    1. Finished and user is a part of them
     *    2. Active and have the same OrganizationId as one of the user's organizations
     */
    const dbUser = await UserModel.findById(user.id);
    const docs = await AppraisalPeriodModel.find().or([
      { users: dbUser.id, status: 'Finished' },
      { status: 'Active', organizationId: dbUser.organization },
    ]).populate({ path: 'createdUser', select: 'username' });
    return docs;
  },

  /**
   *
   * @param {object} user
   * Returns Orphan items for the user.
   */
  async getOrphanItems(user) {
    // invalid user, or no organization
    if (!user || !user.organization) {
      return [];
    }
    const result = await AppraisalItemModel.find({
      user: user.id,
      periodId: null,
    });
    return result;
  },

  async getPeriodById(id) {
    const period = await AppraisalPeriodModel.findById(id).exec();
    return period;
  },

  async createPeriod(user, period) {
    const newPeriod = new AppraisalPeriodModel({ ...period });
    return await newPeriod.save();
  },

  async updatePeriod(periodId, period) {
    const newPeriod = await AppraisalPeriodModel.findByIdAndUpdate(periodId, period, { new: true });
    return newPeriod;
  },

  /**
   * Adding orphan items to period when user first time enters an appraisal period.
   * An orphan item is an item:
   *  - that has periodId eq to null
   * Orphan items are created from Planned items when a period is finished
   */
  async addOrphanUserItemsToPeriod(periodId, userId) {
    const period = await this.getPeriodById(periodId);
    const orphans = await AppraisalItemModel.find({
      user: userId,
      periodId: null,
    });
    const promises = orphans.map(async (orphan) => {
      // Set the periodId
      orphan.periodId = period.id;
      await orphan.save();
    });

    await Promise.all(promises);
  },

  async getUserItemsByPeriodId(periodId, userId) {
    // Get items of current period/User
    const items = await AppraisalItemModel.find({
      periodId,
      user: userId,
    }).exec();

    return items;
  },

  async getItemsByPeriodId(id) {
    // Get items of current period/User
    const items = await AppraisalItemModel.find({
      periodId: id,
    }).exec();

    return items;
  },

  async getItemById(itemId) {
    const item = await AppraisalItemModel.findById(itemId).exec();
    return item;
  },

  /**
   * Create a copy of the item and return it's document
   */
  async copyItem(oldItem, session = null) {
    const copy = new AppraisalItemModel(oldItem.toJSON());
    // Delete the id's
    delete copy._id;
    delete copy.id;
    const result = await copy.save({ session });
    return result;
  },

  /*
   *  Validation rules:
   *    1. I cannot insert the item if the period has status Finished
   *    2. I cannot insert the item if the body is not valid
   *    3. I cannot insert an item of Training Suggested for myself
   */
  async addItemToPeriod(periodId, item, user) {
    const period = await this.getPeriodById(periodId);
    validations.validatePeriodActive(period);
    validations.validateItemTypeIsNot(item, 'Training_Suggested');
    const model = new AppraisalItemModel({
      type: item.type,
      status: item.status,
      content: item.content,
      periodId,
      organizationId: period.organizationId,
      user: user.id,
      createdUser: user.id,
    });
    return await model.save();
  },

  async addItem(item, user) {
    validations.validateUser(user);
    const model = new AppraisalItemModel({
      ...item,
      organizationId: user.organization.id ? user.organization.id : user.organization,
      user: user.id,
      createdUser: user.id,
    });
    return await model.save();
  },

  // Add item to another user
  // Check if user is a team member
  async addItemToPeriodOfMember(periodId, item, user) {
    // Get the user to whom we add the item
    const subject_user = await UserService.getUser(item.user);
    const period = await this.getPeriodById(periodId);
    validations.validatePeriodActive(period);
    await validations.validateUserInTeam(user, subject_user);
    const model = new AppraisalItemModel({
      type: item.type,
      status: item.status,
      content: item.content,
      periodId,
      organizationId: period.organizationId,
      user: subject_user.id,
      createdUser: user.id,
    });
    return await model.save();
  },

  /*
   * Validation:
   * 1. I cannot update a finished item
   * 2. I cannot update an item whose period is already finished
   */
  async updateItem(itemId, update) {
    const item = await AppraisalItemModel.findById(itemId);

    await validations.validateItemUpdate(item, update);
    validations.validateItemTypeIsNot(item, 'Training_Suggested');

    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, update, { new: true });
    return updated;
  },

  // Update item of another user
  async updateItemOfMember(itemId, update, user) {
    const item = await AppraisalItemModel.findById(itemId);
    const subject_user = await UserService.getUser(item.user);

    await validations.validateItemUpdate(item, update);
    await validations.validateUserInTeam(user, subject_user);

    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, update, { new: true });
    return updated;
  },

  /*
   * Validation:
   * 1. I cannot delete an item that is already finished
   * 2. I cannot delete an item whose period is already finished
   * 3. I cannot delete an Training suggested item of myself
   */
  async deleteItem(itemId) {
    const item = await AppraisalItemModel.findById(itemId);

    await validations.validateItemDelete(item);
    validations.validateItemTypeIsNot(item, 'Training_Suggested');

    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted;
  },

  // Delete item of another user
  async deleteItemOfMember(itemId, user) {
    const item = await AppraisalItemModel.findById(itemId);
    const subject_user = await UserService.getUser(item.user);

    await validations.validateItemDelete(item);
    await validations.validateUserInTeam(user, subject_user);

    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted;
  },

  /**
   * Finishing the item at period finishing.
   * Error conditions:
   *  * item status is not active
   * Rules:
   *  1. If item type is not Planned, just set the status to Finished
   *  2. If item type is Planned, create a copy of the item that has:
   *    - periodId eq to null
   *    - relatedItemId eq to original item _id
   *    After, set the original item to Finished
   */
  async finishItem(item, session = null) {
    const itemDb = await AppraisalItemModel.findById(item.id);
    await validations.validateItemFinish(itemDb);
    if (itemDb.type === 'Planned') {
      const copy = await this.copyItem(itemDb, session);
      copy.periodId = null;
      copy.relatedItemId = itemDb.id;
      copy.save({ session });
    }

    itemDb.status = 'Finished';
    itemDb.save({ session });
  },

  async finishPeriod(periodId, user) {
    // Create a session to use in transaction
    const session = await AppraisalPeriodModel.startSession();
    const transaction = await session.withTransaction(async () => {
      const period = await AppraisalPeriodModel.findById(periodId).session(session);
      period.status = 'Finished';
      // Find all items related to this period
      const items = await this.getItemsByPeriodId(period.id);
      const modifications = items.map((i) => this.finishItem(i, session));
      await Promise.all(modifications);

      await period.save();
      return true;
    });
    // return true or flase whether the transaction was successfull
    return transaction.result.ok === 1;
  },
};

module.exports = AppraisalService;
