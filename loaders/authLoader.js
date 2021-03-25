const auth = async (req, res, next) => {
  try {
    const headUser = JSON.parse(req.header('user'));
    if (headUser !== null) {
      req.user = headUser;
    }
  } catch {
    req.user = null;
  } finally {
    next();
  }
};

const init = ({ app }) => {
  app.use(auth);

  return app;
};

module.exports = { init };
