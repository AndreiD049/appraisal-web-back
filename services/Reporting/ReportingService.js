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

const ReportingService = {
  async getReports(user) {
    const userDb = await UserService.getUser(user.id);
    const reports = await ReportsModel.find({
      organizationId: userDb.organization,
    }).select({
      id: 1,
      name: 1,
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
    return newReport.save();
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
    const aggregationBlock = block.aggregation;
    await perform(and([
      validate.isTruthy(aggregationBlock.length, 'Aggregation should be an array'),
      validate.isTruthy((aggregationBlock.length - 1) >= +index , 'Aggregation index out of bounds'),
    ]));
    // concrete pipeline stage
    const step = aggregationBlock[+index];
    if (!traverse.has(step, keys)) {
      throw new Error(`Path is invalid - ${keys.join('.')}`);
    }
    traverse.set(step, keys, param.value);
  }

};

module.exports = ReportingService;
