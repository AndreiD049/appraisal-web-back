const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const validStatuses = ['Active', 'Finished']

const AppraisalPeriodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 30,
  },
  status: {
    type: String,
    required: true,
    enum: validStatuses
  },
  organizationId: {
    type: mongoose.ObjectId,
    required: true,
  },
  users: [{
    type: String,
    default: []
  }],
  modifiedUser: {
    type: String,
    required: false,
  },
  modifiedDate: {
    type: Date,
    required: false,
    default: Date.now
  },
  createdUser: {
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { autoCreate: true });

AppraisalPeriodSchema.set('toJSON', {
  transform: toJSON
});

const AppraisalPeriodModel = mongoose.model('AppraisalPeriod', AppraisalPeriodSchema);

module.exports = AppraisalPeriodModel;