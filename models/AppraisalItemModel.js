const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const validItemTypes = [
  'Planned',
  'Achieved',
  'Training_Planned',
  'Training_Achieved',
  'SWOT_S',
  'SWOT_W',
  'SWOT_O',
  'SWOT_T',
  'Feedback',
];

const validItemStatuses = ['Active', 'Finished', 'InProgress'];

const AppraisalItemSchema = new mongoose.Schema(
  {
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
      maxlength: 10000,
    },
    periodId: {
      type: mongoose.ObjectId,
      required: false,
      default: null,
      ref: 'AppraisalPeriod',
      index: true,
    },
    originalPeriodId: {
      type: mongoose.ObjectId,
      required: false,
      default: null,
      ref: 'AppraisalPeriod',
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

AppraisalItemSchema.set('toJSON', {
  transform: toJSON,
});

const AppraisalItemModel = mongoose.model('AppraisalItem', AppraisalItemSchema);
const AppraisalItemsView = mongoose.model(
  'AppraisalItemsView',
  AppraisalItemSchema,
  'AppraisalItemsView',
  true,
);

module.exports = {
  AppraisalItemModel,
  AppraisalItemsView,
};
