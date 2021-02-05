const jestMongoSetup = require('@shelf/jest-mongodb/setup');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { create } = require('./data');

module.exports = async () => {
  await jestMongoSetup();
  const replSet = new MongoMemoryReplSet({
    replSet: {
      storageEngine: 'wiredTiger',
      name: 'rs0',
    },
  });
  await replSet.waitUntilRunning();
  const uri = await replSet.getUri();
  const conn = await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });
  process.env.MONGO_URL = uri;
  global.replSet = replSet;
  await create();
  await conn.connection.close();
  await conn.disconnect();
};
