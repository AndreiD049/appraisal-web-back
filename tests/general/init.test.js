/* eslint-disable no-undef */
const request = require('supertest');
const mongoose = require('mongoose');
const initApp = require('../../app');
const { create } = require('../data');

let app;

describe('test', () => {
  beforeAll(async () => {
    app = await initApp();
    await create();
    });

  afterAll(async () => {
    // close the database;
    // await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe('Sample test', () => {
    it('should test that true === true', () => {
      console.log(global.app);
      expect(true).toBe(true);
    })
  });

  // describe('Basic request', () => {
  //   it('should be fine', async (done) => {
  //     const res = await request(app).get('/api/periods');

  //     expect(res.statusCode).toBe(400);
  //     done();
  //   })
  // })
});