const os = require('os');
const path = require('path');
const fs = require('fs');
const carbone = require('carbone');
const { model } = require('mongoose');
const traverse = require('traverse');
const { ReportTemplateModel } = require('../../models/Reporting');
const UserService = require('../UserService');
const { perform, validate, and } = require('../validators');
const { REPORT_TEMPLATES } = require('../../config/constants').securities;

const ReportTemplateService = {
  /**
   * @param {string} name
   * @param {any} user
   * Get template by name.
   * Search the template in current user's organization/
   */
  async getTemplate(id, user) {
    const dbUser = await UserService.getUser(user.id);
    const template = await ReportTemplateModel.findOne({
      _id: id,
      organizationId: dbUser.organization.id,
    }).populate([
      { path: 'createdUser modifiedUser', select: 'username' },
      { path: 'organizationId', select: 'name' },
    ]);
    return template;
  },

  /**
   * @param {string} name
   * @param {any} user
   * Get template by name.
   * Search the template in current user's organization/
   * Because this is an overview, do not send the template
   */
  async getTemplates(user) {
    const dbUser = await UserService.getUser(user.id);
    const templates = await ReportTemplateModel.find({
      organizationId: dbUser.organization.id,
    })
      .populate([
        {
          path: 'createdUser',
          select: 'username',
        },
      ])
      .select({
        template: 0,
      });
    return templates;
  },

  /**
   * Sample aggregation
   [
    {
      "name": "test",
      "view": "AppraisalItemsView",
      "aggregation": [
        {
          "$match": {
            "type": "Planned"
          }
        }
      ]
    }
  ]
   * @param {*} template 
   * @param {*} user 
   */
  async addTemplate(template, user) {
    const dbUser = await UserService.getUser(user.id);
    const dbTemplate = {
      ...template,
      organizationId: dbUser.organization.id,
      createdUser: dbUser.id,
    };
    const result = await ReportTemplateModel.create(dbTemplate);
    return result;
  },

  /**
   * @param {*} id template id
   * @param {*} template updated template
   * @param {*} user requesting user
   */
  async updateTemplate(id, template, user) {
    const validations = and([
      validate.userAuthorized(user, REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.update),
    ]);
    await perform(validations);
    const result = await ReportTemplateModel.findByIdAndUpdate(
      id,
      {
        ...template,
        modifiedUser: user.id,
      },
      { new: true },
    ).populate([
      { path: 'createdUser modifiedUser', select: 'username' },
      { path: 'organizationId', select: 'name' },
    ]);
    return result;
  },

  async deleteTemplate(id, user) {
    const validations = and([
      validate.userAuthorized(user, REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.delete),
    ]);
    await perform(validations);
    return ReportTemplateModel.findOneAndDelete(id);
  },

  /**
   * Parameters are returned in following format
   * [
   *  {
   *    name: "string",
   *    parameters: [
   *      "path1",
   *      "path2",
   *      ...
   *    ]
   *  },
   *  ...
   * ]
   * @param {string} id
   * @param {any} user
   */
  async getTempalteParameters(id, user) {
    const validSteps = ['$match', '$lookup'];
    const template = await this.getTemplate(id, user);
    if (!template) return null;
    const aggregation = JSON.parse(template.aggregation);
    const result = [];
    aggregation.forEach((a) => {
      const block = {
        name: a.name,
        paths: null,
      };

      block.paths = traverse
        .paths(a.aggregation)
        .filter((s) => s.length > 2 && validSteps.indexOf(s[1]) !== -1)
        .map((p) => p.join('.'));
      result.push(block);
    });
    return result;
  },

  async processAggregation(aggregation, user) {
    await validate.isAggregationValid(aggregation)();
    const aggr = JSON.parse(
      (await this.aggregationPreProcess(aggregation)).replace(
        '"$__REQUSER__$"',
        `{ "$toObjectId": "${user.id}"}`,
      ),
    );
    const data = {};
    const validations = aggr.map((a) =>
      perform(and([validate.viewExists(a.view), validate.viewName(a.view)])),
    );
    await Promise.all(validations);
    const aggregationResult = aggr.map(async (block) => {
      data[block.name] = await model(block.view).aggregate(block.aggregation);
    });
    await Promise.all(aggregationResult);
    return data;
  },

  /**
   * Insert a limit step in the aggregation
   * @param {String} aggregation
   * @param {Number} limit
   */
  async sampleAggregtion(aggregation, limit) {
    await perform(validate.isAggregationValid(aggregation));
    const aggregationJSON = JSON.parse(aggregation);
    aggregationJSON.forEach((a, idx) => {
      aggregationJSON[idx].aggregation = a.aggregation.concat({
        $limit: limit,
      });
    });
    return JSON.stringify(aggregationJSON);
  },

  /**
   * Generate the report and return the Blob
   * @param {Object} data
   * @param {Object} user
   */
  async render(data, report, user) {
    const templateBuffer = (
      await ReportTemplateModel.findById(report.template.id, {
        template: 1,
      })
    ).template;
    const finalPath = path.join(os.tmpdir(), user.id, 'templates', report.template.filename);
    fs.mkdirSync(path.join(os.tmpdir(), user.id, 'templates'), { recursive: true });
    fs.writeFileSync(finalPath, templateBuffer);
    return new Promise((res, rej) => {
      carbone.render(finalPath, data, (err, result) => {
        if (err) return rej(err);
        return res(result);
      });
    });
  },

  /**
   * Generate a report from buffer template
   * @param {any} data
   * @param {Buffer} buffer
   * @param {any} user
   */
  async renderFromBuf(data, buffer, user, filename = 'buffer-template') {
    const finalPathFolder = path.join(os.tmpdir(), user.id, 'templates');
    // Only create folder if doesn't already exist
    if (!fs.existsSync(finalPathFolder)) fs.mkdirSync(finalPathFolder, { recursive: true });
    const finalPath = path.join(finalPathFolder, filename);
    fs.writeFileSync(finalPath, buffer);
    return new Promise((res, rej) => {
      carbone.render(finalPath, data, (err, result) => {
        if (err) return rej(err);
        return res(result);
      });
    });
  },

  // Render a report from a file template
  async renderFromFile(data, templatePath, filename = 'report') {
    return new Promise((res, rej) => {
      carbone.render(templatePath, data, (err, result) => {
        if (err) return rej(err);
        return res(result);
      });
    })
  },

  /**
   * Modify the aggregation before applying it to the database
   * @param {string} aggregation
   */
  async aggregationPreProcess(aggregation) {
    const aggregationJSON = JSON.parse(aggregation);
    // Add a field for the requesting user
    const fieldsStep = {
      $addFields: {
        REQUSER: '$__REQUSER__$',
      },
    };
    // populate REQUSER with user info
    const lookupStep = {
      $lookup: {
        from: 'users',
        localField: 'REQUSER',
        foreignField: '_id',
        as: 'REQUSER',
      },
    };
    const firstElement = {
      $addFields: {
        REQUSER: {
          $first: '$REQUSER',
        },
      },
    };
    aggregationJSON.forEach((step) => {
      const s = step;
      s.aggregation = [].concat(fieldsStep, lookupStep, firstElement, step.aggregation);
    });
    return JSON.stringify(aggregationJSON);
  },
};

module.exports = ReportTemplateService;
