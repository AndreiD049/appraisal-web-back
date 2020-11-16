const mongoose = require('mongoose');
const { PermissionCodeModel } = require('../../PermissionCodeModel');
const constants = require('../../../config/constants');

async function createCodes() {
  const { securities } = constants;
  const keys = Object.keys(securities);
  keys.forEach(async (key) => {
    const grants = Object.values(securities[key].grants);
    const doc = await PermissionCodeModel.findOne({
      code: securities[key].code,
    });
    // Create new doc
    if (!doc) {
      const newCode = new PermissionCodeModel({
        ...securities[key],
        grants,
        createdUser: new mongoose.Types.ObjectId(),
      });
      await newCode.save();
    } else {
      await doc.updateOne({
        description: securities[key].description,
        grants,
      });
    }
  });
}

module.exports = createCodes;
