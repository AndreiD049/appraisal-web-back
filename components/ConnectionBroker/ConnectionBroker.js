/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */
const PubSub = require('pubsub-js');
const Connection = require('./Connection');

class ConnectionBroker {
  constructor() {
    this.connections = new Map();
  }

  connect(userId, connectionId, sse) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }
    this.connections.get(userId).set(connectionId, new Connection(connectionId, sse));
  }

  disconnect(userId, connectionId) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      if (userConnections.has(connectionId)) {
        userConnections.get(connectionId).clear();
        userConnections.delete(connectionId);
      }
    }
  }

  subscribe(to, topic, connectionId, userId) {
    const connection = this.getConnection(userId, connectionId);
    if (connection) {
      connection.clear();
      to.forEach((user) => {
        connection.subscribe(`${topic}.${user}`, (msg, data) => {
          connection.sse.send(data);
        });
      })
    }
  }

  getConnections(userId) {
    return this.connections.get(userId);
  }

  getConnection(userId, connectionId) {
    return this.connections.get(userId)?.get(connectionId);
  }

  publish(topic, data) {
    PubSub.publish(topic, data);
  }

  info() {
    console.log(this.connections.size, 'Connections');
    for (const key of this.connections.keys()) {
      console.log('\tUSER', key);
      for (const val of this.connections.get(key).keys()) {
        this.getConnection(key, val).info();
      }
    }
  }
}
module.exports = new ConnectionBroker();