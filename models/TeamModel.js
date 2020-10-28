const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 30,
  },
  createdUser: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  modifiedUser: {
    type: mongoose.Types.ObjectId,
    required: false,
  },
  modifiedDate: {
    type: Date,
  },
}, { autoCreate: true });

TeamSchema.set('toJSON', {
  transform: toJSON
});

const TeamModel = mongoose.model('Team', TeamSchema);

module.exports = TeamModel;
