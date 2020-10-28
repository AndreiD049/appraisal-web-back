const mongoose = require('mongoose');
const validGrants = require('./dbutils/validGrants');
const { toJSON } = require('./dbutils');

const PermissionCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  grants: [{
    type: String,
    default: [],
    enum: validGrants,
  }],
  createdUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  modifiedDate: {
    type: Date,
  },
}, { autoCreate: true, toJSON: { virtuals: true } });

PermissionCodeSchema.set('toJSON', {
  transform: toJSON
});

const PermissionCodeModel = mongoose.model('PermissionCode', PermissionCodeSchema);

module.exports = PermissionCodeModel;