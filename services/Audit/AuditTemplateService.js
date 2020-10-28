const { AuditTemplateModel } = require('../../models/Audits/AuditTemplateModel');

const AuditTemplateService = {
  populate: async function (doc) {
    return doc
      .populate({ path: 'organization', select: 'name' })
  },

  getAuditTemplates: async function(user) {
    const templates = this.populate(await AuditTemplateModel.find({
      organization: user.organization.id,
    }, 'template auditPoints organization'));
    return templates;
  },

  getAuditTemplate: async function(templateId) {
    const template = this.populate(await AuditTemplateModel.findById(templateId));
    return template;
  },

  updateAuditTemplate: async function(id, auditTemplate) {
    const updated = this.populate(await AuditTemplateModel.findByIdAndUpdate(id, auditTemplate));
    return updated;
  },
  
  addAuditTemplate: async function(auditTemplate) {
    const template = this.populate((new AuditTemplateModel(auditTemplate)).save());
    return template;
  },

  deleteAuditTemplate: async function(templateId) {
    const deleted = this.populate(await AuditTemplateModel.findByIdAndDelete(templateId));
    return deleted;
  }
};

module.exports = AuditTemplateService;