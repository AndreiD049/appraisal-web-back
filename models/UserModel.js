const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const UserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 30,
    match: /[a-zA-Z1-9]+/,
  },
  fullname: {
    type: String,
    required: false,
    minlength: 5,
    maxlength: 30,
    match: /[a-zA-Z1-9]+/,
  },
  teams: [{
    type: String,
    required: false,
    minlength: 3,
    maxlength: 30,
    match: /[a-zA-Z1-9]+/,
  }],
  securityLevel: {
    type: Number,
    required: true,
  },
  organizations: [{
    type: String,
    required: false,
  }]
});

UserSchema.set('toJSON', {
  transform: toJSON
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;