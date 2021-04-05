const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const { ObjectId } = mongoose.Types;

const TaskFlowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    teams: [
      {
        type: ObjectId,
        required: true,
        ref: 'Team',
        index: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    organizationId: {
      type: mongoose.ObjectId,
      required: true,
      index: true,
      ref: 'Organization',
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

TaskFlowSchema.set('toJSON', {
  transform: toJSON,
});

const TaskFlowModel = mongoose.model('TaskFlow', TaskFlowSchema);
const TaskFlowView = mongoose.model('TaskFlowsView', TaskFlowSchema, 'TaskFlowsView', true);

module.exports = {
  TaskFlowModel,
  TaskFlowView,
};
