const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const OrganizationSchema = new mongoose.Schema({
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
  createdDate: {
    type: Date,
    default: Date.now
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    required: false,
  },
  modifiedDate: {
    type: Date,
  },
});

OrganizationSchema.set('toJSON', {
  transform: toJSON
});

const OrganizationModel = mongoose.model('Organization', OrganizationSchema);

module.exports = OrganizationModel;
