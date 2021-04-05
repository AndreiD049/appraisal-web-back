const mongoose = require('mongoose');
const { toJSON } = require('./dbutils');

const TeamSchema = new mongoose.Schema(
  {
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
    organizationId: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    modifiedUser: {
      type: mongoose.Types.ObjectId,
      required: false,
    },
  },
  {
    timestamps: {
      createdAt: 'createdDate',
      updatedAt: 'modifiedDate',
    },
  },
);

TeamSchema.set('toJSON', {
  transform: toJSON,
});

const TeamModel = mongoose.model('Team', TeamSchema);
const TeamsView = mongoose.model('TeamsView', TeamSchema, 'TeamsView', true);

module.exports = {
  TeamModel,
  TeamsView,
};
