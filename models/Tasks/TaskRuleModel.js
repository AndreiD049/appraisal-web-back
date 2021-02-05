const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const { ObjectId } = mongoose.Types;

const validTypes = ['Daily', 'Weekly', 'Monthly'];

const validDayType = ['Work', 'Callendar'];

const validMonthlyOnType = [
  'Day',
  'WorkDay',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TaskRuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: validTypes,
    },
    dailyType: {
      type: String,
      required: false,
      enum: validDayType,
    },
    weeklyDays: [
      {
        type: Number,
        min: 1,
        max: 7,
        required: false,
      },
    ],
    monthlyMonths: [
      {
        type: Number,
        min: 1,
        max: 12,
        required: false,
      },
    ],
    monthlyOn: {
      type: Number,
      required: false,
    },
    monthlyOnType: {
      type: String,
      required: false,
      enum: validMonthlyOnType,
    },
    isBackgroundTask: {
      type: Boolean,
      required: true,
      default: false,
    },
    isSharedTask: {
      type: Boolean,
      required: true,
      default: false,
    },
    taskStartTime: {
      type: Date,
      required: true,
    },
    taskDuration: {
      type: Number,
      required: true,
      min: 0,
    },
    users: [
      {
        type: ObjectId,
        required: false,
        default: [],
        ref: 'User',
      },
    ],
    flows: [
      {
        type: ObjectId,
        required: false,
        default: [],
        ref: 'TaskFlow',
      },
    ],
    organizationId: {
      type: mongoose.ObjectId,
      required: true,
      index: true,
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

TaskRuleSchema.set('toJSON', {
  transform: toJSON,
});

const TaskRuleModel = mongoose.model('TaskRule', TaskRuleSchema);
const TaskRuleView = mongoose.model('TaskRulesView', TaskRuleSchema, 'TaskRulesView', true);

module.exports = {
  TaskRuleModel,
  TaskRuleView,
};
