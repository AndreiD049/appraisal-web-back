const { AuditModel } = require('../../models/Audits');
const UserService = require('../UserService');

const validations = {
  validateDelete(audit) {
    if (audit.actionPoints.length) { throw new Error('Audit cannot be deleted. Action points present.'); }
    if (audit.status !== 'New') throw new Error('Audit cannot be deleted. Status is not \'New\'');
  },
};

const AuditService = {
  populate: (doc) => doc
    .populate({ path: 'auditor', select: 'username' })
    .populate({ path: 'organization', select: 'name' }),

  /**
   * Get current user's audits.
   * Current user's audits have the same organization as the user.
   */
  async getAudits(user) {
    const userDb = await UserService.getUser(user.id);
    const audits = await this.populate(AuditModel.find({
      organization: userDb.organization.id,
    }).select([
      '-createdUser',
      '-createdDate',
      '-modifiedUser',
      '-modifiedDate',
    ]));
    return audits;
  },

  async updateAudit(auditId, audit) {
    const updated = AuditModel
      .findByIdAndUpdate(auditId, audit, { new: true, runValidators: true });
    return this.populate(updated)
      .select([
        '-createdUser',
        '-createdDate',
        '-modifiedUser',
        '-modifiedDate',
      ]);
  },

  async addAudit(audit) {
    const created = this.populate(await (new AuditModel(audit)).save());
    const result = await AuditModel
      .findById(created.id)
      .select([
        '-createdUser',
        '-createdDate',
        '-modifiedUser',
        '-modifiedDate',
      ]);
    return result;
  },

  async deleteAudit(id) {
    const audit = await AuditModel.findById(id);
    if (audit) {
      validations.validateDelete(audit);
      const deleted = this.populate(await audit.deleteOne());
      return deleted;
    }
    return null;
  },

};

module.exports = AuditService;
