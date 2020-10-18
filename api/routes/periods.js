const appraisalPeriodsRouter = require('express').Router();
const AppraisalService = require('../../services/AppraisalService');
const UserService = require('../../services/UserService');

// Get users active periods
appraisalPeriodsRouter.get('/', async (req, res, next) => {
  try {
    const periods = await AppraisalService.getPeriodsOverview(req.user);
    // Return only necessary information
    // res.json(periods.map(p => AppraisalService.periodJSON(p, req.user.id)));
    res.json(periods);
  } catch (err) {
    next(err);
  }
});

// Create a new period
appraisalPeriodsRouter.post('/', async(req, res, next) => {
  try {
    const body = req.body;
    const period = await (await AppraisalService.createPeriod(req.user, body))
      .populate({ path: 'createdUser', select: 'username' })
      .execPopulate();
    res.json(period);
  } catch (err) {
    next(err);
  }
})

// Get period details, includeing all items
appraisalPeriodsRouter.get('/:id', async (req, res, next) => {
  try {
    const periodId = req.params['id'];

    const period = (await AppraisalService.getPeriodById(periodId)).calculateStatus(req.user).toJSON();

    // Only get items of current user
    const items = (await AppraisalService.getItemsByPeriodId(periodId, req.user))
      .map(item => item.toJSON());
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
    const periodId = req.params['id'];
    const result = await AppraisalService.finishPeriod(periodId, req.user);
    console.log(result);
    if (!result) {
      res.status(400).end();
    } else {
      res.status(200).end();
    }
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
    else if (body.periodId !== periodId)
      throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);
    
    // Insert item
    res.json(await AppraisalService.addItemToPeriod(periodId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// PUT /api/periods/:periodId/items/:id
// Modified an item and returns the modified version
appraisalPeriodsRouter.put('/:periodId/items/:id', async (req, res, next) => {
  try {
    const itemId = req.params['id'];
    const periodId = req.params['periodId'];
    const body = req.body;

    // Validate request
    if (!body.content && !body.type && !body.status)
      throw new Error('No items found to update: Content or type or status.');
    else if (body.periodId !== periodId)
      throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);
    
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
    await AppraisalService.deleteItem(itemId, req.user);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/*
 * User Section
 * This section identifies operations that can be done from one user to another
 * in relation to another
 */

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

appraisalPeriodsRouter.get('/:periodId/users/:userId', async (req, res, next) => {
  try {
    const periodId = req.params['periodId'];
    const userId = req.params['userId'];

    // make sure we are allowed to get this users details
    if (!(await UserService.isTeamMember(req.user, userId)))
      throw new Error(`Cannot get user details. '${userId}' is not on your team`);

    const user = await UserService.getUser(userId);
    if (user === null)
      throw new Error(`User '${userId}' was not found`);

    const period = (await AppraisalService.getPeriodById(periodId)).calculateStatus(user).toJSON();

    // Only get items of user
    const items = (await AppraisalService.getItemsByPeriodId(periodId, user))
      .map(item => item.toJSON());
    period.items = items;
    res.json(period);
  } catch (err) {
    next(err);
  }
}),

appraisalPeriodsRouter.get('/:periodId/users/:userId/items', async (req, res, next) => {
  try {
    const periodId = req.params["periodId"];
    const userId = req.params["userId"];
    const user = await UserService.getUser(userId);
    // Validate
    if (user === null)
      throw new Error(`User '${userId}' was not found`);
    if (!(await UserService.isTeamMember(req.user, userId)))
      throw new Error(`User '${userId}' is not in your team`);
    // Get the period with current id
    const period = (await AppraisalService.getPeriodById(periodId)).calculateStatus(user).toJSON();

    // Only get items of current user
    const items = (await AppraisalService.getItemsByPeriodId(periodId, user))
      .map(item => item.toJSON());
    period.items = items;
    res.json(period);
  } catch (err) {
    next(err);
  }
});

/* POST /api/periods/:id/users/:userId/items
 * Add a new item
 */
appraisalPeriodsRouter.post('/:id/users/:userId/items', async (req, res, next) => {
  try {
    const periodId = req.params['id'];
    const userId = req.params['userId']
    const body = req.body;
    // add the subject user id to the body
    body.user = userId;
    // Validate body
    if (!body.type)
      throw new Error('Type should be specified');
    else if (!body.status)
      throw new Error('Status should be specified');
    else if (!body.content)
      throw new Error('Content cannot be null');
    else if (!body.periodId)
      throw new Error('Period Id is blank');
    else if (body.periodId !== periodId)
      throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);
    
    // Insert item
    res.json(await AppraisalService.addItemToPeriodOfMember(periodId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// PUT /api/periods/:id/users/:userId/items/:itemId
// Update an item for another user
appraisalPeriodsRouter.put('/:periodId/users/:userId/items/:id', async (req, res, next) => {
  try {
    const itemId = req.params['id'];
    const userId = req.params['userId'];
    const periodId = req.params['periodId'];
    const body = req.body;
    // Validate request
    if (!body.content && !body.type && !body.status)
      throw new Error('No items found to update: Content or type or status.')
    if (body.periodId !== periodId)
      throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);
    if (body.user !== userId)
      throw new Error(`Request body and query have different user ids: ${body.user} vs ${userId}`);
    
    // Update item and return updated version
    res.json(await AppraisalService.updateItemOfMember(itemId, body, req.user));
  } catch (err) {
    next(err);
  }
});


// DELETE /api/periods/:id/users/:userId/items/:itemId
// Delete an item of another user
appraisalPeriodsRouter.delete('/:periodId/users/:userId/items/:id', async (req, res, next) => {
  try 
  {
    const itemId = req.params['id'];
    const userId = req.params['userId'];
    const periodId = req.params['periodId'];
    // Delete item and return the deleted item
    const item = (await AppraisalService.getItemById(itemId)).toJSON();
    if (!item)
      throw new Error(`Item ${itemId} was not found`);
    if (String(item.periodId) !== periodId)
      throw new Error(`Request body and query have different periodId: ${item.periodId} vs ${periodId}`);
    else if (item.user !== userId)
      throw new Error(`Request body and query have different user ids: ${item.user} vs ${userId}`);
    await AppraisalService.deleteItemOfMember(itemId, req.user);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = appraisalPeriodsRouter;