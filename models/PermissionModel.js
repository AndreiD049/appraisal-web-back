const mongoose = require('mongoose');
const validGrants = require('./dbutils/validGrants');
const { toJSON } = require('./dbutils');

const validTypes = [
  'Role',
  'User'
];

const autoPopulate = function(next) {
  this
    .populate({ path: 'code', select: 'code description' })
    .populate({ path: 'organization', select: 'name' })
  next();
}

const PermissionSchema = new mongoose.Schema({
  code: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'PermissionCode'
  },
  reference: {
    type: mongoose.Types.ObjectId,
    required: true,
    refPath: 'permissionType'
  },
  organization: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'Organization',
  },
  permissionType: {
    type: String,
    required: true,
    enum: validTypes,
  },
  grants: [{
    type: String,
    default: [],
    enum: validGrants
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
    default: Date.now
  },
}, { autoCreate: true });

PermissionSchema.set('toJSON', {
  transform: toJSON,
});

PermissionSchema
  .pre('find', autoPopulate)
  .pre('findOne', autoPopulate)
  .pre('findOneAndRemove', autoPopulate)
  .pre('findOneAndUpdate', autoPopulate);

const PermissionModel = mongoose.model('Permission', PermissionSchema);

module.exports = PermissionModel;