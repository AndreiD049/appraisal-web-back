const Joi = require('joi');
const constants = require('../../config/constants');

const dailyTypeSchema = Joi.object({
  fromDate: Joi.date().required(),
  toDate: Joi.date().required(),
  users: Joi.array().required(),
});

const taskSchema = Joi.object({
  status: Joi.string(),
  priority: Joi.number(),
  ruleId: Joi.string(),
  title: Joi.string().required(),
  description: Joi.string().empty(''),
  remarks: Joi.string().empty(''),
  expectedStartDate: Joi.date().required(),
  expectedFinishDate: Joi.date().required(),
  actualStartDate: Joi.date(),
  actualDuration: Joi.number(),
  actualFinishDate: Joi.date(),
  assignedTo: Joi.array(),
  relatedFlows: Joi.array(),
  isBackgroundTask: Joi.bool().required(),
  organizationId: Joi.string(),
  zone: Joi.string(),
});

const taskRuleSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().empty(''),
  type: Joi.string().allow(...Object.keys(constants.tasks.types)).required(),
  dailyType: Joi.string().allow(...Object.keys(constants.tasks.DayTypes)),
  weeklyDays: Joi.array().items(Joi.date()),
  monthlyMonths: Joi.array().items(Joi.date()),
  monthlyOn: Joi.number(),
  monthlyOnType: Joi.string().allow(...Object.keys(constants.tasks.MonthlyOnType)),
  isBackgroundTask: Joi.bool().required(),
  isSharedTask: Joi.bool().required(),
  taskStartTime: Joi.date().required(),
  validFrom: Joi.date().required(),
  validTo: Joi.date(),
  generatedUntil: Joi.date(),
  taskDuration: Joi.number(),
  users: Joi.array(),
  flows: Joi.array(),
  zone: Joi.string(),
  organizationId: Joi.string(),
  createdUser: Joi.string(),
});

const taskStatusUpdateSchema = Joi.object({
  status: Joi.string().allow('New', 'InProgress', 'Paused', 'Finished', 'Cancelled').required(),
  actualStartDate: Joi.date(),
  actualFinishDate: Joi.date(),
});

const checkBusySchema = Joi.object({
  user: Joi.string().required(),
});

const taskPlanningSchema = Joi.array().items(Joi.object({
  date: Joi.date().required(),
  user: Joi.string().required(),
  flows: Joi.array().required(),
}));

module.exports = {
  dailyTypeSchema,
  taskSchema,
  taskRuleSchema,
  taskStatusUpdateSchema,
  checkBusySchema,
  taskPlanningSchema,
}