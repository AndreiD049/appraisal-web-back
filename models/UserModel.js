const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 6,
    maxlength: 50,
    match: /[a-zA-Z1-9]+/,
  },
  fullname: {
    type: String,
    required: false,
    minlength: 5,
    maxlength: 30,
    match: /[a-zA-Z1-9]+/,
  },
  role: {
    type: mongoose.Types.ObjectId,
    ref: 'Role'
  },
  teams: [{
    type: mongoose.Types.ObjectId,
    required: false,
    ref: 'Team',
  }],  
  organization: {
    type: mongoose.Types.ObjectId,
    required: false,
    ref: 'Organization',
  },
  organizations: [{
    type: mongoose.Types.ObjectId,
    required: false,
    ref: 'Organization',
  }]
}, { autoCreate: true });

UserSchema.set('toJSON', {
  transform: toJSON
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;