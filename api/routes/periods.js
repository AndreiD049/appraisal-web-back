const appraisalPeriodsRouter = require('express').Router();
const AppraisalService = require('../../services/AppraisalService');
const UserService = require('../../services/UserService');
const { AuthorizeReq } = require('../../services/AuthorizationService').AuthorizationService;

// Get users active periods
appraisalPeriodsRouter.get('/', AuthorizeReq('APPRAISAL PERIODS', 'read'), async (req, res, next) => {
  try {
    const periods = await AppraisalService.getPeriodsOverview(req.user);
    res.json(periods);
  } catch (err) {
    next(err);
  }
});

// Create a new period
appraisalPeriodsRouter.post('/', AuthorizeReq('APPRAISAL PERIODS', 'create'), async (req, res, next) => {
  try {
    const { body } = req;
    const period = await (await AppraisalService.createPeriod(req.user, body))
      .populate({ path: 'createdUser', select: 'username' })
      .execPopulate();
    res.json(period);
  } catch (err) {
    next(err);
  }
});

// Get period details, includeing all items
appraisalPeriodsRouter.get('/:id', AuthorizeReq('APPRAISAL PERIODS', 'read'), async (req, res, next) => {
  try {
    const periodId = req.params.id;

    const period = (await AppraisalService.getPeriodById(periodId)).toJSON();
    // Check if current user is within the period users
    // If not, it's the first time user accesses the period
    if (!period.users.find((u) => String(u) === String(req.user.id))) {
      await AppraisalService.updatePeriod(period.id, { users: period.users.concat(req.user.id) });
      // check if there are any orphan appraisal items to add them here
      await AppraisalService.addOrphanUserItemsToPeriod(period.id, req.user.id);
    }

    // Only get items of current user
    const items = (await AppraisalService.getUserItemsByPeriodId(periodId, req.user.id));
    period.items = items;
    res.json(period);
  } catch (err) {
    next(err);
  }
});

