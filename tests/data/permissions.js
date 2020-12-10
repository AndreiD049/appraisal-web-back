const mongoose = require('mongoose');
const { OrganizationModel } = require('../../models/OrganizationModel');
const { PermissionCodeModel } = require('../../models/PermissionCodeModel');
const { PermissionModel } = require('../../models/PermissionModel');
const { RoleModel } = require('../../models/RoleModel');
const sec = require('../../config/constants').securities;

const data = [
  // Admin permissions. Just all.
  {
    code: sec.REPORTS.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.REPORTS.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.APPRAISAL_DETAILS.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.APPRAISAL_DETAILS.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.APPRAISAL_DETAILS_OTHER.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.APPRAISAL_DETAILS_OTHER.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.APPRAISAL_PERIODS.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.APPRAISAL_PERIODS.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.SETTINGS.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.SETTINGS.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.AUDITS.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.AUDITS.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.REPORT_TEMPLATES.code,
    reference: 'Admin', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: Object.values(sec.REPORT_TEMPLATES.grants),
    createdUser: new mongoose.Types.ObjectId(),
  },
  // User permissions, only some
  {
    code: sec.REPORTS.code,
    reference: 'User', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: [sec.REPORTS.grants.read],
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.APPRAISAL_DETAILS.code,
    reference: 'User', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: ['read', 'create', 'update', 'delete'],
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.APPRAISAL_PERIODS.code,
    reference: 'User', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: [sec.APPRAISAL_PERIODS.grants.read],
    createdUser: new mongoose.Types.ObjectId(),
  },
  {
    code: sec.SETTINGS.code,
    reference: 'User', // Role
    organization: 'Test',
    permissionType: 'Role',
    grants: ['read', 'general'],
    createdUser: new mongoose.Types.ObjectId(),
  },
];

const permissions = async () => {
  await PermissionModel.deleteMany({});
  await Promise.all(
    data.map(async (rec) => {
      const code = await PermissionCodeModel.findOne({ code: rec.code });
      const role = await RoleModel.findOne({ name: rec.reference });
      const organization = await OrganizationModel.findOne({ name: rec.organization });
      await PermissionModel.create({
        ...rec,
        code: code.id,
        reference: role.id,
        organization: organization.id,
      });
    }),
  );
};

module.exports = permissions;
