const os = require('os');

module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'linebreak-style': ['error', (os.EOL === '\r\n' ? 'windows' : 'unix')],
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
  },
};
