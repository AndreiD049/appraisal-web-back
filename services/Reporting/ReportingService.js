const carbone = require('carbone');
// eslint-disable-next-line import/no-unresolved
const fsPromises = require('fs/promises');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { AppraisalItemModel } = require('../../models/AppraisalItemModel');
const UserService = require('../UserService');

const ReportingService = {
  views: {
    appraisalItems: async (filter) => {
      const items = await AppraisalItemModel.aggregate([
        {
          $lookup: {
            from: 'appraisalperiods',
            localField: 'periodId',
            foreignField: '_id',
            as: 'period',
          },
        },
        {
          $lookup: {
            from: 'appraisalitems',
            localField: 'relatedItemId',
            foreignField: '_id',
            as: 'relatedItem',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdUser',
            foreignField: '_id',
            as: 'createdUser',
          },
        },
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: '_id',
            as: 'organization',
          },
        },
        {
          $match: filter,
        },
        {
          $project: {
            is: 1,
            type: 1,
            status: 1,
            content: 1,
            'user._id': 1,
            'user.teams': 1,
            'user.organizations': 1,
            'user.role': 1,
            'user.username': 1,
            'createdUser.username': 1,
            createdDate: 1,
            'period._id': 1,
            'period.name': 1,
            'period.status': 1,
            'organization._id': 1,
            'organization.name': 1,
          },
        },
        {
          $addFields: {
            test: { $group: { _id: '$user', test: 2 } },
          },
        },
      ]).unwind({ path: '$period', preserveNullAndEmptyArrays: true })
        .unwind({ path: '$user', preserveNullAndEmptyArrays: true })
        .unwind({ path: '$createdUser', preserveNullAndEmptyArrays: true })
        .unwind({ path: '$organization', preserveNullAndEmptyArrays: true })
        .unwind({ path: '$relatedItem', preserveNullAndEmptyArrays: true });
      return items;
    },
  },
  async getAppraisalReport(templatePath, user, f) {
    const data = await this.views.appraisalItems({ });
    console.log(data);
    const result = carbone.render(templatePath, data, (err, result) => {
      if (err) {
        return console.log(err);
      }

      f(result);
    });
  },

  async getAppraisalItemsReport(user) {
    const dbUser = await UserService.getUser(user.id);
    const filters = {
      organizationId: mongoose.Types.ObjectId(dbUser.organization.id),
    };
  },

  async removeUserFile(user) {
    const file = path.join('./temp/', `${user.id}.xlsx`);
    if (fs.existsSync(file)) {
      return fsPromises.unlink(file);
    }
    return null;
  },

  async removeFile(filename) {
    return fsPromises.unlink(filename);
  },

  async cleanTempFolder(folder) {
    if (folder.indexOf('temp') === -1) {
      throw new Error('This is not a temp folder');
    }
    const dir = await fsPromises.readdir(folder);
    const mongoose = require('mongoose');
    for (const file of dir) {
      await this.removeFile(path.join(folder, file));
    }
  },
};

module.exports = ReportingService;
