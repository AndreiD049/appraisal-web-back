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
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

OrganizationSchema.set('toJSON', {
  transform: toJSON
});

const OrganizationModel = mongoose.model('Organization', OrganizationSchema);

module.exports = OrganizationModel;
