/* eslint-disable no-undef */
const request = require('supertest');
const mongoose = require('mongoose');
const initApp = require('../../app');
const { create } = require('../data');

let app;

describe('appraisal service', () => {
  beforeAll(async () => {
    app = await initApp();
    await create();
    });

  afterAll(async () => {
  //   // close the database;
    // await mongoose.connection.dropDatabase();
    await mongoose.disconnect()
  });

  it('Getting periods overview', () => {

  });
});