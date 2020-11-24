module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'prettier'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'linebreak-style': [0],
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
  },
};
