const reportingRouter = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const carbone = require('carbone');
const { ReportTemplateService, ReportingService } = require('../../services/Reporting');
const { AuthorizeReq } = require('../../services/AuthorizationService').AuthorizationService;
const { securities } = require('../../config/constants');
const { REPORT_TEMPLATES, REPORTS } = require('../../config/constants').securities;

const storage = multer.memoryStorage();
const upload = multer({ storage });

// before each requestm check if there is a user
reportingRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

/**
 * TODO: add validation for reports
 */
reportingRouter.get(
  '/reports/:id',
  AuthorizeReq('REPORTS', 'read'),
  async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ReportingService.getReport(req.user, id);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

/**
 * TODO: add validation for reports
 */
reportingRouter.get(
  '/reports',
  AuthorizeReq('REPORTS', 'read'),
  async (req, res, next) => {
  try {
    const reports = await ReportingService.getReports(req.user);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

/**
 * Create a new report
 */
reportingRouter.post(
  '/reports',
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
  }
)

reportingRouter.post(
  '/reports/:id/generate',
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
});

reportingRouter.get(
  '/templates/:id',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const {id} = req.params;
      const template = await ReportTemplateService.getTemplate(id, req.user);
      res.json(template);
    } catch (err) {
      next(err);
    }
  }
)

reportingRouter.get(
  '/templates',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const templates = await ReportTemplateService.getTemplates(req.user);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  }
)

/** 
 * Get template parameters.
 * Template parameters are paths to aggregation $match stages
 * When creating the report, user will select the parameters that can be modified.
 */
reportingRouter.get(
  '/templates/:id/parameters',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const {id} = req.params;
      const params = await ReportTemplateService.getTempalteParameters(id, req.user);
      res.json(params);
    } catch (err) {
      next(err);
    }
  }
)

/**
 * Create the report file in the temporary directory
 * Generated from template.
 * Used only as samples
 */
reportingRouter.post(
  '/templates/generate',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.create),
  upload.single('template'),
  async (req, res, next) => {
    try {
      const { body } = req;
      const finalPath = path.join(os.tmpdir(), req.user.id, 'templates', req.file.originalname);
      fs.mkdirSync(path.join(os.tmpdir(), req.user.id, 'templates'), { recursive: true });
      fs.writeFileSync(finalPath, req.file.buffer);
      const { aggregation } = body;
      const data = await ReportTemplateService.processAggregation(aggregation, req.user);
      carbone.render(finalPath, data, { hardRefresh: true }, (err, result) => {
        if (err) return next(err);
        return res.end(result);
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Retrieve sample data
 */
reportingRouter.post(
  '/templates/sample',
  AuthorizeReq(securities.REPORT_TEMPLATES.code, securities.REPORT_TEMPLATES.grants.create),
  async (req, res, next) => {
    try {
      const { aggregation } = req.body;
      const data = await ReportTemplateService.sampleData(
        await ReportTemplateService.formatData(
          await ReportTemplateService.processAggregation(
            aggregation, 
            req.user),
        ),
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Create a new template
 */
reportingRouter.post(
  '/templates',
  AuthorizeReq('REPORT-TEMPLATES', 'create'),
  upload.single('template'),
  async (req, res, next) => {
    try {
      if (!req.file.buffer) {
        throw new Error('File was not uploaded.');
      }
      const { body } = req;
      const template = {
        ...body,
        filename: req.file.originalname,
        template: req.file.buffer,
      };
      const result = await ReportTemplateService.addTemplate(template, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = reportingRouter;
