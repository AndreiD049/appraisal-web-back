const reportsRouter = require('express').Router();
const multer = require('multer');
const { ReportingService } = require('../../../services/Reporting');
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
