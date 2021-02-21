const PubSub = require('pubsub-js');

class Connection {
  constructor(id, sse) {
    this.id = id;
    this.sse = sse;
    this.tokens = [];
  }

  clear() {
    this.tokens.forEach((token) => PubSub.unsubscribe(token));
  }

  subscribe(topic, func) {
    this.tokens.push(PubSub.subscribe(topic, func));
  }

  info() {
    console.log('\t\tCONNECTION', this.id);
    console.log('\t\t\ttokens', this.tokens.length);
  }
};

module.exports = Connection;
