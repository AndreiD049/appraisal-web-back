const { OrganizationModel } = require('../../models/OrganizationModel');
const { UserModel } = require('../../models/UserModel');
const { AppraisalPeriodModel } = require('../../models/AppraisalPeriodModel');
const { AppraisalItemModel } = require('../../models/AppraisalItemModel');

module.exports = {
  async createPeriod(
    name,
    organizationId = null,
    createdUser = null,
    status = 'Active',
    users = [],
  ) {
    const org = organizationId || (await OrganizationModel.findOne({})).id;
    const user = createdUser || (await UserModel.findOne({})).id;
    return AppraisalPeriodModel.create({
      name,
      status,
      organizationId: org,
      createdUser: user,
      users,
    });
  },

  async clearPeriods() {
    return AppraisalPeriodModel.deleteMany({});
  },

  async createAppraisalItem(
    content,
    userId,
    type = 'Achieved',
    status = 'Active',
    periodId = null,
    organizationId = null,
    createdUser = null,
    relatedItemId = null,
  ) {
    const org = organizationId || (await OrganizationModel.findOne({})).id;
    const usr = userId || (await UserModel.findOne({})).id;
    const p = periodId;
    const createdUsr = createdUser || usr;

    return AppraisalItemModel.create({
      type,
      status,
      content,
      periodId: p,
      organizationId: org,
      user: usr,
      createdUser: createdUsr,
      relatedItemId,
    });
  },

  async clearItems() {
    return AppraisalItemModel.deleteMany({});
  },

  getRandomInt(min, max) {
    const minInt = Math.ceil(min);
    const maxInt = Math.floor(max);
    return Math.floor(Math.random() * (maxInt - minInt)) + minInt;
  },
};
