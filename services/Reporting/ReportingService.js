/**
 * @typedef {{
 *  name: String,
 *  view, String,
 *  aggregation: [Object]
 * }} Aggregation
 */

const traverse = require('traverse');
const ReportTemplateService = require('./ReportTemplateService');
const { ReportsModel } = require('../../models/Reporting');
const UserService = require('../UserService');
const { validate, perform, and } = require('../validators');
const { REPORTS } = require('../../config/constants').securities;

const ReportingService = {
  async getReports(user) {
    const userDb = await UserService.getUser(user.id);
    const reports = await ReportsModel.find({
      organizationId: userDb.organization,
    }).populate([
      { path: 'createdUser', select: 'username' },
      { path: 'organizationId', select: 'name' }
    ]).select({
      id: 1,
      name: 1,
      description: 1,
      createdUser: 1,
      createdDate: 1,
      organizationId: 1,
      parameters: 1,
    });
    return reports;
  },

  async getReport(user, id) {
    const userDb = await UserService.getUser(user.id);
    const report = await ReportsModel.findOne({
      _id: id,
      organizationId: userDb.organization._id,
    }).populate({
      path: 'template',
      select: {
        template: 0,
      }
    });
    return report;
  },

  async addReport(user, report) {
    const userDb = await UserService.getUser(user.id);
    const newReport = new ReportsModel(report);
    newReport.organizationId = userDb.organization;
    newReport.createdUser = user.id;
    return newReport.save();
  },

  /**
   * @param {string} id 
   * @param {any} report Report updated body
   * @param {any} user 
   */
  async updateReport(id, report, user) {
    await perform(validate.userAuthorized(user, REPORTS.code, REPORTS.grants.update));
    const result = await ReportsModel.findByIdAndUpdate(id, {
      ...report,
      modifiedUser: user.id,
    }, { new: true }).populate({
      path: 'template',
      select: {
        template: 0,
      }
    });
    return result;
  },

  /**
   * Delete a report
   * @param {*} id 
   * @param {*} user 
   */
  async deleteReport(id, user) {
    await perform(validate.userAuthorized(user, REPORTS.code, REPORTS.grants.delete));
    return ReportsModel.findOneAndDelete(id);
  },

  /**
   * Generate a report file according to the parameters inserted by user:
   * 1. Get the report by id
   *  - if report doesn't exist, abort
   * 2. Get the aggregation of the report template
   * 3. Substitute the parameters to the tempalte aggregation
   * 4. Process the aggregation and retrieve data
   * 5. Generate the report according the the aggregated data
   * 6. Return the report blob
   * @param {any} user - requesting user
   * @param {String} id - report id
   * @param {[{name: String, path: String, value: String}]} params - params inserted by user
   * @returns {Promise<Blob>} generated file
   */
  async generateReport(user, id, params) {
   // 1. Get the report by id
   //  - if report doesn't exist, abort
    const report = await this.getReport(user, id);
    await perform(validate.isTruthy(report, 'Report doesn\'t exists.'));
   // 2. Get the aggregation of the report template
    const { aggregation } = report.template;
    const aggregationJSON = JSON.parse(aggregation);
   // 3. Substitute the parameters to the tempalte aggregation
    await this.substituteParams(aggregationJSON, params);
    const data = await ReportTemplateService.processAggregation(JSON.stringify(aggregationJSON), user);
    const result = await ReportTemplateService.render(data, report, user);
    return result;
  },

  /**
   * 1. For each param
   *  - if param value not empty:
   *    # replace the value in aggregation with param value
   * 2. Return aggregation
   * @param {Aggregation} aggregation 
   * @param {[{name: String, path: String, value: String}]} params - params inserted by user
   * @returns {Aggregation} adjusted aggregation
   */
  async substituteParams(aggregation, params) {
    const calls = params.map(async (param) => {
      if (param.value) {
        await this.substituteParam(aggregation, param);
      }
    });
    await Promise.all(calls);
  },

  /**
   * Replace the param value in the aggregation (in place):
   * Preconditions: param value is not empty
   * 1. Split the param path into tokens
   *  - 1st token is the name of aggregation
   *    - get the aggregation object with that name
   *    - check if such name exists
   *  - 2nd token is the index of the validation step (validate type)
   *    - Check if index is numeric and is integer
   *  - rest of the tokens are object keys of the aggregations
   * 2. Once all tokens were applied, replace the aggregation value with param value
   * @param {Aggregation} aggregation 
   * @param {{name: String, path: String, value: String}} param - params inserted by user
   */
  async substituteParam(aggregation, param) {
    const [name, index, ...keys] = param.path.split('.');
    const blockIndex = aggregation.map(a => a.name).indexOf(name)
    await perform(and([
      validate.isTruthy(blockIndex !== -1, `There is no such block in the aggregation ${name}`),
      validate.isTruthy(Number.isInteger(+index), `Path index is not valid - ${param.path}`),
    ]));
    const block = aggregation[blockIndex];
    const blockAggregation = block.aggregation;
    await perform(and([
      validate.isTruthy(blockAggregation.length, 'Aggregation should be an array'),
      validate.isTruthy((blockAggregation.length - 1) >= +index , 'Aggregation index out of bounds'),
    ]));
    // concrete pipeline stage
    const step = blockAggregation[+index];
    if (!traverse.has(step, keys)) {
      throw new Error(`Path is invalid - ${keys.join('.')}`);
    }
    const value = await this.getParamValue(param);
    traverse.set(step, keys, value);
  },

  /**
   * Returns either a string or an object if the param is an object
   * @param {{name: String, path: String, value: String}} param - params inserted by user
   */
  async getParamValue(param) {
    try {
      return JSON.parse(param.value);
    } catch (err) {
      return param.value;
    }
  },

};

module.exports = ReportingService;
