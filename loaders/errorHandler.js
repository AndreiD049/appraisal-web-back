const errorHandler = (error, req, res, next) => {
  console.log(`Received error ${error}`);
  const sendToClientErrors = ['Error', 'CastError', 'TypeError', 'ValidationError', 'MongoError'];
  if (sendToClientErrors.indexOf(error.name) > -1) {
    return res.status(500).json({
      error: error.message
    });
  }
  return next();
}

const init = async ({app}) => {
  app.use(errorHandler);

  return app;
};

module.exports = {init};