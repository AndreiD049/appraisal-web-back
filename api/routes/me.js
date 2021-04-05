const meRouter = require('express').Router();
const UserService = require('../../services/UserService');

meRouter.get('/me', async (req, res) => {
        if (!req.user) {
                res.status(403).end();
        } else {
                res.json(await UserService.getUser(req.user?.id));
        }
});

module.exports = meRouter;
