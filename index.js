const initApp = require('./app');
const config = require('./config');

async function startServer() {
  const app = await initApp();

  app.listen(config.port, (err) => {
    if (err) {
      console.log(err);
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
