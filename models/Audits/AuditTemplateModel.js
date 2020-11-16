const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const AuditPointTemplateSchema = new mongoose.Schema({
  point: {
    type: String,
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

const AuditPointTemplateModel = mongoose.model('AuditPointTempalte', AuditPointTemplateSchema);

const AuditTemplateSchema = new mongoose.Schema({
  template: {
    type: String,
    required: true,
    minlength: 3,
  },
  organization: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'Organization',
  },
  auditPoints: [{
    type: AuditPointTemplateSchema,
    required: false,
    default: [],
  }],
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

AuditTemplateSchema.set('toJSON', {
  transform: toJSON,
});

const AuditTemplateModel = mongoose.model('AuditTemplate', AuditTemplateSchema);
const AuditTemplatesView = mongoose.model('AuditTemplatesView', AuditTemplateSchema, 'AuditTemplatesView', true);

module.exports = {
  AuditTemplateSchema,
  AuditTemplateModel,
  AuditPointTemplateModel,
  AuditTemplatesView,
};
