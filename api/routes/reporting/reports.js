const reportsRouter = require('express').Router();
const multer = require('multer');
const { ReportingService, ReportTemplateService } = require('../../../services/Reporting');
const AppraisalService = require('../../../services/AppraisalService');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { REPORTS } = require('../../../config/constants').securities;

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * TODO: add validation for reports
 */
reportsRouter.get('/', AuthorizeReq(REPORTS.code, REPORTS.grants.read), async (req, res, next) => {
  try {
    const reports = await ReportingService.getReports(req.user);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

/**
 * TODO: add validation for reports
 */
reportsRouter.get(
  '/:id',
  AuthorizeReq(REPORTS.code, REPORTS.grants.read),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const report = await ReportingService.getReport(req.user, id);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Create a new report
 */
reportsRouter.post(
  '/',
  AuthorizeReq(REPORTS.code, REPORTS.grants.create),
  upload.any(),
  async (req, res, next) => {
    try {
      const { body } = req;
      body.parameters = JSON.parse(body.parameters);
      const report = await ReportingService.addReport(req.user, body);
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Generate the report
 * @returns report buffer
 */
reportsRouter.post(
  '/:id/generate',
  AuthorizeReq(REPORTS.code, REPORTS.grants.read),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const params = req.body;
      const report = await ReportingService.generateReport(req.user, id, params);
      res.end(report);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Generate appraisal report.
 * Data provided:
 * - dateFrom: Date
 * - dateTo: Date
 * - periods: [String] Period IDs
 */
reportsRouter.post('/appraisal-report', async (req, res, next) => {
  // Verify if at least one parameter was provided
  const { body } = req;
  if (req.user || body.dateFrom || body.dateTo || (Array.isArray(body.periods && body.periods.length))) {
    const dateFrom = body.dateFrom ? new Date(body.dateFrom) : null; 
    const dateTo = body.dateTo ? new Date(body.dateTo) : null; 
    const periods = Array.isArray(body.periods) ? body.periods : [];
    // Get an array of period names to display in the report
    const calls = periods.map((p) => AppraisalService.getPeriodById(p));
    const periodStrings = (await Promise.all(calls)).map((p) => p.name);
    // if so, create a mongodb aggregation with the parameters passed
    const data = await ReportingService.getAppraisalReportData(req.user, dateFrom, dateTo, periods);
    // if data was found generate a report using carbone
    if (Array.isArray(data) && data.length) {
      res.end(await ReportTemplateService.renderFromFile({
        data,
        dateFrom,
        dateTo,
        periods: periodStrings.join(', '),
      }, './api/routes/reporting/templates/appraisal.xlsx', 'appraisal.xlsx'));
    } else {
      res.status(204).json({ error: 'No data available for provided filters' });
    }
    // if no data or empty dataset, return error to the user
  } else {
    res.status(400).json({ error: 'Invalid parameters provided' });
  }
});

reportsRouter.put(
  '/:id',
  AuthorizeReq(REPORTS.code, REPORTS.grants.update),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = req.body;
      res.json(await ReportingService.updateReport(id, updated, req.user));
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.delete(
  '/:id',
  AuthorizeReq(REPORTS.code, REPORTS.grants.delete),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await ReportingService.deleteReport(id, req.user);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

module.exports = reportsRouter;
