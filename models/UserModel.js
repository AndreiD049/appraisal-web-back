const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 6,
      maxlength: 50,
      match: /[a-zA-Z1-9]+/,
      index: true,
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
      ref: 'Role',
    },
    teams: [
      {
        type: mongoose.Types.ObjectId,
        required: false,
        ref: 'Team',
      },
    ],
    team: {
      type: mongoose.Types.ObjectId,
      required: false,
      ref: 'Team',
    },
    organization: {
      type: mongoose.Types.ObjectId,
      required: false,
      ref: 'Organization',
    },
    organizations: [
      {
        type: mongoose.Types.ObjectId,
        required: false,
        ref: 'Organization',
        index: true,
      },
    ],
  },
  {
    timestamps: {
      createdAt: 'createdDate',
      updatedAt: 'modifiedDate',
    },
  },
);

UserSchema.set('toJSON', {
  transform: toJSON,
});

const UserModel = mongoose.model('User', UserSchema);
const UsersView = mongoose.model('UsersView', UserSchema, 'UsersView', true);

module.exports = {
  UserModel,
  UsersView,
};
