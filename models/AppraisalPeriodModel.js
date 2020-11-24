const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const validStatuses = ['Active', 'Finished'];

const UserPeriodSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  locked: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const AppraisalPeriodSchema = new mongoose.Schema(
  {
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
    users: [UserPeriodSchema],
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

AppraisalPeriodSchema.set('toJSON', {
  transform: toJSON,
});

const AppraisalPeriodModel = mongoose.model('AppraisalPeriod', AppraisalPeriodSchema);
const UserPeriodModel = mongoose.model('UserPeriod', AppraisalPeriodSchema);
const AppraisalPeriodsView = mongoose.model(
  'AppraisalPeriodsView',
  AppraisalPeriodSchema,
  'AppraisalPeriodsView',
  true,
);

module.exports = {
  AppraisalPeriodModel,
  UserPeriodModel,
  AppraisalPeriodsView,
};
