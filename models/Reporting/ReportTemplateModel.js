const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const ReportTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  aggregation: {
    type: String,
  },
  template: {
    type: Buffer,
    required: true,
  },
  organizationId: {
    type: mongoose.Types.ObjectId,
    required: true,
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

ReportTemplateSchema.set('toJSON', {
  transform: toJSON,
});

const ReportTemplateModel = mongoose.model('ReportTempalte', ReportTemplateSchema);

module.exports = ReportTemplateModel;
