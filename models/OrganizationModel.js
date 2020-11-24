const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 30,
    },
    createdUser: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    modifiedUser: {
      type: mongoose.Types.ObjectId,
      required: false,
    },
  },
  {
    timestamps: {
      createdAt: 'createdDate',
      updatedAt: 'modifiedDate',
    },
  },
);

OrganizationSchema.set('toJSON', {
  transform: toJSON,
});

const OrganizationModel = mongoose.model('Organization', OrganizationSchema);
const OrganizationsView = mongoose.model(
  'OrganizationsView',
  OrganizationSchema,
  'OrganizationsView',
  true,
);

module.exports = {
  OrganizationModel,
  OrganizationsView,
};
