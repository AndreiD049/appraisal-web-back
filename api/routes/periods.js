const appraisalPeriodsRouter = require('express').Router();
const AppraisalService = require('../../services/AppraisalService');

// Get users active periods
appraisalPeriodsRouter.get('/', async (req, res, next) => {
  try {
    const periods = await AppraisalService.getPeriodsOverview(req.user);
    // Return only necessary information
    res.json(periods.map(p => ({
      name: p.name,
      status: p.status,
      organizationId: p.organizationId,
      id: p.id,
      createdDate: p.createdDate,
      createdUser: p.createdUser
    })));
  } catch (err) {
    next(err);
  }
});

// Create a new period
appraisalPeriodsRouter.post('/', async(req, res, next) => {
  try {
    const body = req.body;
    const period = await AppraisalService.createPeriod(req.user, body);
    res.json(period);
  } catch (err) {
    next(err);
  }
})

// Get period details, includeing all items
appraisalPeriodsRouter.get('/:id', async (req, res, next) => {
  try {
    const periodId = req.params["id"];
    // Get the period with current id
    const period = await AppraisalService.getPeriodById(periodId);
    delete period.users;

    // Only get items of current user
    const items = await AppraisalService.getItemsByPeriodId(periodId, req.user);
    period.items = items;
    res.json(period);
  } catch (err) {
    next(err);
  }
});

// TODO: POST /api/periods/:id/finish
// Finish period and all it's items for the current user
appraisalPeriodsRouter.post('/:id/finish', async (req, res, next) => {
  try {
    console.log('finished');
  } catch (err) {
    next(err);
  }
});

/* POST /api/periods/:id/items
 * Add a new item
 */
appraisalPeriodsRouter.post('/:id/items', async (req, res, next) => {
  try {
    const periodId = req.params["id"];
    const body = req.body;
    // Validate body
    if (!body.type)
      next(new Error('Type should be specified'));
    else if (!body.status)
      next(new Error('Status should be specified'));
    else if (!body.content)
      next(new Error('Content cannot be null'));
    else if (!body.periodId)
      next(new Error('Period Id is blank'));
    
    // Insert item
    res.json(await AppraisalService.addItemToPeriod(periodId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// GET /api/periods/:periodId/items/:id
// get single item by id
appraisalPeriodsRouter.get('/:periodId/items/:id', async (req, res, next) => {
  try {
    const itemId = req.params['id'];

    res.json(await AppraisalService.getItemById(itemId));
  } catch (err) {
    next(err);
  }
});

// PUT /api/periods/:periodId/items/:id
// Modified an item and returns the modified version
appraisalPeriodsRouter.put('/:periodId/items/:id', async (req, res, next) => {
  try {
    const itemId = req.params['id'];
    const body = req.body;

    // Validate request
    if (!body.content && !body.type && !body.status)
      next(new Error('No items found to update: Content or type or status.'))
    
    // Update item and return updated version
    res.json(await AppraisalService.updateItem(itemId, body));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/periods/:periodId/items/:id
// Deletes an item from database
appraisalPeriodsRouter.delete('/:periodId/items/:id', async (req, res, next) => {
  try 
  {
    const itemId = req.params['id'];
    // Delete item and return the deleted item
    await AppraisalService.deleteItem(itemId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// TODO: PUT /api/periods/:id/users adjust the users array
appraisalPeriodsRouter.put('/:id/users', async (req, res, next) => {
  try {
    res.status(501).end();
  } catch (err) {
    next(err);
  }
});

// TODO: POST /api/periods/:id/users/add-user add a new user to the existing array
appraisalPeriodsRouter.post('/:id/users/add-user', async (req, res, next) => {
  try {
    res.status(501).end();
  } catch (err) {
    next(err);
  }
});

module.exports = appraisalPeriodsRouter;