const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const ParameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  defaultValue: {
    type: String,
    required: true,
  },
});

const ReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    template: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'ReportTemplate',
    },
    description: {
      type: String,
      required: false,
    },
    parameters: [
      {
        type: ParameterSchema,
        required: false,
        default: [],
      },
    ],
  },
  {
    timestamps: {
      createdAt: 'createdDate',
      updatedAt: 'modifiedDate',
    },
  },
);

ReportSchema.set('toJSON', {
  transform: toJSON,
});

const ReportModel = mongoose.model('Report', ReportSchema);
const ReportsView = mongoose.model('ReportsView', ReportSchema, 'ReportsView', true);

module.exports = {
  ReportModel,
  ReportsView,
};
