const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    match: /[a-zA-Z1-9]+/,
  },
  description: {
    type: String,
    required: true,
  },
  securityLevel: {
    type: Number,
    required: true,
    default: 1,
  },
  createdUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  modifiedDate: {
    type: Date,
  },
});

RoleSchema.set('toJSON', {
  transform: toJSON,
});

const RoleModel = mongoose.model('Role', RoleSchema);

module.exports = RoleModel;
