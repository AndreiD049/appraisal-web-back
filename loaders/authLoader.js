const auth = async (req, res, next) => {
  const headUser = JSON.parse(req.header('user'));
  if (headUser !== null) {
    req.user = headUser;
  }
  next();
};

const init = ({ app }) => {
  app.use(auth);

  return app;
};

module.exports = { init };
