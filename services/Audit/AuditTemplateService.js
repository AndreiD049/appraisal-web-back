const { AuditTemplateModel } = require('../../models/Audits/AuditTemplateModel');

const AuditTemplateService = {
  async populate(doc) {
    return doc.populate({ path: 'organization', select: 'name' });
  },

  async getAuditTemplates(user) {
    const templates = this.populate(
      await AuditTemplateModel.find(
        {
          organization: user.organization.id,
        },
        'template auditPoints organization',
      ),
    );
    return templates;
  },

  async getAuditTemplate(templateId) {
    const template = this.populate(await AuditTemplateModel.findById(templateId));
    return template;
  },

  async updateAuditTemplate(id, auditTemplate) {
    const updated = this.populate(await AuditTemplateModel.findByIdAndUpdate(id, auditTemplate));
    return updated;
  },

  async addAuditTemplate(auditTemplate) {
    const template = this.populate(new AuditTemplateModel(auditTemplate).save());
    return template;
  },

  async deleteAuditTemplate(templateId) {
    const deleted = this.populate(await AuditTemplateModel.findByIdAndDelete(templateId));
    return deleted;
  },
};

module.exports = AuditTemplateService;
