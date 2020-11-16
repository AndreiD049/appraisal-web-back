const mongoose = require('mongoose');
const validGrants = require('./dbutils/validGrants');
const { toJSON } = require('./dbutils');

const PermissionCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 50,
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
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: {
    createdAt: 'createdDate',
    updatedAt: 'modifiedDate',
  },
});

PermissionCodeSchema.set('toJSON', {
  transform: toJSON,
});

const PermissionCodeModel = mongoose.model('PermissionCode', PermissionCodeSchema);
const PermissionCodesView = mongoose.model('PermissionCodesView', PermissionCodeSchema, 'PermissionCodesView', true);

module.exports = {
  PermissionCodeModel,
  PermissionCodesView,
};