// TODO: POST /api/periods/:id/finish
// Finish period and all it's items for the current user
appraisalPeriodsRouter.post('/:id/finish', AuthorizeReq('APPRAISAL PERIODS', 'finish'), async (req, res, next) => {
  try {
    const periodId = req.params.id;
    const result = await AppraisalService.finishPeriod(periodId, req.user);
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
appraisalPeriodsRouter.get('/:periodId/items/:id', AuthorizeReq('APPRAISAL DETAILS', 'read'), async (req, res, next) => {
  try {
    const itemId = req.params.id;

    res.json(await AppraisalService.getItemById(itemId));
  } catch (err) {
    next(err);
  }
});

/* POST /api/periods/:id/items
 * Add a new item
 */
appraisalPeriodsRouter.post('/:id/items', AuthorizeReq('APPRAISAL DETAILS', 'create'), async (req, res, next) => {
  try {
    const periodId = req.params.id;
    const { body } = req;
    // Validate body
    if (!body.type) next(new Error('Type should be specified'));
    else if (!body.status) next(new Error('Status should be specified'));
    else if (!body.content) next(new Error('Content cannot be null'));
    else if (!body.periodId) next(new Error('Period Id is blank'));
    else if (body.periodId !== periodId) throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);

    // Insert item
    res.json(await AppraisalService.addItemToPeriod(periodId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// PUT /api/periods/:periodId/items/:id
// Modified an item and returns the modified version
appraisalPeriodsRouter.put('/:periodId/items/:id', AuthorizeReq('APPRAISAL DETAILS', 'update'), async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const { periodId } = req.params;
    const { body } = req;

    // Validate request
    if (!body.content && !body.type && !body.status) throw new Error('No items found to update: Content or type or status.');
    else if (body.periodId !== periodId) throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);

    // Update item and return updated version
    res.json(await AppraisalService.updateItem(itemId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/periods/:periodId/items/:id
// Deletes an item from database
appraisalPeriodsRouter.delete('/:periodId/items/:id', AuthorizeReq('APPRAISAL DETAILS', 'delete'), async (req, res, next) => {
  try {
    const itemId = req.params.id;
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

appraisalPeriodsRouter.get('/:periodId/users/:userId', AuthorizeReq('APPRAISAL DETAILS - OTHER USERS', 'read'), async (req, res, next) => {
  try {
    const { periodId } = req.params;
    const { userId } = req.params;

    // make sure we are allowed to get this users details
    if (!(await UserService.isTeamMember(req.user, userId))) throw new Error(`Cannot get user details. '${userId}' is not on your team`);

    const user = await UserService.getUser(userId);
    if (user === null) throw new Error(`User '${userId}' was not found`);

    const period = (await AppraisalService.getPeriodById(periodId)).toJSON();

    // Only get items of user
    const items = (await AppraisalService.getUserItemsByPeriodId(periodId, user.id))
      .map((item) => item.toJSON());
    period.items = items;
    res.json(period);
  } catch (err) {
    next(err);
  }
});

appraisalPeriodsRouter.get('/:periodId/users/:userId/items', AuthorizeReq('APPRAISAL DETAILS - OTHER USERS', 'read'), async (req, res, next) => {
  try {
    const { periodId } = req.params;
    const { userId } = req.params;
    const user = await UserService.getUser(userId);
    // Validate
    if (user === null) throw new Error(`User '${userId}' was not found`);
    if (!(await UserService.isTeamMember(req.user, userId))) throw new Error(`User '${userId}' is not in your team`);
    // Get the period with current id
    const period = (await AppraisalService.getPeriodById(periodId)).toJSON();

    // Only get items of current user
    const items = (await AppraisalService.getUserItemsByPeriodId(periodId, user.id))
      .map((item) => item.toJSON());
    period.items = items;
    res.json(period);
  } catch (err) {
    next(err);
  }
});

/* POST /api/periods/:id/users/:userId/items
 * Add a new item
 */
appraisalPeriodsRouter.post('/:id/users/:userId/items', AuthorizeReq('APPRAISAL DETAILS - OTHER USERS', 'create'), async (req, res, next) => {
  try {
    const periodId = req.params.id;
    const { userId } = req.params;
    const { body } = req;
    // add the subject user id to the body
    body.user = userId;

    // Insert item
    res.json(await AppraisalService.addItemToPeriodOfMember(periodId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// PUT /api/periods/:id/users/:userId/items/:itemId
// Update an item for another user
appraisalPeriodsRouter.put('/:periodId/users/:userId/items/:id', AuthorizeReq('APPRAISAL DETAILS - OTHER USERS', 'update'), async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const { userId } = req.params;
    const { periodId } = req.params;
    const { body } = req;
    // Validate request
    if (!body.content && !body.type && !body.status) throw new Error('No items found to update: Content or type or status.');
    if (body.periodId !== periodId) throw new Error(`Request body and query have different periodId: ${body.periodId} vs ${periodId}`);
    if (body.user !== userId) throw new Error(`Request body and query have different user ids: ${body.user} vs ${userId}`);

    // Update item and return updated version
    res.json(await AppraisalService.updateItemOfMember(itemId, body, req.user));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/periods/:id/users/:userId/items/:itemId
// Delete an item of another user
appraisalPeriodsRouter.delete('/:periodId/users/:userId/items/:id', AuthorizeReq('APPRAISAL DETAILS - OTHER USERS', 'delete'), async (req, res, next) => {
  try {
    const itemId = req.params.id;
    const { userId } = req.params;
    const { periodId } = req.params;
    // Delete item and return the deleted item
    const item = (await AppraisalService.getItemById(itemId)).toJSON();
    if (!item) throw new Error(`Item ${itemId} was not found`);
    if (String(item.periodId) !== periodId) throw new Error(`Request body and query have different periodId: ${item.periodId} vs ${periodId}`);
    else if (String(item.user) !== userId) throw new Error(`Request body and query have different user ids: ${item.user} vs ${userId}`);
    await AppraisalService.deleteItemOfMember(itemId, req.user);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = appraisalPeriodsRouter;
