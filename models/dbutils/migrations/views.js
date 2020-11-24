const mongoose = require('mongoose');

async function createViews() {
  try {
    const collections = await (await mongoose.connection.db.listCollections().toArray()).map(
      (c) => c.name,
    );
    // Appraisal Items
    if (collections.indexOf('AppraisalItemsView') === -1) {
      mongoose.connection.db.createCollection('AppraisalItemsView', {
        viewOn: 'appraisalitems',
      });
    }

    // Appraisal Periods
    if (collections.indexOf('AppraisalPeriodsView') === -1) {
      mongoose.connection.db.createCollection('AppraisalPeriodsView', {
        viewOn: 'appraisalperiods',
      });
    }

    // Orgnaizations
    if (collections.indexOf('OrganizationsView') === -1) {
      mongoose.connection.db.createCollection('OrganizationsView', {
        viewOn: 'organizations',
      });
    }

    // Permission Codes
    if (collections.indexOf('PermissionCodesView') === -1) {
      mongoose.connection.db.createCollection('PermissionCodesView', {
        viewOn: 'permissioncodes',
      });
    }

    // Permissions
    if (collections.indexOf('PermissionsView') === -1) {
      mongoose.connection.db.createCollection('PermissionsView', {
        viewOn: 'permissions',
      });
    }

    // Roles
    if (collections.indexOf('RolesView') === -1) {
      mongoose.connection.db.createCollection('RolesView', {
        viewOn: 'roles',
      });
    }

    // Teams
    if (collections.indexOf('TeamsView') === -1) {
      mongoose.connection.db.createCollection('TeamsView', {
        viewOn: 'teams',
      });
    }

    // Users
    if (collections.indexOf('UsersView') === -1) {
      mongoose.connection.db.createCollection('UsersView', {
        viewOn: 'users',
      });
    }

    // Action Points
    if (collections.indexOf('ActionPointsView') === -1) {
      mongoose.connection.db.createCollection('ActionPointsView', {
        viewOn: 'actionpoints',
      });
    }

    // Audit
    if (collections.indexOf('AuditsView') === -1) {
      mongoose.connection.db.createCollection('AuditsView', {
        viewOn: 'audits',
      });
    }

    // Audit Template
    if (collections.indexOf('AuditTemplatesView') === -1) {
      mongoose.connection.db.createCollection('AuditTemplatesView', {
        viewOn: 'audittemplates',
      });
    }

    // ReportTemplate
    if (collections.indexOf('ReportTemplatesView') === -1) {
      mongoose.connection.db.createCollection('ReportTemplatesView', {
        viewOn: 'reporttemplates',
      });
    }

    // Report
    if (collections.indexOf('ReportsView') === -1) {
      mongoose.connection.db.createCollection('ReportsView', {
        viewOn: 'reports',
      });
    }
  } catch (e) {
    console.error('Error connecting to mongodb');
  }
}

module.exports = createViews;
