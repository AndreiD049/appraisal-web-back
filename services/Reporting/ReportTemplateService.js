const fs = require('fs');
const path = require('path');
const os = require('os');
const { ReportTemplateModel } = require('../../models/Reporting');
const UserService = require('../UserService');

const ReportTemplateService = {
  async addTemplate(template, user) {
    const dbUser = await UserService.getUser(user.id);
    const dbTemplate = {
      ...template,
      organizationId: dbUser.organization.id,
      createdUser: dbUser.id,
      createdDate: new Date(),
    };
    const result = await ReportTemplateModel.create(dbTemplate);
    return result;
  },

  /**
   * @param {string} name
   * @param {any} user
   * Get template by name.
   * Search the template in current user's organization/
   */
  async getTemplate(name, user) {
    const dbUser = await UserService.getUser(user.id);
    const template = await ReportTemplateModel.findOne({
      name,
      organizationId: dbUser.organization.id,
    });
    return template;
  },
};

module.exports = ReportTemplateService;
