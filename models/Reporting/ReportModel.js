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
    required: false,
    default: '',
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
    overruleTemplate: {
      type: Buffer,
      required: false,
      default: null,
    },
    organizationId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    parameters: [
      {
        type: ParameterSchema,
        required: false,
        default: [],
      },
    ],
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

ReportSchema.set('toJSON', {
  transform: toJSON,
});

ParameterSchema.set('toJSON', {
  transform: toJSON,
});

const ReportsModel = mongoose.model('Report', ReportSchema);
const ReportsView = mongoose.model('ReportsView', ReportSchema, 'ReportsView', true);

module.exports = {
  ReportsModel,
  ReportsView,
};
