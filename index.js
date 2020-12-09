const app = require('./app');
const config = require('./config');
const mongooseLoader = require('./loaders/mongooseLoader');

async function startServer() {
  await mongooseLoader.init();

  app.listen(config.port, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️ 
      ################################################
    `);
  });
}

startServer();
