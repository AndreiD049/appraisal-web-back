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
  filter: {
    type: String,
  },
  view: {
    type: String,
    required: true,
  },
  template: {
    type: Buffer,
    required: true,
  },
  organizationId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
});

const ReportTemplateModel = mongoose.model('ReportTempalte', ReportTemplateSchema);

module.exports = ReportTemplateModel;
