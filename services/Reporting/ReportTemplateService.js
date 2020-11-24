const { model, Types, isValidObjectId } = require('mongoose');
const { ReportTemplateModel } = require('../../models/Reporting');
const UserService = require('../UserService');
const { perform, validate, and } = require('../validators');

const ReportTemplateService = {
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
  async getTemplate(name, user) {
    const dbUser = await UserService.getUser(user.id);
    const template = await ReportTemplateModel.findOne({
      name,
      organizationId: dbUser.organization.id,
    });
    return template;
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
        result[key] = new Types.ObjectId(result[key]);
      }
    });
    await Promise.all(calls);
    return result;
  },

  async processAggregation(aggregation, user) {
    const aggr = await this.processAggregationObjectIds(JSON.parse(aggregation));
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
};

module.exports = ReportTemplateService;
