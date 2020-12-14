const tearDown = require('@shelf/jest-mongodb/teardown');

module.exports = async () => {
  global.replSet.stop();
  tearDown();
};
