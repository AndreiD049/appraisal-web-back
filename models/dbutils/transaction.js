const mongoose = require('mongoose');

const executeTransaction = async function exec(fn) {
  let result = null;
  if (fn && fn instanceof Function) {
    if (this.admTransactionStatus !== 'BUSY') {
      this.admTransactionStatus = 'BUSY';
      try {
        await this.withTransaction(async () => {
          result = await fn();
        });
      } finally {
        this.endSession();
      }
    } else {
      result = await fn();
    }
  }
  return result;
};

const createMongoDbTransaction = (session) => {
  return new Proxy(session, {
    get(target, name) {
      if (name === 'execute') {
        return executeTransaction;
      }
      return target[name];
    }
  })
}

/**
 * Factory function returning a transaction
 * @returns {{execute: Function}}
 */
const createTransaction = async () => {
  const session = await mongoose.connection.startSession();
  return createMongoDbTransaction(session);
};

module.exports = createTransaction;