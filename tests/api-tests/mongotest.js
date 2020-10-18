const mongoose = require('mongoose');
const config = require('../../config');
const PermissionCodeModel = require('../../models/PermissionCodeModel');
const UserModel = require('../../models/UserModel');
const { RoleService, AuthorizationService, PermissionService } = require('../../services/AuthorizationService');
const UserService = require('../../services/UserService');

async function run() {
  try
  {
    console.log(config.MONGODB_URI);
    await mongoose.connect('mongodb://localhost:27017/adminTools', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Succesfully connected to MONGODB');
    // console.log(await PermissionService.addPermission({
    //   code: '5f8af149292f0a3bb468a365',
    //   permissionType: 'User',
    //   reference: '5f8ae49fab2c8c3a84d46abc',
    //   createdUser: '5f8ae49fab2c8c3a84d46abc'
    // }))
    // console.log(await PermissionService.getPermissionById('5f8aead0f2259107503707ab'));
    // console.log(await PermissionService.getPermissionsByCode('TEST'));
    // console.log(await PermissionService.updatePermissionById('5f8aead0f2259107503707ab', {
    //   name: 'SomeOtherName'
    // }))
    // console.log(await (await PermissionService.updatePermissionByName('SomeOtherName', {
    //   name: 'SomeOtherName2'
    // })).populate('reference').execPopulate());
    // console.log(await PermissionService.getUserPermissions('5f8ae49fab2c8c3a84d46abc'));
    // console.log(await PermissionService.addPermissionCode({
    //   code: 'TEST',
    //   description: 'Test Permission Code',
    //   createdUser: '5f8ad8aecdd100010dfa281a'
    // }));
    console.log(await PermissionService.getUserOrganizationMembersPermissions('5f8b02c46df2242f63a2cc3d'));
  } catch (e)
  {
    console.error(e);
  }
}

run();