const constants = {
  securities: {
    REPORTS: {
      code: 'REPORTS',
      description: 'Access to view, generate, create and edit reports',
      grants: {
        read: 'read',
        create: 'create',
        update: 'update',
        delete: 'delete',
      },
    },
    APPRAISAL_DETAILS: {
      code: 'APPRAISAL DETAILS',
      description: 'Access to see, add, edit, delete Appraisal details for user himself',
      grants: {
        read: 'read',
        create: 'create',
        update: 'update',
        delete: 'delete',
        createFinished: 'create-finished',
        updateFinished: 'update-finished',
        deleteFinished: 'delete-finished',
      },
    },
    APPRAISAL_DETAILS_OTHER: {
      code: 'APPRAISAL DETAILS - OTHER USERS',
      description: 'Access to see, add, edit, delete Appraisal details for other users within the team',
      grants: {
        read: 'read',
        create: 'create',
        update: 'update',
        delete: 'delete',
        createFinished: 'create-finished',
        updateFinished: 'update-finished',
        deleteFinished: 'delete-finished',
      },
    },
    APPRAISAL_PERIODS: {
      code: 'APPRAISAL PERIODS',
      description: 'Access to see, add, edit, finish Appraisal Periods',
      grants: {
        read: 'read',
        create: 'create',
        update: 'update',
        delete: 'delete',
        finish: 'finish',
      },
    },
    SETTINGS: {
      code: 'SETTINGS',
      description: 'Access to various settings. Be careful about following: users - will allow users to modify other users; permissions - will allow users to alter permissions',
      grants: {
        read: 'read',
        general: 'general',
        users: 'users',
        appraisalItems: 'appraisal-items',
        appraisalPeriods: 'appraisal-periods',
        permissions: 'permissions',
      },
    },
    AUDITS: {
      code: 'AUDITS',
      description: 'Access to request, execute, update, delete audits.',
      grants: {
        read: 'read',
        create: 'create',
        update: 'update',
        delete: 'delete',
      },
    },
    REPORT_TEMPLATES: {
      code: 'REPORT-TEMPLATES',
      description: 'Access to create and edit report templates',
      grants: {
        read: 'read',
        create: 'create',
        update: 'update',
        delete: 'delete',
      },
    },
  },
};

module.exports = constants;
