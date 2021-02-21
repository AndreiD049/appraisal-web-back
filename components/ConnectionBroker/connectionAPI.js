const connectionRouter = require('express').Router();
const mongoose = require('mongoose'); // needed only to generate objectIds
const Joi = require('joi');
const Broker = require('./ConnectionBroker');
const SSE = require('./SSE');

// before each requestm check if there is a user
connectionRouter.use(async (req, res, next) => {
  if (!req.user) next(new Error('user is not attached to the request'));
  next();
});

connectionRouter.get('/stream', async (req, res, next) => {
  try {
    const id = mongoose.Types.ObjectId().toHexString();
    const sse = new SSE(id, { initialEvent: 'init' });
    sse.init(req, res);
    Broker.connect(req.user.id, id, sse);
    // const timer = setInterval(() => {
    //   Broker.info();
    //   sse.send('Test');
    // }, 1000);
    req.once('close', () => {
      Broker.disconnect(req.user.id, id)
      // clearInterval(timer);
    });
  } catch (err) {
    next(err);
  }
});

connectionRouter.post('/subscribe', async (req, res, next) => {
  try {
    await Joi.object({ 
      to: Joi.array().required(),
      topic: Joi.string().required(),
      connectionId: Joi.string().required(),
    }).validateAsync(req.body);
    const { to, topic, connectionId } = req.body;
    Broker.subscribe(to, topic, connectionId, req.user.id);
    Broker.info();
    res.status(200).end();
  } catch (err) {
    next(err);
  }
});

module.exports = connectionRouter;