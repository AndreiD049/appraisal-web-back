const auditsRouter = require('express').Router();
const { AuditService } = require('../../../services/Audit');
const { AuthorizeReq } = require('../../../services/AuthorizationService').AuthorizationService;


// before each requestm check if there is a user
auditsRouter.use(async (req, res, next) => {
  if (!req.user)
    next(new error("user is not attached to the request"));
  next();
});

/**
 * GET /api/audits
 * get all audits for current user's organization
 */
auditsRouter.get('/', AuthorizeReq('AUDITS', 'read'), async (req, res, next) => {
  try {
    const audits = await AuditService.getAudits(req.user);
    res.json(audits);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/audits
 * add a new audit
 */
auditsRouter.post('/', AuthorizeReq('AUDITS', 'create'), async (req, res, next) => {
  try {
    const body = req.body;
    body.createdUser = req.user.id;
    const audit = await AuditService.addAudit(body);
    res.json(audit);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/audits/:id
 * update an audit
 */
auditsRouter.put('/:id', AuthorizeReq('AUDITS', 'update'), async (req, res, next) => {
  try {
    const body = req.body;
    const id = req.params['id'];

    const result = await AuditService.updateAudit(id, body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/audits/:id
 * Delete an audit. Get's validated in the service.
 * Returns => the deleted audit
 */
auditsRouter.delete('/:id', AuthorizeReq('AUDITS', 'update'), async (req, res, next) => {
  try {
    const id = req.params['id'];

    const result = await AuditService.deleteAudit(id);
    if (result === null)
      return res.status(404).end();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = auditsRouter;