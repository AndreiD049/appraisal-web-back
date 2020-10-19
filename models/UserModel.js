const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const autoPopulate = function(next) {
  this
    .populate({ path: 'role', select: 'name' })
    .populate({ path: 'teams', select: 'name' })
    .populate({ path: 'organizations', select: 'name' })
    .populate({ path: 'organization', select: 'name' });
  next();
}

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

UserSchema
  .pre('find', autoPopulate)
  .pre('findOne', autoPopulate)
  .pre('findOneAndRemove', autoPopulate)
  .pre('findOneAndUpdate', autoPopulate);

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;