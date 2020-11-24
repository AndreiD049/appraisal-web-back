const mongoose = require('mongoose');
const config = require('../../config');
const { AuditService } = require('../../services/Audit');

async function run() {
  try {
    console.log(config.MONGODB_URI);
    await mongoose.connect('mongodb://localhost:27017/adminTools', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Succesfully connected to MONGODB');
    // AuditService.addAudit({
    //   auditSubject: 'Just a subject',
    //   type: 'Procedure',
    //   organization: '5f81cff1c87e766b46443371',
    //   createdUser: '5f8deb4dcb826a0a4898e66a'
    // })
    // AuditService.deleteAudit('5f99c821da3b68034c261f29');
    AuditService.updateAudit('5f99c85f579c8c427c19335e', { type: 'Use' });
  } catch (e) {
    console.error(e);
  }
}

run();
