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
    await mongoose.connect(global.process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    organizations = await OrganizationModel.find();
    teams = await TeamModel.find({});
    users = await UserModel.find({});
  });

  afterAll(async () => {
    // close the database;
    await mongoose.disconnect()
  });

  it('Getting periods overview', async () => {
    const data = [
      // should be included because it's Active
      {
        name: "Period 1",
        status: "Active",
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
      // not included because it's finished
      {
        name: "Period 2",
        status: "Finished",
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
    ];
    // calling without user returns null
    expect(await AppraisalService.getPeriodsOverview()).toBe(null);
    await AppraisalPeriodModel.create(data);
    let docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(1);
    await AppraisalPeriodModel.findOneAndUpdate({
      name: "Period 2",
    }, {
      status: 'Active',
    });
    docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(2);
    // Create a finished item with the user in the users list
    await AppraisalPeriodModel.create({
      name: "Period 2",
      status: "Finished",
      organizationId: organizations[0].id,
      createdUser: users[0].id,
      users: [users[0]]
    });
    docs = await AppraisalService.getPeriodsOverview(users[0]);
    expect(docs.length).toBe(3);
    docs.forEach(doc => {
      expect(doc.createdUser).toHaveProperty('username');
    });
    await AppraisalPeriodModel.deleteMany({});
  });

  it('Get orphan items', async () => {
    const data = [
      {
        name: "Period 1",
        status: "Active",
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
    ]
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
    expect(orphans.map(o => o.content))
      .toEqual(expect.arrayContaining(['Test Achieved', 'Test Planned']))
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
        name: "Period 1",
        status: "Active",
        organizationId: organizations[0].id,
        createdUser: users[0].id,
      },
      // not included because it's finished
      {
        name: "Period 2",
        status: "Finished",
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
    await expect(AppraisalService.createPeriod(
        users[1],
        {
          name: 'Period 2',
          status: 'Active',
          organizationId: organizations[0].id,
          createdUser: users[1].id,
        }
      )).rejects.toThrow(/^Access denied.*PERIOD/);
  });

});