const reportingRouter = require('express').Router();
const { ReportingService, ReportTemplateService } = require('../../services/Reporting');
const { AuthorizeReq } = require('../../services/AuthorizationService').AuthorizationService;
const path = require('path');
const os = require('os');
const ReportTemplateModel = require('../../models/Reporting/ReportTemplateModel');
const { getTemplateFile } = require('../../services/Reporting/ReportTemplateService');

// before each requestm check if there is a user
reportingRouter.use(async (req, res, next) => {
  if (!req.user) next(new error('user is not attached to the request'));
  next();
});

reportingRouter.get('/', AuthorizeReq('REPORTS', 'read'), async (req, res, next) => {
  try {
    const template = await getTemplateFile('word', req.user);
    // await ReportTemplateService.addTemplateFromFile('word', './reports/report.docx', req.user);
    // await ReportingService.getAppraisalItemsReport(req.user);
    // await ReportingService.removeUserFile(req.user);
    await ReportingService.getAppraisalReport(template, req.user, (result) => {
      const fs = require('fs');
      const filename = path.join(os.tmpdir(), `${req.user.id}-result.docx`);
      fs.writeFileSync(filename, result);
      res.download(filename, 'report-carbone.docx');
    });
  } catch (err) {
    next(err);
  }
});

module.exports = reportingRouter;
