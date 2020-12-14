/* eslint-disable no-undef */
const mongoose = require('mongoose');
const { AppraisalItemModel } = require('../../models/AppraisalItemModel');
const { AppraisalPeriodModel } = require('../../models/AppraisalPeriodModel');
const { OrganizationModel } = require('../../models/OrganizationModel');
const { TeamModel } = require('../../models/TeamModel');
const { UserModel } = require('../../models/UserModel');
const AppraisalService = require('../../services/AppraisalService');

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
      users.find(u => u.username === 'admin@test.com'),
      users.find(u => u.username === 'user@test.com'),
      users.find(u => u.username === 'reader@test.com'),
  ]
  });

  afterAll(async () => {
    // close the database;
    await mongoose.disconnect();
  });

  it('Getting periods overview', async () => {
    const data = [
      // should be included because it's Active
      {
        name: 'Period 1',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
      // not included because it's finished
      {
        name: 'Period 2',
        status: 'Finished',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
    ];
    // calling without user returns null
    expect(await AppraisalService.getPeriodsOverview()).toBe(null);
    await AppraisalPeriodModel.create(data);
    let docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(1);
    await AppraisalPeriodModel.findOneAndUpdate(
      {
        name: 'Period 2',
      },
      {
        status: 'Active',
      },
    );
    docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(2);
    // Create a finished item with the user in the users list
    await AppraisalPeriodModel.create({
      name: 'Period 2',
      status: 'Finished',
      organizationId: organizations[0].id,
      createdUser: users[0].id,
      users: [users[0]],
    });
    docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(3);
    docs.forEach((doc) => {
      expect(doc.createdUser).toHaveProperty('username');
    });
    await AppraisalPeriodModel.deleteMany({});
  });

  it('Get orphan items', async () => {
    const data = [
      {
        name: 'Period 1',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
    ];
    const period = (await AppraisalPeriodModel.create(data))[0];
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
        type: 'Achieved',
        status: 'Active',
        content: 'Test achieved assigned',
        periodId: period._id,
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
      {
        type: 'Planned',
        status: 'Active',
        content: 'Test Planned assigned',
        periodId: period._id,
        organizationId: organizations[0].id,
        user: users[0].id,
        createdUser: users[0].id,
      },
    ];
    // Calling orphans without any arguments returns empty array []
    let orphans = await AppraisalService.getOrphanItems();
    expect(orphans).toEqual(expect.any(Array));
    // Calling orphans with a user but without any items created in database returns empty []
    orphans = await AppraisalService.getOrphanItems(users[0]);
    expect(orphans).toEqual(expect.any(Array));
    expect(orphans.length).toBe(0);
    // create items
    await AppraisalItemModel.create(appraisalItems);
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
    await AppraisalItemModel.deleteMany({});
  });

  it('Get period by id', async () => {
    const data = [
      // should be included because it's Active
      {
        name: 'Period 1',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
      // not included because it's finished
      {
        name: 'Period 2',
        status: 'Finished',
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
    ];
    const periods = await AppraisalPeriodModel.create(data);
    let period = await AppraisalService.getPeriodById(periods[0]._id.toString());
    expect(period.name).toBe('Period 1');
    expect(period.createdUser).toHaveProperty('username');
    period = await AppraisalService.getPeriodById(periods[1]._id.toString());
    expect(period.name).toBe('Period 2');
    expect(period.createdUser).toHaveProperty('username');
    await AppraisalPeriodModel.deleteMany({});
  });

  it('Create period', async () => {
    result = await AppraisalService.createPeriod(users[0], {
      name: 'Period 1',
      status: 'Active',
      organizationId: organizations[0].id,
      createdUser: users[0].id,
    });
    expect(result).not.toBeNull();
    expect(result.name).toBe('Period 1');
    // test with a user without access
    await expect(
      AppraisalService.createPeriod(users[1], {
        name: 'Period 2',
        status: 'Active',
        organizationId: organizations[0].id,
        createdUser: users[1].id,
      }),
    ).rejects.toThrow(/^Access denied.*PERIOD/);
    await AppraisalPeriodModel.deleteMany({});
  });

  it('Updates a period with valid informatioin', async () => {
    let result = (
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
  });

  it('Adds a user to period but is not authorized', async () => {
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

    await expect(AppraisalService.addUserToPeriod(period.id.toString(), users[1])).rejects.toThrow(
      /^Access denied/,
    );
    await AppraisalPeriodModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
    await AppraisalItemModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
    await AppraisalItemModel.deleteMany({});
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
    await AppraisalPeriodModel.deleteMany({});
    await AppraisalItemModel.deleteMany({});
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
    result.forEach(res => {
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
    result.forEach(res => {
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
    result.forEach(res => {
      expect(res.createdUser).toHaveProperty('username');
    });

    await AppraisalPeriodModel.deleteMany({});
    await AppraisalItemModel.deleteMany({});
  });

  it('Should get items by period id', async () => {
    const periods = (
      await AppraisalPeriodModel.create([
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
      ])
    );
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
    result.forEach(res => {
      expect(res.createdUser).toHaveProperty('username');
    });

    const result2 = await AppraisalService.getItemsByPeriodId(periods[1].id);

    expect(result2.length).toBe(1);
    result2.forEach(res => {
      expect(res.createdUser).toHaveProperty('username');
    });

    await AppraisalPeriodModel.deleteMany({});
    await AppraisalItemModel.deleteMany({});
  });

  it('Should get an item by it\'s id', async () => {
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

    const result = await AppraisalService.getItemById(items[0].id)
    expect(result).toBeTruthy();

    await AppraisalItemModel.deleteMany({});
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

    const result = await AppraisalService.copyItem(items[0]);
    expect(result).toBeTruthy();
    expect(result.content).toBe(items[0].content);
    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(appraisalItems.length + 1);
    await AppraisalItemModel.deleteMany({});
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
    const transaction = await session.withTransaction(async () => {
      const result = await AppraisalService.copyItem(items[0], session);
      expect(result).toBeTruthy();
      expect(result.content).toBe(items[0].content);
    });
    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(appraisalItems.length + 1);
    expect(transaction.result.ok).toBe(1);
    await AppraisalItemModel.deleteMany({});
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
      const result = await AppraisalService.copyItem(items[0], session);
      expect(result).toBeTruthy();
      expect(result.content).toBe(items[0].content);

      throw new Error('FAIL');
    });
    await expect(transaction).rejects.toThrow('FAIL');
    const allItems = await AppraisalItemModel.find({});
    expect(allItems.length).toBe(appraisalItems.length);
    await AppraisalItemModel.deleteMany({});
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
    }

    const result = await AppraisalService.addItemToPeriod(period.id, item, users[0]);
    expect(result.periodId.toString()).toBe(period.id.toString());
    expect(result.createdUser).toHaveProperty('username');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(1);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(period.id, item);
    await expect(result).rejects.toThrow(/User doesn't exist./);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(null, item, users[0]);
    await expect(result).rejects.toThrow(/Period doesn't exist./);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(period.id, item, users[0]);
    await expect(result).rejects.toThrow(/locked/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(period.id, item, users[0]);
    await expect(result).rejects.toThrow(/user is not the same/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(period.id, item, users[2]);
    await expect(result).rejects.toThrow(/User is not authorized/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(period.id, item, users[1]);
    await expect(result).rejects.toThrow(/User is not authorized/);
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(0);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = AppraisalService.addItemToPeriod(period.id, item, users[0]);
    await expect(result).resolves.toEqual(expect.any(Object));
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(1);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }

    const result = await AppraisalService.addItemToPeriod(period.id, item, users[0]);
    expect(result.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(1);

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }
    const trainingItem = {
      type: 'Training_Planned',
      status: 'Active',
      content: 'Test Training',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    }

    const swotItem = {
      type: 'SWOT_S',
      status: 'Active',
      content: 'Test SWOT',
      periodId: null,
      organizationId: organizations[0].id,
      user: users[0].id,
      createdUser: users[0].id,
    }

    const result = await AppraisalService.addItemToPeriod(period.id, item, users[0]);
    expect(result.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(2);

    const resultTraining = await AppraisalService.addItemToPeriod(period.id, trainingItem, users[0]);
    expect(resultTraining.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(4);

    const resultSwot = await AppraisalService.addItemToPeriod(period.id, swotItem, users[0]);
    expect(resultSwot.status).toBe('Finished');
    await expect(AppraisalItemModel.countDocuments()).resolves.toBe(5);

    const items = await AppraisalItemModel.find({
      relatedItemId: {$ne: null}
    });
    expect(items.length).toBe(2);
    expect(items.map(i => i.content)).toEqual(expect.arrayContaining(['Test Training', 'Test Planned']));

    await AppraisalItemModel.deleteMany({});
    await AppraisalPeriodModel.deleteMany({});
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
    }
    const result = await AppraisalService.addItem(item, users[0]);
    expect(result).toBeTruthy();
    expect(result).toEqual(expect.objectContaining({
      type: 'Planned',
      status: 'Active',
      content: 'Test Planned',
      periodId: null,
    }));
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
    }
    const result = AppraisalService.addItem(item, users[2]);
    await expect(result).rejects.toThrow(/^Access denied.*APPRAISAL DETAILS.*create$/);
  });

});
