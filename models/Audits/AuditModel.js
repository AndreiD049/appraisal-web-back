const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');
const { ActionPointSchema } = require('./ActionPointSchema');

const AuditPointsSchema = new mongoose.Schema({
  point: {
    type: String,
    required: true,
  },
  checked: {
    type: Boolean,
    required: false,
    default: false,
  },
  comment: {
    type: String,
    required: false,
  },
});

const AuditSchema = new mongoose.Schema({
  auditor: {
    type: mongoose.Types.ObjectId,
    required: false,
    default: null,
    ref: 'User',
  },
  auditSubject: {
    type: String,
    required: true,
  },
  userSubject: {
    type: mongoose.Types.ObjectId,
    required: false,
    refPath: 'User',
  },
  status: {
    type: String,
    required: true,
    default: 'New',
    enum: ['New', 'InProgress', 'Executed', 'Finished'],
  },
  type: {
    type: String,
    required: true,
    enum: ['User', 'Procedure'],
  },
  organization: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'Organization',
  },
  auditTemplate: {
    type: mongoose.Types.ObjectId,
    required: false,
    default: null,
  },
  auditPoints: [{
    type: AuditPointsSchema,
    required: false,
    default: [],
  }],
  actionPoints: [{
    type: ActionPointSchema,
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

AuditSchema.set('toJSON', {
  transform: toJSON,
});

const AuditModel = mongoose.model('Audit', AuditSchema);

module.exports = AuditModel;
