const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const { ObjectId } = mongoose.Types;

const TaskPlanningSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true,
  },
  user: {
    type: ObjectId,
    required: true,
    index: true,
    ref: 'User',
  },
  flows: [{
    type: ObjectId,
    default: [],
    ref: 'TaskFlow',
  }],
  organizationId: {
    type: mongoose.Types.ObjectId,
    required: true,
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

TaskPlanningSchema.index({ date: 1, user: 1 }, { unique: true });

TaskPlanningSchema.set('toJSON', {
  transform: toJSON,
});

const TaskPlanningModel = mongoose.model('TaskPlanning', TaskPlanningSchema);
const TaskPlanningView = mongoose.model('TaskPlanningView', TaskPlanningSchema, 'TaskPlanningView', true);

module.exports = {
  TaskPlanningModel,
  TaskPlanningView,
};