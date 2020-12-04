const os = require('os');
const path = require('path');
const fs = require('fs');
const carbone = require('carbone');
const { model, Types, isValidObjectId } = require('mongoose');
const traverse = require('traverse');
const { ReportTemplateModel } = require('../../models/Reporting');
const UserService = require('../UserService');
const { perform, validate, and } = require('../validators');

const ReportTemplateService = {
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
      createdDate: new Date(),
    };
    const result = await ReportTemplateModel.create(dbTemplate);
    return result;
  },

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
    });
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
    }).select({
      "template": 0,
    });
    return templates;
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
    const validSteps = ['$match'];
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
        .filter(s => s.length > 2 && validSteps.indexOf(s[1]) !== -1)
        .map(p => p.join('.'));
      result.push(block);
    })
    return result;
  },

  async processAggregationObjectIds(object) {
    if (object instanceof Array) {
      return Promise.all(object.map((o) => this.processAggregationObjectIds(o)));
    }
    const result = { ...object };
    const keys = Object.keys(result);
    // loop each key and recurse if value is an object
    const calls = keys.map(async (key) => {
      if (result[key] instanceof Object) {
        result[key] = await this.processAggregationObjectIds(result[key]);
      }
      if (isValidObjectId(result[key])) {
        console.log("key", key);
        result[key] = new Types.ObjectId(result[key]);
      }
    });
    await Promise.all(calls);
    return result;
  },

  async processAggregation(aggregation, user) {
    // const aggr = await this.processAggregationObjectIds(JSON.parse(aggregation.replace('$__REQUSER__$', user.id)));
    const aggr = JSON.parse(
      (await this.aggregationPreProcess(aggregation))
        .replace('"$__REQUSER__$"', `{ "$toObjectId": "${user.id}"}`)
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

  async formatData(data) {
    const copy = data;
    if (copy instanceof Types.ObjectId) {
      return data.toString();
    }
    if (copy instanceof Date) {
      return data.toISOString();
    }
    if (Array.isArray(copy)) {
      return Promise.all(copy.map(async (d) => this.formatData(d)));
    }
    if (copy && copy.constructor && copy.constructor.name === 'Object') {
      const keys = Object.keys(copy);
      const calls = keys.map(async (key) => {
        copy[key] = await this.formatData(copy[key]);
      });
      await Promise.all(calls);
    }
    return copy;
  },
  /**
   * @param {any} data
   * Given a collection of items, will recursively slice the data
   * to contain maximum 2 items per collection
   */
  async sampleData(data) {
    let copy = data;
    // if data is an object
    // loop through properties and apply function recursively
    if (Array.isArray(data)) {
      copy = await Promise.all(data.slice(0, 2).map(async (d) => this.sampleData(d)));
    } else if (data && data.constructor && data.constructor.name === 'Object') {
      copy = { ...data };
      const keys = Object.keys(copy);
      const calls = keys.map(async (key) => {
        copy[key] = await this.sampleData(copy[key]);
      });
      await Promise.all(calls);
    }
    return copy;
  },

  /**
   * Generate the report and return the Blob
   * @param {Object} data 
   * @param {Object} user 
   */
  async render(data, report, user) {
    const templateBuffer = (await ReportTemplateModel.findById(report.template.id, {
      template: 1
    })).template;
    const finalPath = path.join(os.tmpdir(), user.id, 'templates', report.template.filename);
    fs.mkdirSync(path.join(os.tmpdir(), user.id, 'templates'), { recursive: true });
    fs.writeFileSync(finalPath, templateBuffer);
    return new Promise((res, rej) => {
      carbone.render(finalPath, data, (err, result) => {
        if (err) return rej(err);
        return res(result);
      })
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
        "REQUSER": "$__REQUSER__$",
      }
    }
    // populate REQUSER with user info
    const lookupStep = {
      $lookup: {
        from: 'users',
        localField: 'REQUSER',
        foreignField: '_id',
        as: 'REQUSER'
      }
    }
    const firstElement = {
      $addFields: {
        "REQUSER": {
          $first: "$REQUSER",
        }
      }
    }
    aggregationJSON.forEach(step => {
      const s = step;
      s.aggregation = [].concat(fieldsStep, lookupStep, firstElement, step.aggregation);
    })
    return JSON.stringify(aggregationJSON);
  },
};

module.exports = ReportTemplateService;
