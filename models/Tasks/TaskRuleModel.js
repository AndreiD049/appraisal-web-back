const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');
const { types, DayTypes, MonthlyOnType } = require('../../config/constants').tasks;

const { ObjectId } = mongoose.Types;

const validTypes = Object.values(types);

const validDayType = Object.values(DayTypes);

const validMonthlyOnType = Object.values(MonthlyOnType);

const TaskRuleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
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
        type: Date,
        required: false,
      },
    ],
    monthlyMonths: [
      {
        type: Date,
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
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      default: null,
    },
    generatedUntil: {
      type: Date,
      default: null,
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
