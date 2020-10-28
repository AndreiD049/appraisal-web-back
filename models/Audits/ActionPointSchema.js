const mongoose = require('mongoose');
const { toJSON } = require('../dbutils');

const ActionPointSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Training', 'Other']
  },
  action: {
    type: String,
    required: true,
    minlength: 5
  },
  status: {
    type: String,
    required: true,
    enum: ['New', 'InProgress', 'Finished']
  }, 
  createdUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  modifiedDate: {
    type: Date,
  }
});

ActionPointSchema.set('toJSON', {
  transform: toJSON
});

const ActionPointModel = mongoose.model('ActionPoint', ActionPointSchema);

module.exports = {
  ActionPointSchema,
  ActionPointModel
}