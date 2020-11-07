const fs = require('fs');
const path = require('path');
const os = require('os');
const { ReportTemplateModel } = require('../../models/Reporting');
const UserService = require('../UserService');

const ReportTemplateService = {
  async addTemplateFromFile(name, filepath, user) {
    const dbUser = await UserService.getUser(user.id);
    const bytes = fs.readFileSync(filepath);
    const result = await ReportTemplateModel.create({
      name,
      template: bytes,
      filename: `${user.id}${path.extname(filepath)}`,
      view: 'appraisalItems',
      organizationId: dbUser.organization.id,
    });
    return result;
  },

  async addTemplateFromBytes(name, filename, bytes, user) {
    const dbUser = await UserService.getUser(user.id);
    const result = await ReportTemplateModel.create({
      name,
      template: bytes,
      filename: `${user.id}${path.extname(filename)}`,
      organizationId: dbUser.organization.id,
    });
    return result;
  },

  async getTemplateFile(name, user) {
    const dbUser = await UserService.getUser(user.id);
    const template = await ReportTemplateModel.findOne({
      name,
      organizationId: dbUser.organization.id,
    });
    const finalPath = path.join(os.tmpdir(), template.filename);
    fs.writeFileSync(path.join(os.tmpdir(), template.filename), template.template);
    console.log(finalPath);
    return finalPath;
  },
};

module.exports = ReportTemplateService;
