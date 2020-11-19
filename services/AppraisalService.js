const { AppraisalPeriodModel, UserPeriodModel } = require('../models/AppraisalPeriodModel');
const { AppraisalItemModel } = require('../models/AppraisalItemModel');
const UserService = require('./UserService');
const { UserModel } = require('../models/UserModel');
const {
  and, or, not, validate, perform,
} = require('./validators');
const { securities } = require('../config/constants');

const AD = securities.APPRAISAL_DETAILS;
const ADO = securities.APPRAISAL_DETAILS_OTHER;

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
      { 'users._id': dbUser.id, status: 'Finished' },
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
    return newPeriod.save();
  },

  async updatePeriod(periodId, period) {
    const newPeriod = await AppraisalPeriodModel.findByIdAndUpdate(periodId, period, { new: true });
    return newPeriod;
  },

  async toggleLockPeriod(periodId, userId, reqUser) {
    const [period, userDb, reqUserDb] = await Promise.all([
      AppraisalService.getPeriodById(periodId),
      UserService.getUser(userId),
      UserService.getUser(reqUser.id),
    ]);

    const validations = and([
      validate.periodExists(period),
      validate.userExists(userDb),
      validate.userExists(reqUserDb),
      not(validate.periodStatus(period, 'Finished')),
      validate.userAuthorized(reqUserDb, ADO.code, ADO.grants.toggleLock),
    ]);

    await validations();

    let userPeriod = period.users.find((u) => String(u._id) === String(userId));
    // If period doesn't exist, add it
    if (!userPeriod) {
      const periodUpd = await this.addUserToPeriod(period.id, userDb);
      userPeriod = periodUpd.users.find((u) => String(u._id) === String(userId));
    }
    userPeriod.locked = !userPeriod.locked;
    return AppraisalPeriodModel.findByIdAndUpdate(periodId, {
      users: period.users.filter((up) => (String(up._id) !== userId)).concat(userPeriod),
    }, { new: true });
  },

  async addUserToPeriod(periodId, user) {
    const userId = user?.id || user?._id;
    if (userId) {
      const newUser = new UserPeriodModel({
        _id: userId,
        locked: false,
      });
      const periodDb = await AppraisalPeriodModel.findById(periodId);
      // Check if doens't exist already
      const userPeriod = periodDb.users.find((u) => String(u._id) === String(userId));
      if (!userPeriod) {
        const users = periodDb.users.slice();
        periodDb.users = users.concat(newUser);
        return periodDb.save();
      }
    }
    return null;
  },

  /**
   * Adding orphan items to period when user first time enters an appraisal period.
   * An orphan item is an item:
   *  - that has periodId eq to null
   * Orphan items are created from Planned items when a period is finished
   */
  async addOrphanUserItemsToPeriod(periodId, userId) {
    const period = await this.getPeriodById(periodId);

    // Do not do anything if period is already finished or locked
    const validations = await perform(not(or([
      validate.periodStatus(period, 'Finished'),
      validate.periodLocked(period, userId),
    ])), false);
    // await not(validate.periodStatus(period, 'Finished'))();
    if (validations.result) {
      const orphans = await AppraisalItemModel.find({
        user: userId,
        periodId: null,
      });
      const promises = orphans.map(async (orphan) => AppraisalItemModel.findByIdAndUpdate(
        orphan.id, {
          periodId: period.id,
        },
      ));

      await Promise.all(promises);
    }
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
    const userDb = await UserService.getUser(user.id);

    const validations = and([
      validate.userExists(userDb),
      validate.itemExists(item),
      or([
        validate.periodStatus(period, 'Finished'),
        not(validate.periodLocked(period, userDb.id), 'Cannot add items to locked period'),
      ]),
      validate.periodExists(period),
      not(validate.itemType(item, 'Training_Suggested')),
      validate.itemSameUser(item, userDb),
      or([
        and([
          not(validate.periodStatus(period, 'Finished')),
          validate.userAuthorized(userDb, AD.code, AD.grants.create),
        ]),
        and([
          validate.periodStatus(period, 'Finished'),
          validate.userAuthorized(userDb, AD.code, AD.grants.createFinished),
        ]),
      ]),
    ]);
    await perform(validations);

    const document = await new AppraisalItemModel({
      type: item.type,
      status: item.status,
      content: item.content,
      periodId,
      organizationId: period.organizationId,
      user: user.id,
      createdUser: user.id,
    }).save();

    if (period.status === 'Finished') return this.finishItem(document);
    return document;
  },

  async addItem(item, user) {
    const model = new AppraisalItemModel({
      ...item,
      organizationId: user.organization.id ? user.organization.id : user.organization,
      user: user.id,
      createdUser: user.id,
    });
    return model.save();
  },

  // Add item to another user
  // Check if user is a team member
  async addItemToPeriodOfMember(periodId, item, user) {
    // Get the user to whom we add the item
    const [userFrom, userTo, period] = await Promise.all([
      UserService.getUser(user.id),
      UserService.getUser(item.user),
      this.getPeriodById(periodId),
    ]);

    const validations = and([
      validate.itemExists(item),
      validate.periodExists(period),
      not(validate.itemSameUser(item, userFrom)),
      validate.userInTeam(userFrom, userTo),
      or([
        and([
          not(validate.periodStatus(period, 'Finished')),
          validate.userAuthorized(userFrom, ADO.code, ADO.grants.create),
        ]),
        and([
          validate.periodStatus(period, 'Finished'),
          validate.userAuthorized(userFrom, ADO.code, ADO.grants.createFinished),
        ]),
      ]),
    ]);
    await perform(validations);

    const document = await new AppraisalItemModel({
      type: item.type,
      status: item.status,
      content: item.content,
      periodId,
      organizationId: period.organizationId,
      user: userTo.id,
      createdUser: user.id,
    }).save();
    if (period.status === 'Finished') return this.finishItem(document);
    return document;
  },

  /*
   * Validation:
   * 1. I cannot update a finished item
   * 2. I cannot update an item whose period is already finished
   */
  async updateItem(itemId, update, user) {
    const item = await AppraisalItemModel.findById(itemId);
    const period = await this.getPeriodById(item?.periodId);
    const userDb = await UserService.getUser(user.id);

    const prevalidations = validate.itemExists(item);
    await perform(prevalidations);

    const validations = and([
      or([
        not(validate.periodExists(period)),
        validate.periodStatus(period, 'Finished'),
        not(validate.periodLocked(period, userDb.id), 'Cannot update items in a locked period'),
      ]),
      or([
        not(validate.isTruthy(item.relatedItemId)),
        validate.areEqual(update.content, item.content, 'You cannot update an item with related entries'),
      ]),
      not(validate.itemType(item, 'Training_Suggested')),
      or([
        and([
          not(validate.itemStatus(item, 'Finished')),
          validate.userAuthorized(userDb, AD.code, AD.grants.update),
        ]),
        and([
          validate.itemStatus(item, 'Finished'),
          validate.userAuthorized(userDb, AD.code, AD.grants.updateFinished),
        ]),
      ]),
    ]);
    await perform(validations);

    const { status } = item;

    const updateObject = update;
    if (status === 'Finished') {
      // if current item's status is finished, we will first unfinish it
      // This is done to remove all related entries first
      // Also, we delete the status property from the update object,
      // as we will finish the item later
      await this.unFinishItem(item);
      delete updateObject.status;
    }
    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, updateObject, { new: true });
    if (status === 'Finished') await this.finishItem(item);
    return updated;
  },

  // Update item of another user
  async updateItemOfMember(itemId, update, user) {
    const [item, userFrom] = await Promise.all([
      AppraisalItemModel.findById(itemId),
      UserService.getUser(user.id),
    ]);
    const [userTo, period] = await Promise.all([
      UserService.getUser(item?.user),
      this.getPeriodById(item?.periodId),
    ]);

    const prevalidations = and([
      validate.itemExists(item),
      validate.periodExists(period),
    ]);
    await perform(prevalidations);

    const validations = and([
      or([
        not(validate.isTruthy(item?.relatedItemId)),
        validate.areEqual(update.content, item?.content, 'You cannot update an item with related entries'),
      ]),
      not(validate.itemSameUser(item, userFrom)),
      validate.userInTeam(userFrom, userTo),
      or([
        and([
          not(validate.itemStatus(item, 'Finished')),
          validate.userAuthorized(userFrom, ADO.code, ADO.grants.update),
        ]),
        and([
          validate.itemStatus(item, 'Finished'),
          validate.userAuthorized(userFrom, ADO.code, ADO.grants.updateFinished),
        ]),
      ]),
    ]);
    await perform(validations);

    const { status } = item;
    const updateObject = update;
    if (status === 'Finished') {
      // if current item's status is finished, we will first unfinish it
      // This is done to remove all related entries first
      // Also, we delete the status property from the update object,
      // as we will finish the item later
      await this.unFinishItem(item);
      delete updateObject.status;
    }
    const updated = await AppraisalItemModel.findByIdAndUpdate(itemId, updateObject, { new: true });
    if (status === 'Finished') await this.finishItem(updated);
    return updated;
  },

  /*
   * Validation:
   * 1. I cannot delete an item that is already finished
   * 2. I cannot delete an item whose period is already finished
   * 3. I cannot delete an Training suggested item of myself
   */
  async deleteItem(itemId, user) {
    const item = await AppraisalItemModel.findById(itemId);
    const userDb = await UserService.getUser(user.id);
    const period = await AppraisalService.getPeriodById(item?.periodId);

    const prevalidation = validate.itemExists(item);
    await perform(prevalidation);

    const validations = and([
      not(validate.isTruthy(item.relatedItemId), 'Item has related entries. Can\'t delete'),
      not(validate.itemType(item, 'Training_Suggested')),
      or([
        not(validate.periodExists(period)),
        validate.periodStatus(period, 'Finished'),
        not(validate.periodLocked(period, userDb.id), 'Cannot delete items in a locked period'),
      ]),
      or([
        and([
          not(validate.itemStatus(item, 'Finished')),
          validate.userAuthorized(userDb, AD.code, AD.grants.delete),
        ]),
        and([
          validate.itemStatus(item, 'Finished'),
          validate.userAuthorized(userDb, AD.code, AD.grants.deleteFinished),
        ]),
      ]),
    ]);
    await perform(validations);

    const { status } = item;
    if (status === 'Finished') await this.unFinishItem(item);
    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted;
  },

  // Delete item of another user
  async deleteItemOfMember(itemId, user) {
    const item = await AppraisalItemModel.findById(itemId);
    const userFrom = await UserService.getUser(user.id);
    const userTo = await UserService.getUser(item.user);

    const prevalidation = validate.itemExists(item);
    await perform(prevalidation);

    const validations = and([
      not(validate.isTruthy(item.relatedItemId), 'Item has related entries. Can\'t delete'),
      not(validate.itemSameUser(item, userFrom)),
      validate.userInTeam(userFrom, userTo),
      or([
        and([
          not(validate.itemStatus(item, 'Finished')),
          validate.userAuthorized(userFrom, ADO.code, ADO.grants.delete),
        ]),
        and([
          validate.itemStatus(item, 'Finished'),
          validate.userAuthorized(userFrom, ADO.code, ADO.grants.deleteFinished),
        ]),
      ]),
    ]);
    await perform(validations);

    const { status } = item;
    if (status === 'Finished') await this.unFinishItem(item);
    const deleted = await AppraisalItemModel.findByIdAndDelete(itemId);
    return deleted;
  },

  async deleteRelated(item, session = null) {
    const related = await AppraisalItemModel.find({
      relatedItemId: item.id,
    });
    if (related.length > 0) {
      related.forEach(async (element) => {
        await this.deleteRelated(element, session);
      });
    }
    await AppraisalItemModel.deleteMany({
      relatedItemId: item.id,
    });
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
   * 3. If item is already finished, throw an error and abort transaction
   */
  async finishItem(item, session = null) {
    const itemDb = await AppraisalItemModel.findById(item.id);

    const validations = and([
      not(validate.itemStatus(itemDb, 'Finished')),
      validate.isTruthy(itemDb.periodId, 'Item has no period. Can\'t finish.'),
    ]);
    await perform(validations);

    if (itemDb.type === 'Planned') {
      const copy = await this.copyItem(itemDb, session);
      copy.status = 'Active';
      copy.periodId = null;
      copy.relatedItemId = itemDb.id;
      copy.save({ session });
    }

    itemDb.status = 'Finished';
    return itemDb.save({ session });
  },

  async unFinishItem(item, session = null) {
    let currentSession = session;
    if (!currentSession) currentSession = await AppraisalPeriodModel.startSession();
    const transaction = await currentSession.withTransaction(async () => {
      const itemDb = await AppraisalItemModel.findById(item.id);
      const validations = and([
        validate.itemStatus(itemDb, 'Finished'),
      ]);
      await perform(validations);
      /**
       * if item is 'Planned', we need to find it's related item and delete it
       */
      if (item.type === 'Planned') {
        await this.deleteRelated(itemDb, currentSession);
      }

      itemDb.status = 'Active';
      return itemDb.save({ session: currentSession });
    });
    return transaction.result.ok === 1;
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
