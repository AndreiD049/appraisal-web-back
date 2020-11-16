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
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: {
    createdAt: 'createdDate',
    updatedAt: 'modifiedDate',
  },
});

ReportTemplateSchema.set('toJSON', {
  transform: toJSON,
});

const ReportTemplateModel = mongoose.model('ReportTempalte', ReportTemplateSchema);
const ReportTemplatesView = mongoose.model('ReportTemplatesView', ReportTemplateSchema, 'ReportTemplatesView', true);

module.exports = {
  ReportTemplateModel,
  ReportTemplatesView,
};
