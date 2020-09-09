
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
  'SWOT_T'
];

const validItemStatuses = [
  'Active',
  'Finished',
  'InProgress'
];

const AppraisalItemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: validItemTypes
  },
  status: {
    type: String,
    required: true,
    enum: validItemStatuses
  },
  content: {
    type: String,
    required: true
  },
  periodId: {
    type: mongoose.ObjectId,
    required: true
  },
  organizationId: {
    type: mongoose.ObjectId,
    required: true
  },
  user: {
    type: String,
    required: true
  },
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

AppraisalItemSchema.set('toJSON', {
  transform: toJSON
});

const AppraisalItemModel = mongoose.model('AppraisalItem', AppraisalItemSchema);

module.exports = AppraisalItemModel;