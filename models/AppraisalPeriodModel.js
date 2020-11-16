const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const validStatuses = ['Active', 'Finished'];

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
    enum: validStatuses,
  },
  organizationId: {
    type: mongoose.ObjectId,
    required: true,
  },
  users: [{
    type: mongoose.Types.ObjectId,
    default: [],
  }],
  createdUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    required: false,
  },
}, {
  timestamps: {
    createdAt: 'createdDate',
    updatedAt: 'modifiedDate',
  },
});

AppraisalPeriodSchema.set('toJSON', {
  transform: toJSON,
});

const AppraisalPeriodModel = mongoose.model('AppraisalPeriod', AppraisalPeriodSchema);
const AppraisalPeriodsView = mongoose.model('AppraisalPeriodsView', AppraisalPeriodSchema, 'AppraisalPeriodsView', true);

module.exports = {
  AppraisalPeriodModel,
  AppraisalPeriodsView,
};
