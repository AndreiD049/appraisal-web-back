const jestMongoSetup = require('@shelf/jest-mongodb/setup');
const mongoose = require('mongoose');
const { create } = require('./data');

module.exports = async () => {
  await jestMongoSetup();
  const conn = await mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });
  await create();
  await conn.connection.close();
  await conn.disconnect();
}