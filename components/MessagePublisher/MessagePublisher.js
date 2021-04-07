const Joi = require('joi');
const NRP = require('node-redis-pubsub');
const config = require('../../config');

class MessagePublisher {
  constructor(host, password) {
    this.publisher = new NRP({
      host,
      password,
    });
  }

  publish(topic, data) {
    Joi.object({
      action: Joi.string(),
      targets: Joi.array().items(Joi.string()).required(),
    }).validate(data);
    this.publisher.emit(topic, data);
  }
}
module.exports = new MessagePublisher(config.REDIS_HOST, config.REDIS_PASSWORD);