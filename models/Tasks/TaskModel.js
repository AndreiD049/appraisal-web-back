const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');
const validStatuses = Object.values(require('../../config/constants').tasks.status);

const { ObjectId } = mongoose.Types;

const TaskSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: false,
      default: 'New',
      enum: validStatuses,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 3,
    },
    ruleId: {
      type: ObjectId,
      required: false,
      default: null,
      ref: 'TaskRule',
      index: true,
    },
    flowId: {
        type: ObjectId,
        required: false,
        default: null,
        ref: 'TaskFlow',
    },
    title: {
      type: String,
      required: true,
      default: '',
    },
    description: {
      type: String,
      required: false,
    },
    remarks: {
      type: String,
      required: false,
    },
    expectedStartDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    actualStartDate: {
      type: Date,
      required: false,
      default: null,
    },
    lastStartDate: {
      type: Date,
      required: false,
      default: null,
    },
    actualDuration: {
      type: Number, // Number of minutes
      required: false,
      default: 0,
    },
    actualFinishDate: {
      type: Date,
      required: false,
      default: null,
    },
    userStarted: {
      type: ObjectId,
      ref: 'User',
    },
    userFinished: {
      type: ObjectId,
      ref: 'User',
    },
    assignedTo: [
      {
        type: ObjectId,
        required: true,
        ref: 'User',
      },
    ],
    isBackgroundTask: {
      type: Boolean,
      required: true,
    },
    zone: {
      type: String,
      required: true,
    },
    organizationId: {
      type: mongoose.ObjectId,
      required: true,
      index: true,
    },
    createdUser: {
      type: ObjectId,
      required: true,
      ref: 'User',
    },
    modifiedUser: {
      type: ObjectId,
      required: false,
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

TaskSchema.index({ title: 1, ruleId: 1, expectedStartDate: 1, assignedTo: 1 }, { unique: true });

TaskSchema.set('toJSON', {
  transform: toJSON,
});

const TaskModel = mongoose.model('Task', TaskSchema);
const TaskView = mongoose.model('TasksView', TaskSchema, 'TasksView', true);

module.exports = {
  TaskModel,
  TaskView,
};
