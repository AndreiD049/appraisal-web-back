const { ReportTemplateModel } = require('../../models/Reporting');
const fs = require('fs'); 
const path = require('path'); 
const os = require('os');
const UserService = require('../UserService');

const ReportTemplateService = { 
  addTemplateFromFile: async function(name, filepath, user) {
    const dbUser = await UserService.getUser(user.id);
    const bytes = fs.readFileSync(filepath);
    const result = await ReportTemplateModel.create({
      name: name,
      template: bytes,
      filename: `${user.id}${path.extname(filepath)}`,
      view: 'appraisalItems',
      organizationId: dbUser.organization.id
    });
    return result;
  },

  addTemplateFromBytes: async function(name, filename, bytes, user) {
    const dbUser = await UserService.getUser(user.id);
    const result = await ReportTemplateModel.create({
      name: name,
      template: bytes,
      filename: `${user.id}${path.extname(filename)}`,
      organizationId: dbUser.organization.id
    });
    return result;
  },

  getTemplateFile: async function(name, user) {
    const dbUser = await UserService.getUser(user.id);
    const template = await ReportTemplateModel.findOne({
      name: name,
      organizationId: dbUser.organization.id
    });
    const finalPath = path.join(os.tmpdir(), template.filename)
    fs.writeFileSync(path.join(os.tmpdir(), template.filename), template.template);
    console.log(finalPath)
    return finalPath;
  }
};

module.exports = ReportTemplateService;