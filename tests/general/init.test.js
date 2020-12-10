/* eslint-disable no-undef */
const mongoose = require('mongoose');

describe('test', () => {
  beforeAll(async () => {
    await mongoose.connect(global.process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
  });

  afterAll(async () => {
    // close the database;
    await mongoose.disconnect();
  });

  describe('Sample test', () => {
    it('should test that true === true', async () => {
      // wait 3 seconds by default
      // await new Promise(res => setTimeout(res, 1000));
      expect(true).toBe(true);
    });
  });
});
