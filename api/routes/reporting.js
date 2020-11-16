const reportingRouter = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const carbone = require('carbone');
const { ReportTemplateService } = require('../../services/Reporting');
const { AuthorizeReq } = require('../../services/AuthorizationService').AuthorizationService;
const { securities } = require('../../config/constants');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// before each requestm check if there is a user
reportingRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

reportingRouter.get('/', AuthorizeReq('REPORTS', 'read'), async (req, res, next) => {
  try {
    //
  } catch (err) {
    next(err);
  }
});

/**
 * Create the report file in the temporary directory
 * Generated from template.
 * Used only as samples
 */
reportingRouter.post('/template/generate',
  AuthorizeReq('REPORT-TEMPLATES', 'create'),
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
        const filePathResult = path.join(os.tmpdir(), req.user.id, 'results', req.file.originalname);
        fs.mkdirSync(path.join(os.tmpdir(), req.user.id, 'results'), { recursive: true });
        fs.writeFileSync(filePathResult, result);
        return res.json({
          filepath: filePathResult,
        });
      });
    } catch (err) {
      next(err);
    }
  });

/**
 * Retrieve sample data
 */
reportingRouter.post('/template/sample',
  AuthorizeReq(securities.REPORT_TEMPLATES.code, securities.REPORT_TEMPLATES.grants.create),
  async (req, res, next) => {
    try {
      const { aggregation } = req.body;
      const data = await ReportTemplateService
        .sampleData(await ReportTemplateService
          .formatData(await ReportTemplateService
            .processAggregation(aggregation, req.user)));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

/**
 * Download the sample report generated from tempalte
 */
reportingRouter.get('/template/generate',
  AuthorizeReq(securities.REPORT_TEMPLATES.code, securities.REPORT_TEMPLATES.grants.create),
  async (req, res, next) => {
    try {
      const { filepath } = req.query;
      if (!filepath) {
        return res.status(204).end();
      }
      return res.download(filepath);
    } catch (err) {
      return next(err);
    }
  });

/**
 * Create a new template
 */
reportingRouter.post('/templates',
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
  });

module.exports = reportingRouter;
