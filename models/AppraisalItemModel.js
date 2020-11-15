const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const validItemTypes = [
  'Planned',
  'Achieved',
  'Training',
  'Training_Suggested',
  'SWOT_S',
  'SWOT_W',
  'SWOT_O',
  'SWOT_T',
  'Feedback',
];

const validItemStatuses = [
  'Active',
  'Finished',
  'InProgress',
];

const AppraisalItemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: validItemTypes,
  },
  status: {
    type: String,
    required: true,
    enum: validItemStatuses,
  },
  content: {
    type: String,
    required: true,
  },
  periodId: {
    type: mongoose.ObjectId,
    required: false,
    default: null,
    ref: 'AppraisalPeriod',
    index: true,
  },
  organizationId: {
    type: mongoose.ObjectId,
    required: true,
  },
  relatedItemId: {
    type: mongoose.ObjectId,
    required: false,
    default: null,
    index: true,
  },
  user: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  complexity: {
    type: Number,
    default: 1,
  },
  createdUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  modifiedDate: {
    type: Date,
  },
});

AppraisalItemSchema.set('toJSON', {
  transform: toJSON,
});

const AppraisalItemModel = mongoose.model('AppraisalItem', AppraisalItemSchema);
const AppraisalItemsView = mongoose.model('AppraisalItemsView', AppraisalItemSchema, 'AppraisalItemsView');

module.exports = {
  AppraisalItemModel,
  AppraisalItemsView,
};
