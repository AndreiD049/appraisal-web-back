const reportingRouter = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const carbone = require('carbone');
const mongoose = require('mongoose');
const { ReportingService, ReportTemplateService } = require('../../services/Reporting');
const { AppraisalItemsView } = require('../../models/AppraisalItemModel');
const AppraisalItemModel = require('../../models/AppraisalItemModel');
const { AuthorizeReq } = require('../../services/AuthorizationService').AuthorizationService;

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

reportingRouter.post('/template/generate',
  AuthorizeReq('REPORT-TEMPLATES', 'create'),
  upload.single('template'),
  async (req, res, next) => {
    try {
      const { body } = req;
      const finalPath = path.join(os.tmpdir(), req.user.id, 'templates', req.file.originalname);
      fs.mkdirSync(path.join(os.tmpdir(), req.user.id, 'templates'), { recursive: true });
      fs.writeFileSync(finalPath, req.file.buffer);
      const aggregation = JSON.parse(body.aggregation);
      const data = await AppraisalItemsView.aggregate(aggregation);
      carbone.render(finalPath, data, (err, result) => {
        if (err) throw new Error(`Failed to generate template - ${err}`);
        const filePathResult = path.join(os.tmpdir(), req.user.id, 'results', req.file.originalname);
        fs.mkdirSync(path.join(os.tmpdir(), req.user.id, 'results'), { recursive: true });
        fs.writeFileSync(filePathResult, result);
        res.json({
          filepath: filePathResult,
        });
      });
    } catch (err) {
      next(err);
    }
  });

reportingRouter.get('/template/generate',
  AuthorizeReq('REPORT-TEMPLATES', 'create'),
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
