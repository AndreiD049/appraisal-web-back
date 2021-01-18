const templateRouter = require('express').Router();
const multer = require('multer');
const { ReportTemplateService } = require('../../../services/Reporting');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;
const { REPORT_TEMPLATES } = require('../../../config/constants').securities;

const storage = multer.memoryStorage();
const upload = multer({ storage });

templateRouter.get(
  '/',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const templates = await ReportTemplateService.getTemplates(req.user);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  },
);

templateRouter.get(
  '/:id',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const template = await ReportTemplateService.getTemplate(id, req.user);
      res.json(template);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Create a new template
 */
templateRouter.post(
  '/',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.create),
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

templateRouter.put(
  '/:id',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.update),
  upload.single('template'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const update = req.body;
      if (req.file && req.file.buffer) {
        update.template = req.file.buffer;
      }
      const updated = await ReportTemplateService.updateTemplate(id, update, req.user);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

templateRouter.delete(
  '/:id',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.delete),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await ReportTemplateService.deleteTemplate(id, req.user);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Get template parameters.
 * Template parameters are paths to aggregation $match stages
 * When creating the report, user will select the parameters that can be modified.
 */
templateRouter.get(
  '/:id/parameters',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const params = await ReportTemplateService.getTempalteParameters(id, req.user);
      res.json(params);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Create the report file in the temporary directory
 * Generated from template.
 * Used only as samples
 */
templateRouter.post(
  '/generate',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.create),
  upload.single('template'),
  async (req, res, next) => {
    try {
      const { aggregation } = req.body;
      const data = await ReportTemplateService.processAggregation(aggregation, req.user);
      res.end(await ReportTemplateService.renderFromBuf(data, req.file.buffer, req.user));
    } catch (err) {
      next(err);
    }
  },
);

templateRouter.post(
  '/:id/download',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.read),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const template = await ReportTemplateService.getTemplate(id, req.user);
      if (template) res.end(template.template);
      else res.end();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Retrieve sample data
 */
templateRouter.post(
  '/sample',
  AuthorizeReq(REPORT_TEMPLATES.code, REPORT_TEMPLATES.grants.create),
  async (req, res, next) => {
    try {
      const { aggregation } = req.body;
      const limit = +req.query.limit || 2;
      const data = await ReportTemplateService.processAggregation(
        await ReportTemplateService.sampleAggregtion(aggregation, limit),
        req.user,
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = templateRouter;
