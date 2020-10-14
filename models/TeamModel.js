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
    type: String,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
}, { autoCreate: true });

TeamSchema.set('toJSON', {
  transform: toJSON
});

const TeamModel = mongoose.model('Team', TeamSchema);

module.exports = TeamModel;
