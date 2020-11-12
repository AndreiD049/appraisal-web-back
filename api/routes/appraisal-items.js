const appraisalItemsRouter = require('express').Router();
const AppraisalService = require('../../services/AppraisalService');
const { AuthorizeReq } = require('../../services/AuthorizationService').AuthorizationService;

appraisalItemsRouter.get('/', AuthorizeReq('APPRAISAL DETAILS', 'read'), async (req, res, next) => {
  try {
    const items = await AppraisalService.getOrphanItems(req.user);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

appraisalItemsRouter.post('/', AuthorizeReq('APPRAISAL DETAILS', 'create'), async (req, res, next) => {
  try {
    const { body } = req;
    body.periodId = null;
    // Validate body
    if (!body.type) { next(new Error('Type should be specified')); } else if (!body.status) { next(new Error('Status should be specified')); } else if (!body.content) { next(new Error('Content cannot be null')); }

    // Insert item
    res.json(await AppraisalService.addItem(body, req.user));
  } catch (err) {
    next(err);
  }
});

appraisalItemsRouter.put('/:id', AuthorizeReq('APPRAISAL DETAILS', 'update'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body } = req;

    // Insert item
    res.json(await AppraisalService.updateItem(id, body, req.user));
  } catch (err) {
    next(err);
  }
});

appraisalItemsRouter.delete('/:id', AuthorizeReq('APPRAISAL DETAILS', 'delete'), async (req, res, next) => {
  try {
    const { id } = req.params;
    // Insert item
    await AppraisalService.deleteItem(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = appraisalItemsRouter;
