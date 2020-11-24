const mongoose = require('mongoose');
const validGrants = require('./dbutils/validGrants');
const { toJSON } = require('./dbutils');

const validTypes = ['Role', 'User'];

const PermissionSchema = new mongoose.Schema(
  {
    code: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'PermissionCode',
    },
    reference: {
      type: mongoose.Types.ObjectId,
      required: true,
      refPath: 'permissionType',
    },
    organization: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Organization',
      index: true,
    },
    permissionType: {
      type: String,
      required: true,
      enum: validTypes,
    },
    grants: [
      {
        type: String,
        default: [],
        enum: validGrants,
      },
    ],
    createdUser: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    modifiedUser: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: {
      createdAt: 'createdDate',
      updatedAt: 'modifiedDate',
    },
  },
);

PermissionSchema.index({ permissionType: 1, reference: 1 });

PermissionSchema.set('toJSON', {
  transform: toJSON,
});

const PermissionModel = mongoose.model('Permission', PermissionSchema);
const PermissionsView = mongoose.model(
  'PermissionsView',
  PermissionSchema,
  'PermissionsView',
  true,
);

module.exports = {
  PermissionModel,
  PermissionsView,
};
