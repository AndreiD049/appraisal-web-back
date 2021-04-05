/* eslint-disable no-undef */
const mongoose = require('mongoose');
const { AppraisalItemModel } = require('../../models/AppraisalItemModel');
const { AppraisalPeriodModel } = require('../../models/AppraisalPeriodModel');
const { OrganizationModel } = require('../../models/OrganizationModel');
const { TeamModel } = require('../../models/TeamModel');
const { UserModel } = require('../../models/UserModel');
const AppraisalService = require('../../services/AppraisalService');
const {
  createPeriod,
  createAppraisalItem,
  clearItems,
  clearPeriods,
  getRandomInt,
} = require('../utils');

describe('Appraisal service tests', () => {
  let organizations;
  let teams;
  let users;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    organizations = await OrganizationModel.find({});
    teams = await TeamModel.find({});
    users = await UserModel.find({});
    users = [
      users.find((u) => u.username === 'admin@test.com'),
      users.find((u) => u.username === 'user@test.com'),
      users.find((u) => u.username === 'reader@test.com'),
    ];
  });

  afterAll(async () => {
    // close the database;
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await clearPeriods();
    await clearItems();
  });

  it('Getting periods overview', async () => {
    const data = await Promise.all([
      createPeriod('Period 1'),
      createPeriod('Period 2', null, null, 'Finished'),
    ]);
    // calling without user returns null
    expect(await AppraisalService.getPeriodsOverview()).toBe(null);
    await AppraisalPeriodModel.create(data);
    let docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(1);
    await AppraisalPeriodModel.findOneAndUpdate({ name: 'Period 2' }, { status: 'Active' });
    docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(2);
    await createPeriod('Period 3', null, users[0].id, 'Finished', [
      {
        _id: users[0].id,
        locked: false,
      },
    ]);
    docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(3);
    docs.forEach((doc) => {
      expect(doc.createdUser).toHaveProperty('username');
    });
  });

  it('Get orphan items', async () => {
    const period = await createPeriod('Period 1', null, users[0].id, 'Active');
    // Calling orphans without any arguments returns empty array []
    let orphans = await AppraisalService.getOrphanItems();
    expect(orphans).toEqual(expect.any(Array));
    // Calling orphans with a user but without any items created in database returns empty []
    orphans = await AppraisalService.getOrphanItems(users[0]);
    expect(orphans).toEqual(expect.any(Array));
    expect(orphans.length).toBe(0);
    await Promise.all([
      createAppraisalItem(
        'Test Achieved',
        users[0].id,
        'Achieved',
        'Active',
        null,
        null,
        users[0].id,
      ),
      createAppraisalItem(
        'Test achieved assigned',
        users[0].id,
        'Achieved',
        'Active',
        period._id,
        null,
        users[0].id,
      ),
      createAppraisalItem(
        'Test Planned',
        users[0].id,
        'Planned',
        'Active',
        null,
        null,
        users[0].id,
      ),
      createAppraisalItem(
        'Test Planned assigned',
        users[0].id,
        'Planned',
        'Active',
        period._id,
        null,
        users[0].id,
      ),
    ]);
    // call function with a user
    orphans = await AppraisalService.getOrphanItems(users[0]);
    expect(orphans).toEqual(expect.any(Array));
    expect(orphans.length).toBe(2);
    expect(orphans.map((o) => o.content)).toEqual(
      expect.arrayContaining(['Test Achieved', 'Test Planned']),
    );
    // call function with a user and a type
    orphans = await AppraisalService.getOrphanItems(users[0], 'Planned');
    expect(orphans).toEqual(expect.any(Array));
    expect(orphans.length).toBe(1);
    expect(orphans[0].content).toBe('Test Planned');
    // calling this function with a different user will return an empty []
    orphans = await AppraisalService.getOrphanItems(users[1]);
    expect(orphans).toEqual(expect.any(Array));
    expect(orphans.length).toBe(0);
  });

  it('Get period by id', async () => {
    const periods = await Promise.all([
      // should be included because it's Active
      createPeriod('Period 1'),
      // not included because it's finished
      createPeriod('Period 2', null, null, 'Finished'),
    ]);
    // const periods = await AppraisalPeriodModel.create(data);
    let period = await AppraisalService.getPeriodById(periods[0]._id.toString());
    expect(period.name).toBe('Period 1');
    expect(period.createdUser).toHaveProperty('username');
    period = await AppraisalService.getPeriodById(periods[1]._id.toString());
    expect(period.name).toBe('Period 2');
    expect(period.createdUser).toHaveProperty('username');
  });

  it('Create period', async () => {
    await expect(
      AppraisalService.createPeriod(users[1], {
        name: 'Period 2',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[1].id,
      }),
    ).rejects.toThrow(/^Access denied.*PERIOD/);
  });

  it('Create period successfully', async () => {
    await expect(
      AppraisalService.createPeriod(users[0], {
        name: 'Period 2',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        name: 'Period 2',
        status: 'Active',
        organizationId: new mongoose.Types.ObjectId(organizations[0].id),
        createdUser: new mongoose.Types.ObjectId(users[0].id),
      }),
    );
  });

  it('Updates a period with valid informatioin', async () => {
    let result = await createPeriod('Period 2', organizations[0].id, users[1].id);
    expect(result).not.toBeFalsy();

    const { id } = result;

    result = await AppraisalService.updatePeriod(
      id,
      {
        name: 'Updated',
        status: 'Finished',
        organizationId: organizations[1].id,
        users: [users[0], users[2]],
        createdUser: {
          id: new mongoose.Types.ObjectId(),
          username: 'JustRandom@test.com',
        },
      },
      users[0],
    );

    expect(result.name).toBe('Updated');
    expect(result.status).toBe('Finished');
    expect(result.organizationId.toString()).toBe(organizations[1].id.toString());
    expect(result.users).toEqual(expect.any(Array));
    expect(result.users.length).toBe(2);
    expect(result.createdUser._id.toString()).toBe(users[1]._id.toString());
    expect(result.createdUser.username).toBe(users[1].username);
  });

  it('Updates an user with invalid info', async () => {
    const result = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 2',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(result).not.toBeFalsy();

    const { id } = result;

    // Check required fields
    await expect(
      AppraisalService.updatePeriod(
        id,
        {
          name: null,
        },
        users[0],
      ),
    ).rejects.toThrow();
    await expect(
      AppraisalService.updatePeriod(
        id,
        {
          status: null,
        },
        users[0],
      ),
    ).rejects.toThrow();
    await expect(
      AppraisalService.updatePeriod(
        id,
        {
          organizationId: null,
        },
        users[0],
      ),
    ).rejects.toThrow();

    // Try invalid inputs
    await expect(
      AppraisalService.updatePeriod(
        id,
        {
          name: 'ha', // too short
        },
        users[0],
      ),
    ).rejects.toThrow();
    await expect(
      AppraisalService.updatePeriod(
        id,
        {
          status: 'Random', // wrong enum
        },
        users[0],
      ),
    ).rejects.toThrow();
  });

  it('Updates a period without being authorized', async () => {
    const result = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 2',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(result).not.toBeFalsy();

    const { id } = result;

    await expect(
      AppraisalService.updatePeriod(
        id,
        {
          name: 'Totally valid',
        },
        users[1],
      ),
    ).rejects.toThrow(/^Access denied. Code: APPRAISAL PERIODS/);
  });

  it('Toggles period lock', async () => {
    let period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 2',
          status: 'Active',
          organizationId: organizations[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    period = await AppraisalService.toggleLockPeriod(period.id.toString(), users[0].id, users[0]);
    expect(period.users[0]._id.toString()).toBe(users[0].id.toString());
    expect(period.users[0].locked).toBe(true);
  });

  it('Toggles an inexistent period lock', async () => {
    await expect(
      AppraisalService.toggleLockPeriod(null, users[0]._id.toString(), users[1]),
    ).rejects.toThrow(/Period doesn't exist/);
  });

  it('Toggles a period lock while being unauthorized', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    await expect(
      AppraisalService.toggleLockPeriod(period.id.toString(), users[0].id, users[1]),
    ).rejects.toThrow(/^Access denied/);
  });

  it('Toggle a period for a user that is did not yet access it', async () => {
    let period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    period = await AppraisalService.toggleLockPeriod(period.id.toString(), users[0].id, users[0]);
    expect(period.users.length).toBe(1);
    expect(period.users[0]._id.toString()).toBe(users[0].id.toString());
    expect(period.users[0].locked).toBe(true);
  });

  it('Adds user to a period', async () => {
    let period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    period = await AppraisalService.addUserToPeriod(period.id, users[0]);
    expect(period.users.length).toBe(1);
    expect(period.users[0]._id.toString()).toBe(users[0].id.toString());
    expect(period.users[0].locked).toBe(false);
  });

  it('Adds null user to period', async () => {
    let period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    period = await AppraisalService.addUserToPeriod(period.id, null);
    expect(period).toBeNull();
  });

  it('Adds a user to period (user is already in the period)', async () => {
    let period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    period = await AppraisalService.addUserToPeriod(period.id.toString(), users[0]);
    expect(period).toBeNull();
  });

  it('Adds a user to period but is not authorized (still can add it)', async () => {
    expect.assertions(5);
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    await expect(
      AppraisalService.addUserToPeriod(period.id.toString(), users[1]),
    ).resolves.toBeTruthy();
    const updatedPeriod = await AppraisalPeriodModel.findOne({});
    expect(updatedPeriod.users.length).toBe(1);
    expect(updatedPeriod.users[0].id).toBe(users[1].id);
    expect(updatedPeriod.users[0].locked).toBe(false);
  });

  it('Adds orphan items to period', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    await AppraisalItemModel.create(appraisalItems);
    let items = await AppraisalItemModel.find({
      periodId: period.id,
    });
    expect(items.length).toBe(0);
    await AppraisalService.addOrphanUserItemsToPeriod(period.id, users[0].id);
    items = await AppraisalItemModel.find({
      periodId: period.id,
    });
    expect(items.length).toBe(2);
    expect(items.map((i) => i.content)).toContain('Test Achieved');
    expect(items.map((i) => i.content)).toContain('Test Planned');
  });

  it('Add orphan user items to a finished period not possible', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    await AppraisalItemModel.create(appraisalItems);
    let items = await AppraisalItemModel.find({
      periodId: period.id,
    });
    expect(items.length).toBe(0);
    await AppraisalService.addOrphanUserItemsToPeriod(period.id, users[0].id);
    items = await AppraisalItemModel.find({
      periodId: period.id,
    });
    expect(items.length).toBe(0);
    expect(items.map((i) => i.content)).not.toContain('Test Achieved');
    expect(items.map((i) => i.content)).not.toContain('Test Planned');
  });

  it('Add orphan user items to a locked period not possible', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: true,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    await AppraisalItemModel.create(appraisalItems);
    let items = await AppraisalItemModel.find({
      periodId: period.id,
    });
    expect(items.length).toBe(0);
    await AppraisalService.addOrphanUserItemsToPeriod(period.id, users[0].id);
    items = await AppraisalItemModel.find({
      periodId: period.id,
    });
    expect(items.length).toBe(0);
    expect(items.map((i) => i.content)).not.toContain('Test Achieved');
    expect(items.map((i) => i.content)).not.toContain('Test Planned');
  });

  it('Should get all user items from period', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: true,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Training_Planned',
        status: 'Active',
        content: 'Test Training Planned',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    await AppraisalItemModel.create(appraisalItems);

    let result = await AppraisalService.getUserItemsByPeriodId(period.id, users[0].id);

    expect(result.length).toBe(appraisalItems.length);
    result.forEach((res) => {
      expect(res.createdUser).toHaveProperty('username');
    });

    const addAppraisalItems = [
      {
        type: 'Training_Achieved',
        status: 'Active',
        content: 'Test',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'SWOT_S',
        status: 'Active',
        content: 'Test SWOT',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'SWOT_O',
        status: 'Active',
        content: 'Test SWOT',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    await AppraisalItemModel.create(addAppraisalItems);

    result = await AppraisalService.getUserItemsByPeriodId(period.id, users[0].id);

    expect(result.length).toBe(appraisalItems.length + addAppraisalItems.length);
    result.forEach((res) => {
      expect(res.createdUser).toHaveProperty('username');
    });

    // add other user items
    const addAppraisalItemsOther = [
      {
        type: 'Training_Achieved',
        status: 'Active',
        content: 'Test',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[1].id,
        createdUser: users[1].id,
      },
      {
        type: 'SWOT_S',
        status: 'Active',
        content: 'Test SWOT',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[1].id,
        createdUser: users[1].id,
      },
      {
        type: 'SWOT_O',
        status: 'Active',
        content: 'Test SWOT',
        periodId: period.id,
        organizationId: organizations[0].id,
        user: users[1].id,
        createdUser: users[1].id,
      },
    ];
    await AppraisalItemModel.create(addAppraisalItemsOther);

    result = await AppraisalService.getUserItemsByPeriodId(period.id, users[0].id);

    expect(result.length).toBe(appraisalItems.length + addAppraisalItems.length);
    result.forEach((res) => {
      expect(res.createdUser).toHaveProperty('username');
    });
  });

  it('Should get items by period id', async () => {
    const periods = await AppraisalPeriodModel.create([
      {
        name: 'Period 1',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[1].id,
      },
      {
        name: 'Period 2',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[1].id,
      },
    ]);
    expect(periods).not.toBeFalsy();

    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: periods[0].id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned',
        periodId: periods[0].id,
        organizationId: organizations[0].id,
        user: users[1].id,
        createdUser: users[0].id,
      },
      {
        type: 'Training_Planned',
        status: 'Active',
        content: 'Test Training Planned',
        periodId: periods[0].id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
      {
        type: 'Training_Planned',
        status: 'Active',
        content: 'Test Training Planned',
        periodId: periods[1].id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    await AppraisalItemModel.create(appraisalItems);

    const result = await AppraisalService.getItemsByPeriodId(periods[0].id);

    expect(result.length).toBe(appraisalItems.length - 1);
    result.forEach((res) => {
      expect(res.createdUser).toHaveProperty('username');
    });

    const result2 = await AppraisalService.getItemsByPeriodId(periods[1].id);

    expect(result2.length).toBe(1);
    result2.forEach((res) => {
      expect(res.createdUser).toHaveProperty('username');
    });
  });

  it("Should get an item by it's id", async () => {
    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    const items = await AppraisalItemModel.create(appraisalItems);

    const result = await AppraisalService.getItemById(items[0].id);
    expect(result).toBeTruthy();
  });

  it('Should return null if an item with id is not found', async () => {
    const result = await AppraisalService.getItemById(new mongoose.Types.ObjectId());
    expect(result).toBeNull();
  });

  it('Should copy an existing item (without session)', async () => {
    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    const items = await AppraisalItemModel.create(appraisalItems);

    const result = await (await AppraisalService.copyItem(items[0])).save();
    expect(result).toBeTruthy();
    expect(result.content).toBe(items[0].content);
    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(appraisalItems.length + 1);
  });

  it('Should copy an existing item (with session)', async () => {
    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    const items = await AppraisalItemModel.create(appraisalItems);
    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      const result = await (await AppraisalService.copyItem(items[0], session)).save();
      expect(result).toBeTruthy();
      expect(result.content).toBe(items[0].content);
    });
    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(appraisalItems.length + 1);
  });

  it('Should not copy an existing item if transaction fails (with session)', async () => {
    const appraisalItems = [
      {
        type: 'Achieved',
        status: 'Active',
        content: 'Test Achieved',
        periodId: null,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    const items = await AppraisalItemModel.create(appraisalItems);
    const session = await AppraisalItemModel.startSession();
    const transaction = session.withTransaction(async () => {
      const result = await (await AppraisalService.copyItem(items[0], session)).save({ session });
      expect(result).toBeTruthy();
      expect(result.content).toBe(items[0].content);

      throw new Error('FAIL');
    });
    await expect(transaction).rejects.toThrow('FAIL');
    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(appraisalItems.length);
  });

  it('Should add an item to period (best case)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = await AppraisalService.addItemToPeriod(period.id, item, users[0]);
    expect(result.periodId.toString()).toBe(period.id.toString());
    expect(result.createdUser).toHaveProperty('username');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(1);
  });

  it('Should add an item to period (user is not provided)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(period.id, item);
    await expect(result).rejects.toThrow(/User doesn't exist./);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Should add an item to period (period is not provided)', async () => {
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(null, item, users[0]);
    await expect(result).rejects.toThrow(/Period doesn't exist./);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Should add an item to period (item is not provided)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const result = AppraisalService.addItemToPeriod(period, null, users[0]);
    await expect(result).rejects.toThrow(/Item doesn't exist./);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Should add an item to period (period is locked)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: true,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(period.id, item, users[0]);
    await expect(result).rejects.toThrow(/locked/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Cannot add an item to another user', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
            {
              _id: users[1].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(period.id, item, users[0]);
    await expect(result).rejects.toThrow(/user is not the same/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Cannot add an item if not authorized', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[2].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(period.id, item, users[2]);
    await expect(result).rejects.toThrow(/User is not authorized/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Cannot add an item to a Finished period', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[1].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(period.id, item, users[1]);
    await expect(result).rejects.toThrow(/User is not authorized/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);
  });

  it('Should add an item to a finished period (user has access)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Finished',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = AppraisalService.addItemToPeriod(period.id, item, users[0]);
    await expect(result).resolves.toEqual(expect.any(Object));
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(1);
  });

  // Adding an active item to a Finished period will finish the item
  it('Should add an active item to a finished period (user has access)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Achieved',
      status: 'Active',
      content: 'Test Achieved',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = await AppraisalService.addItemToPeriod(period.id, item, users[0]);
    expect(result.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(1);
  });

  // Adding an active Planned or Training Planned item to a Finished period will create a copy
  it('Should add an active planned item to a finished period (user has access)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();
    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Test Planned',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };
    const trainingItem = {
      type: 'Training_Planned',
      status: 'Active',
      content: 'Test Training',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const swotItem = {
      type: 'SWOT_S',
      status: 'Active',
      content: 'Test SWOT',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const result = await AppraisalService.addItemToPeriod(period.id, item, users[0]);
    expect(result.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(2);

    const resultTraining = await AppraisalService.addItemToPeriod(
      period.id,
      trainingItem,
      users[0],
    );
    expect(resultTraining.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(4);

    const resultSwot = await AppraisalService.addItemToPeriod(period.id, swotItem, users[0]);
    expect(resultSwot.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(5);

    const items = await AppraisalItemModel.find({
      relatedItemId: { $ne: null },
    });
    expect(items.length).toBe(2);
    expect(items.map((i) => i.content)).toEqual(
      expect.arrayContaining(['Test Training', 'Test Planned']),
    );
  });

  it('Adding a item without a preiod', async () => {
    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Test Planned',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };
    const result = await AppraisalService.addItem(item, users[0]);
    expect(result).toBeTruthy();
    expect(result).toEqual(
      expect.objectContaining({
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned',
        periodId: null,
      }),
    );
  });

  it('Adding a item withou having access', async () => {
    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Test Planned',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[0].id,
    };
    const result = AppraisalService.addItem(item, users[2]);
    await expect(result).rejects.toThrow(/^Access denied.*APPRAISAL DETAILS.*create$/);
  });

  /**
   * Add item to another member's period.
   */
  it("Should add an item to user's period", async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Test Planned',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[0].id,
    };
    const admin = users[0];
    const user = users[1];

    const result = await AppraisalService.addItemToPeriodOfMember(period.id, item, admin);
    expect(result).not.toBeFalsy();
    expect(result).toHaveProperty('user');
    expect(result.user.toString()).toBe(user.id.toString());

    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(1);
  });

  it("Should add an item to user's finished period", async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: "Should add an item to user's finished period",
      periodId: null,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[0].id,
    };
    const admin = users[0];
    const user = users[1];

    let result = await AppraisalService.addItemToPeriodOfMember(period.id, item, admin);
    expect(result).not.toBeFalsy();
    expect(result).toHaveProperty('user');
    expect(result.user.toString()).toBe(user.id.toString());

    let allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(2);

    const itemTraining = {
      type: 'Training_Planned',
      status: 'Active',
      content: "Should add an item to user's finished period",
      periodId: null,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[0].id,
    };

    result = await AppraisalService.addItemToPeriodOfMember(period.id, itemTraining, admin);
    expect(result).not.toBeFalsy();
    expect(result).toHaveProperty('user');
    expect(result.user.toString()).toBe(user.id.toString());

    allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(4);

    const itemAchieved = {
      type: 'Achieved',
      status: 'Active',
      content: "Should add an item to user's finished period",
      periodId: null,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[0].id,
    };

    result = await AppraisalService.addItemToPeriodOfMember(period.id, itemAchieved, admin);
    expect(result).not.toBeFalsy();
    expect(result).toHaveProperty('user');
    expect(result.user.toString()).toBe(user.id.toString());

    allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(5);
  });

  it('Cannot addItemToPeriodOfMember for myself', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot addItemToPeriodOfMember for myself',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };
    const admin = users[0];

    const result = AppraisalService.addItemToPeriodOfMember(period.id, item, admin);

    await expect(result).rejects.toThrow(/^Cannot add item to your own user/i);
  });

  it('Cannot add item if not authorized (Active period)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot addItemToPeriodOfMember for myself',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[0].id,
    };
    const user = users[1];

    const result = AppraisalService.addItemToPeriodOfMember(period.id, item, user);

    await expect(result).rejects.toThrow(/^Access denied/i);
  });

  it('Cannot add item if not authorized (Finished period)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot add item if not authorized (Finished period)',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[0].id,
    };
    const user = users[1];

    const result = AppraisalService.addItemToPeriodOfMember(period.id, item, user);

    await expect(result).rejects.toThrow(/^Access denied/i);
  });

  it('Should update an existing item', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot add item if not authorized (Finished period)',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = await AppraisalService.updateItem(itemResult.id, update, users[0]);

    expect(result).toBeTruthy();
    expect(result.content).toBe('UPDATED');
  });
  it('Should throw error if item is not provided', async () => {
    const result = AppraisalService.updateItem(null, { content: 'Test' }, users[0]);

    await expect(result).rejects.toThrow(/Item doesn't exist/);
  });

  it('Should not update the item if period is locked', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[0].id,
              locked: true,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Should not update the item if period is locked',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = AppraisalService.updateItem(itemResult.id, update, users[0]);

    await expect(result).rejects.toThrow(/Cannot update items in a locked period/);
  });

  it('Should not update an item with related entries', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[0].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Should not update the item if period is locked',
      periodId: period.id,
      relatedItemId: new mongoose.Types.ObjectId(),
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = AppraisalService.updateItem(itemResult.id, update, users[0]);

    await expect(result).rejects.toThrow(/You cannot update an item with related entries/);
  });

  it('Cannot update an item if not authorized (Active)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[2].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot update an item if not authorized (Active)',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[2].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = AppraisalService.updateItem(itemResult.id, update, users[2]);

    await expect(result).rejects.toThrow(/Access denied. Cannot update item./);
  });

  it('Cannot update an item if not authorized (Finished)', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Finished',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[2].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot update an item if not authorized (Active)',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[2].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = AppraisalService.updateItem(itemResult.id, update, users[2]);

    await expect(result).rejects.toThrow(/Access denied. Cannot update item./);
  });

  it('Cannot update an item of another user with updateItem', async () => {
    const period = (
      await AppraisalPeriodModel.create([
        {
          name: 'Period 1',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[0].id,
          users: [
            {
              _id: users[2].id,
              locked: false,
            },
          ],
        },
      ])
    )[0];
    expect(period).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Active',
      content: 'Cannot update an item of another user with updateItem',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[2].id,
      createdUser: users[2].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = AppraisalService.updateItem(itemResult.id, update, users[0]);

    await expect(result).rejects.toThrow(/user is not the same/);
  });

  // TODO: Rewrite test and method, item should not get unfinished, instead,
  // all related entries should be just updated
  it('Updates a finished item with related entries', async () => {
    const periods = await AppraisalPeriodModel.create([
      {
        name: 'Period 1',
        status: 'Finished',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
        users: [
          {
            _id: users[2].id,
            locked: false,
          },
        ],
      },
      {
        name: 'Period 2',
        status: 'Finished',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
        users: [
          {
            _id: users[0].id,
            locked: false,
          },
        ],
      },
    ]);
    expect(periods).not.toBeFalsy();

    const item = {
      type: 'Planned',
      status: 'Finished',
      content: 'Updates a finished item with related entries',
      periodId: periods[0].id,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    };

    const itemResult = await AppraisalItemModel.create(item);
    expect(itemResult).toBeTruthy();

    const temp = await AppraisalItemModel.create({
      ...itemResult.toJSON(),
      relatedItemId: itemResult.id,
      periodId: periods[1].id,
    });

    await AppraisalItemModel.create({
      ...itemResult.toJSON(),
      relatedItemId: temp.id,
      periodId: null,
      status: 'Active',
    });

    const update = itemResult.toJSON();

    update.content = 'UPDATED';
    update.createdUser = {
      invalid: 'data',
      should: 'ignore',
    };

    const result = await AppraisalService.updateItem(itemResult.id, update, users[0]);

    expect(result).toBeTruthy();
    expect(result.content).toBe('UPDATED');
    expect(result.createdUser).toHaveProperty('username');
    expect(result.modifiedUser).toHaveProperty('username');
    expect(result.modifiedUser.id.toString()).toBe(users[0].id.toString());

    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(3);
    expect(allItems.map((i) => i.content)).toEqual(
      expect.arrayContaining(['UPDATED', 'UPDATED', 'UPDATED']),
    );
    expect(allItems.map((i) => (i.periodId ? i.periodId.toString() : i.periodId))).toEqual([
      periods[0].id.toString(),
      periods[1].id.toString(),
      null,
    ]);
    expect(allItems.map((i) => i.status)).toEqual(
      expect.arrayContaining(['Active', 'Finished', 'Finished']),
    );
  });

  /**
   * When i want to update an item of a member, i:
   * a. should have access
   * b. should see my name in modifiedUser
   * c. dateModified should be modified
   */
  it('Can update an item of another member', async () => {
    const period = await AppraisalPeriodModel.create({
      name: 'Period 1',
      status: 'Active',
      organizationId: organizations[0].id,
      createdUser: users[0].id,
      users: [
        {
          _id: users[2].id,
          locked: false,
        },
      ],
    });

    const item = await AppraisalItemModel.create({
      type: 'Planned',
      status: 'Finished',
      content: 'Updates a finished item with related entries',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[1].id,
    });

    // User created is the original one
    expect(String(item.createdUser)).toBe(String(users[1].id));
    // Save the modified date and createdUser
    const { modifiedDate, createdUser } = item;
    // Simulate admin modifying the item
    const update = {
      content: 'Updated',
      type: 'Achieved',
      status: 'Active',
    };
    const updatedItem = await AppraisalService.updateItemOfMember(item.id, update, users[0]);
    expect(updatedItem).toHaveProperty('id');
    expect(updatedItem.content).toBe(update.content);
    expect(updatedItem.type).toBe(update.type);
    // Status cannot be updated here
    expect(updatedItem.status).not.toBe(update.status);
    expect(updatedItem.modifiedDate).not.toBe(modifiedDate);
    expect(String(updatedItem.createdUser.id)).toBe(String(createdUser));
  });

  it('Can update an item of another member', async () => {
    const period = await AppraisalPeriodModel.create({
      name: 'Period 1',
      status: 'Active',
      organizationId: organizations[0].id,
      createdUser: users[0].id,
      users: [
        {
          _id: users[2].id,
          locked: false,
        },
      ],
    });

    const item = await AppraisalItemModel.create({
      type: 'Planned',
      status: 'Finished',
      content: 'Updates a finished item with related entries',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    });

    // User created is the original one
    expect(String(item.createdUser)).toBe(String(users[0].id));

    const update = {
      content: 'UPDATED',
      type: 'Achieved',
    };

    await expect(AppraisalService.updateItemOfMember(item.id, update, users[1])).rejects.toThrow(
      /^User.*is not member of.*teams/,
    );
  });

  it('Cannot update an item of myself', async () => {
    const period = await AppraisalPeriodModel.create({
      name: 'Period 1',
      status: 'Active',
      organizationId: organizations[0].id,
      createdUser: users[0].id,
      users: [
        {
          _id: users[2].id,
          locked: false,
        },
      ],
    });

    const item = await AppraisalItemModel.create({
      type: 'Planned',
      status: 'Finished',
      content: 'Updates a finished item with related entries',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    });

    // User created is the original one
    expect(String(item.createdUser)).toBe(String(users[0].id));

    const update = {
      content: 'UPDATED',
      type: 'Achieved',
    };

    await expect(AppraisalService.updateItemOfMember(item.id, update, users[0])).rejects.toThrow(
      /user is not the same as/,
    );
  });

  it('Can update a finished item of member', async () => {
    const period = await AppraisalPeriodModel.create({
      name: 'Period 1',
      status: 'Active',
      organizationId: organizations[0].id,
      createdUser: users[0].id,
      users: [
        {
          _id: users[1].id,
          locked: false,
        },
      ],
    });

    const item = await AppraisalItemModel.create({
      type: 'Planned',
      status: 'Active',
      content: 'Updates a finished item with related entries',
      periodId: period.id,
      organizationId: organizations[0].id,
      user: users[1].id,
      createdUser: users[1].id,
    });

    // User created is the original one
    expect(String(item.createdUser)).toBe(String(users[1].id));

    const update = {
      content: 'UPDATED',
      type: 'Achieved',
    };

    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      // Finish the item
      await AppraisalService.finishItem(item, session);
    });

    await AppraisalService.updateItemOfMember(item.id, update, users[0]);
    const items = await AppraisalItemModel.find({});
    expect(items.map((i) => i.content)).toEqual(
      expect.arrayContaining([update.content, update.content]),
    );
    expect(items.map((i) => i.type)).toEqual(expect.arrayContaining([update.type, update.type]));
    const itemsCount = await AppraisalItemModel.countDocuments({});
    expect(itemsCount).toBe(2);
  });

  it('Delete appraisal item (invalid id provided), error expected', async () => {
    const invalidId = new mongoose.Types.ObjectId();

    await expect(AppraisalService.deleteItem(invalidId, users[0])).rejects.toThrow(
      /Item doesn't exist\./,
    );
  });

  it('Detele appraisal item (invalid user provided), error expected', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[0].id,
        locked: false,
      },
    ]);
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem('test', users[0].id, 'Achieved', 'Active', period.id);
    await expect(AppraisalService.deleteItem(item.id, { invalid: true })).rejects.toThrow(
      "User doesn't exist.",
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Cannot delete an item if it has related entries', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[0].id,
        locked: false,
      },
    ]);
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem('test', users[0].id, 'Planned', 'Finished', period.id);
    const relatedItem = await createAppraisalItem(
      'test',
      users[0].id,
      'Achieved',
      'Active',
      null,
      null,
      null,
      item.id,
    );
    await expect(AppraisalService.deleteItem(relatedItem.id, users[0])).rejects.toThrow(
      "Item has related entries. Can't delete",
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(2);
  });

  it('Cannot delete an item if the period is locked for me', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[1].id,
        locked: true,
      },
    ]);
    const item = await createAppraisalItem(
      'Content locked',
      users[1].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[1].id,
    );
    await expect(AppraisalService.deleteItem(item.id, users[1])).rejects.toThrow(
      'Cannot delete items in a locked period',
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it("Cannot delete an item if i don't have access", async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[2].id,
        locked: false,
      },
    ]);
    const item = await createAppraisalItem(
      'Content locked',
      users[2].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[2].id,
    );
    await expect(AppraisalService.deleteItem(item.id, users[2])).rejects.toThrow(
      /^Access denied.*delete$/,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it("Cannot delete a finished item if i don't have access", async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[1].id,
        locked: false,
      },
    ]);
    const item = await createAppraisalItem(
      'Delete finished',
      users[1].id,
      'Achieved',
      'Finished',
      period.id,
      null,
      users[0].id,
    );
    await expect(AppraisalService.deleteItem(item.id, users[1])).rejects.toThrow(
      /Access denied.*finished$/,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Can delete a finished item if i have access', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[0].id,
        locked: false,
      },
    ]);
    const item = await createAppraisalItem(
      'Delete finished',
      users[0].id,
      'Achieved',
      'Finished',
      period.id,
      null,
      users[0].id,
    );
    const deleted = await AppraisalService.deleteItem(item.id, users[0]);
    expect(String(deleted.id)).toBe(String(item.id));
    expect(item.content).toBe(deleted.content);
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(0);
  });

  it('Can delete an active item if i have access', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[1].id,
        locked: false,
      },
    ]);
    const item = await createAppraisalItem(
      'Active',
      users[1].id,
      'SWOT_S',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    const deleted = await AppraisalService.deleteItem(item.id, users[1]);
    expect(String(deleted.id)).toBe(String(item.id));
    expect(item.content).toBe(deleted.content);
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(0);
  });

  it('Cannot delete an item of another user', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[1].id,
        locked: false,
      },
    ]);
    const item = await createAppraisalItem(
      'Active',
      users[1].id,
      'SWOT_S',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    await expect(AppraisalService.deleteItem(item.id, users[0])).rejects.toThrow(
      /user is not the same as/,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Can delete a finished item with related items if i delete the original', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active', [
      {
        _id: users[0].id,
        locked: false,
      },
    ]);
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem('test', users[0].id, 'Planned', 'Finished', period.id);
    await createAppraisalItem('test', users[0].id, 'Achieved', 'Active', null, null, null, item.id);
    await expect(AppraisalService.deleteItem(item.id, users[0])).resolves.toHaveProperty(
      '_id',
      expect.any(mongoose.Types.ObjectId),
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(0);
  });

  /**
   * Delete appraisal items of other member
   */
  it('Delete appraisal item of member (invalid item id)', async () => {
    await expect(
      AppraisalService.deleteItemOfMember(new mongoose.Types.ObjectId(), users[0]),
    ).rejects.toThrow("Item doesn't exist.");
  });

  it('Delete appraisal item of member (null item id)', async () => {
    await expect(AppraisalService.deleteItemOfMember(null, users[0])).rejects.toThrow(
      "Item doesn't exist.",
    );
  });

  it('Delete appraisal item of member (invalid user)', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[0].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, { invalid: true })).rejects.toThrow(
      "User doesn't exist.",
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Delete appraisal item of member (invalid user but with id)', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[0].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    const invalidId = new mongoose.Types.ObjectId();
    await expect(
      AppraisalService.deleteItemOfMember(item.id, {
        id: invalidId,
        _id: invalidId,
        username: 'invalid',
      }),
    ).rejects.toThrow("User doesn't exist.");
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Delete appraisal item of member (user is null)', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[0].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, null)).rejects.toThrow(
      "User doesn't exist.",
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Cannot delete a item of myself (same user)', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[0].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, users[0])).rejects.toThrow(
      /user is not the same/i,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Cannot delete a related item of user', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[1].id,
      'Planned',
      'Finished',
      period.id,
      null,
      users[0].id,
    );
    const relatedItem = await createAppraisalItem(
      'Delete finished',
      users[1].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[0].id,
      item.id,
    );
    await expect(AppraisalService.deleteItemOfMember(relatedItem.id, users[0])).rejects.toThrow(
      /item has related entries/i,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(2);
  });

  it("Cannot delete an item of a user if i don't have access", async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[2].id,
      'Planned',
      'Active',
      period.id,
      null,
      users[2].id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, users[1])).rejects.toThrow(
      /^access denied.*delete$/i,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it("Cannot delete a finished item of a user if i don't have access", async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[2].id,
      'Planned',
      'Finished',
      period.id,
      null,
      users[2].id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, users[1])).rejects.toThrow(
      /^access denied.*finished$/i,
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(1);
  });

  it('Can delete a finished item of a user if i have access', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[2].id,
      'Planned',
      'Finished',
      period.id,
      null,
      users[2].id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, users[0])).resolves.toEqual(
      expect.objectContaining({
        content: 'Delete finished',
        type: 'Planned',
      }),
    );
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(0);
  });

  it('Can delete a finished item even if it has related entries', async () => {
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Delete finished',
      users[1].id,
      'Planned',
      'Finished',
      period.id,
      null,
      users[1].id,
    );
    const relatedItem = await createAppraisalItem(
      'Delete finished',
      users[1].id,
      'Planned',
      'Finished',
      period.id,
      null,
      users[1].id,
      item.id,
    );
    await createAppraisalItem(
      'Delete finished',
      users[1].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[1].id,
      relatedItem.id,
    );
    await expect(AppraisalService.deleteItemOfMember(item.id, users[0])).resolves.toMatchObject({
      id: item.id,
      _id: expect.any(mongoose.Types.ObjectId),
      content: item.content,
    });
    const remaining = await AppraisalItemModel.find({});
    expect(remaining.length).toBe(0);
  });

  it('Finish an item with invalid input (id)', async () => {
    const invalidId = new mongoose.Types.ObjectId();
    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem({ id: invalidId }, session)).rejects.toThrow(
        "Item doesn't exist.",
      );
    });
  });

  it('Finish an item with invalid input (null id)', async () => {
    expect.assertions(1);
    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem(null, session)).rejects.toThrow(
        "Item doesn't exist.",
      );
    });
  });

  it('Finish an item with invalid input (invalid session)', async () => {
    expect.assertions(2);
    const period = await createPeriod('Delete item period', null, null, 'Active');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Item active',
      users[0].id,
      'Achieved',
      'Active',
      period.id,
      null,
      users[0].id,
    );

    await expect(
      AppraisalService.finishItem(item, { invalid: true, inTransaction: () => {} }),
    ).rejects.toThrow('Session is invalid');
  });

  it('Cannot finish a Finished item', async () => {
    expect.assertions(4);
    const period = await createPeriod('Test period', null, null, 'Finished');
    expect(period).not.toBeFalsy();
    const item = await createAppraisalItem(
      'Item finished',
      users[0].id,
      'Achieved',
      'Finished',
      period.id,
      null,
      users[0].id,
    );

    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem(item, session)).rejects.toThrow(
        /status is not valid/i,
      );
    });

    const items = await AppraisalItemModel.find({});
    expect(items.length).toBe(1);
    expect(items[0]).toMatchObject({
      status: item.status,
      content: item.content,
      id: item.id,
    });
  });

  it('Cannot finish an item without a period', async () => {
    expect.assertions(3);
    const item = await createAppraisalItem(
      'Item without period',
      users[0].id,
      'Achieved',
      'Active',
      null,
      null,
      users[0].id,
    );

    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem(item, session)).rejects.toThrow(
        "Item has no period. Can't finish.",
      );
    });

    const items = await AppraisalItemModel.find({});
    expect(items.length).toBe(1);
    expect(items[0]).toMatchObject({
      status: item.status,
      content: item.content,
      id: item.id,
    });
  });

  it('Finsihing an item: Planned will create a duplicate', async () => {
    expect.assertions(4);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();

    const item = await createAppraisalItem(
      'Planned active',
      users[0].id,
      'Planned',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem(item, session)).resolves.toMatchObject({
        id: item.id,
        status: 'Finished',
        relatedItemId: null,
      });
    });
    const activeItem = await AppraisalItemModel.findOne({
      status: 'Active',
    });

    expect(activeItem.toJSON()).toMatchObject({
      content: item.content,
      status: 'Active',
    });
    expect(String(activeItem.relatedItemId)).toBe(item.id);
  });

  it('Finsihing an item: Training_Planned will create a duplicate', async () => {
    expect.assertions(4);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();

    const item = await createAppraisalItem(
      'Training Planned active',
      users[0].id,
      'Training_Planned',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem(item, session)).resolves.toMatchObject({
        id: item.id,
        status: 'Finished',
        relatedItemId: null,
      });
    });
    const activeItem = await AppraisalItemModel.findOne({
      status: 'Active',
    });

    expect(activeItem.toJSON()).toMatchObject({
      content: item.content,
      status: 'Active',
    });
    expect(String(activeItem.relatedItemId)).toBe(item.id);
  });

  it('Finishing item: finishing invalid item should throw error and abort', async () => {
    expect.assertions(5);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();

    // Invalid content
    let item = await createAppraisalItem(
      'x',
      users[0].id,
      'Training_Planned',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    item = await AppraisalItemModel.findByIdAndUpdate(
      item.id,
      {
        content: 'x'.repeat(10001),
      },
      { new: true },
    );
    expect(item).toBeTruthy();

    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(AppraisalService.finishItem(item, session)).rejects.toThrow(/validation/i);
    });

    const all = await AppraisalItemModel.find({});
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(item.id);
  });

  it('Should abort transactions on finishing 2 items - 1 valid and 1 invalid', async () => {
    expect.assertions(6);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();

    // Invalid content
    let item1 = await createAppraisalItem(
      'x',
      users[0].id,
      'Training_Planned',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    item1 = await AppraisalItemModel.findByIdAndUpdate(
      item1.id,
      {
        content: 'x'.repeat(10001),
      },
      { new: true },
    );
    expect(item1).toBeTruthy();
    const item2 = await createAppraisalItem(
      'Valid',
      users[0].id,
      'Planned',
      'Active',
      period.id,
      null,
      users[0].id,
    );
    expect(item2).toBeTruthy();

    const session = await AppraisalItemModel.startSession();
    await session.withTransaction(async () => {
      await expect(
        Promise.all([
          AppraisalService.finishItem(item1, session),
          AppraisalService.finishItem(item2, session),
        ]),
      ).rejects.toThrow(/validation/i);
    });

    const all = await AppraisalItemModel.find({});
    expect(all.length).toBe(2);
    expect(all.map((i) => i.id)).toEqual(expect.arrayContaining([item1.id, item2.id]));
  });

  it('Should successfully finish a valid item', async () => {
    expect.assertions(4);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();

    // Invalid content
    const item = await createAppraisalItem(
      'Valid',
      users[0].id,
      'Planned',
      'Active',
      period.id,
      null,
      users[0].id,
    );

    const session = await AppraisalItemModel.startSession();
    let finished;
    await session.withTransaction(async () => {
      finished = await AppraisalService.finishItem(item, session);
    });
    expect(finished).toMatchObject({
      id: item.id,
      content: item.content,
      status: 'Finished',
      type: item.type,
    });

    const all = await AppraisalItemModel.find({});
    expect(all.length).toBe(2);
    expect(all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: item.id,
          content: item.content,
          status: finished.status,
          type: item.type,
        }),
        expect.objectContaining({
          content: item.content,
          status: 'Active',
          type: item.type,
        }),
      ]),
    );
  });

  it('Should successfully finish a big amount of items (20000)', async () => {
    expect.assertions(2);
    jest.setTimeout(20000);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();
    // 10 000 Achieved items
    const achieved = [];
    for (let i = 0; i < 10000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      achieved.push({
        content: `Achieved ${i}`,
        user: randomUser.id,
        type: 'Achieved',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    await AppraisalItemModel.insertMany(achieved);

    // 10 000 Planned items
    const planned = [];
    for (let i = 0; i < 10000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      planned.push({
        content: `Planned ${i}`,
        user: randomUser.id,
        type: 'Planned',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    await AppraisalItemModel.insertMany(planned);

    await AppraisalService.finishPeriod(period.id, users[0]);
    const all = await AppraisalItemModel.find({});
    expect(all.length).toBe(30000);
  });

  it('Try finish a period that is locked', async () => {
    expect.assertions(4);
    let period = await createPeriod('Locked', organizations[0].id, users[0].id, 'Active');
    period.locked = true;
    period = await period.save();
    expect(period).toBeTruthy();

    const items = [];
    for (let i = 0; i < 10; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Achieved ${i}`,
        user: randomUser.id,
        type: 'Achieved',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 10; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Planned ${i}`,
        user: randomUser.id,
        type: 'Planned',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    await AppraisalItemModel.insertMany(items);

    await expect(AppraisalService.finishPeriod(period.id, users[0])).rejects.toThrow(
      /Period is being updated/i,
    );
    const all = await AppraisalItemModel.find({});
    expect(all.length).toBe(20);
    const periodAfter = await AppraisalPeriodModel.findOne({});
    expect(periodAfter).toEqual(
      expect.objectContaining({
        name: 'Locked',
        status: 'Active',
      }),
    );
  });

  it('Start 2 finish tasks at the same time (only 1 resolves)', async () => {
    expect.assertions(4);
    jest.setTimeout(20000);
    const period = await createPeriod('Duplicate', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();
    // 10 000 Achieved items
    const items = [];
    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Achieved ${i}`,
        user: randomUser.id,
        type: 'Achieved',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Training_Achieved ${i}`,
        user: randomUser.id,
        type: 'Training_Achieved',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `SWOT_S ${i}`,
        user: randomUser.id,
        type: 'SWOT_S',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `SWOT_W ${i}`,
        user: randomUser.id,
        type: 'SWOT_W',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `SWOT_O ${i}`,
        user: randomUser.id,
        type: 'SWOT_O',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `SWOT_T ${i}`,
        user: randomUser.id,
        type: 'SWOT_T',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Feedback ${i}`,
        user: randomUser.id,
        type: 'Feedback',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    await AppraisalItemModel.insertMany(items);

    const planned = [];
    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      planned.push({
        content: `Planned ${i}`,
        user: randomUser.id,
        type: 'Planned',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 1000; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      planned.push({
        content: `Training_Planned ${i}`,
        user: randomUser.id,
        type: 'Training_Planned',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    await AppraisalItemModel.insertMany(planned);

    const tasks = [
      AppraisalService.finishPeriod(period.id, users[0]),
      AppraisalService.finishPeriod(period.id, users[0]),
    ];
    const results = await Promise.allSettled(tasks);
    // 1 fulfilled, 1 rejected
    expect(results.map((r) => r.status)).toEqual(expect.arrayContaining(['fulfilled', 'rejected']));
    expect(results.find((r) => r.status === 'rejected').reason.message).toMatch(
      /status is not valid/i,
    );
    const all = await AppraisalItemModel.find({});
    expect(all.length).toBe(10001);
  });

  it('All finished and duplicated items have a relatedItemId property', async () => {
    expect.assertions(202);
    const period = await createPeriod('Related Items', organizations[0].id, users[0].id, 'Active');
    expect(period).toBeTruthy();

    const items = [];
    for (let i = 0; i < 100; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Planned ${i}`,
        user: randomUser.id,
        type: 'Planned',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    for (let i = 0; i < 100; i += 1) {
      const randomUser = users[getRandomInt(0, 3)];
      items.push({
        content: `Training_Planned ${i}`,
        user: randomUser.id,
        type: 'Training_Planned',
        status: 'Active',
        periodId: period.id,
        organizationId: organizations[0].id,
        createdUser: randomUser.id,
      });
    }

    await AppraisalItemModel.insertMany(items);

    await AppraisalService.finishPeriod(period.id, users[0]);

    const newItems = await AppraisalItemModel.find({ periodId: { $eq: null } });
    expect(newItems.length).toBe(200);
    newItems.forEach((item) => {
      expect(item.relatedItemId).not.toBeNull();
    });
  });
});
