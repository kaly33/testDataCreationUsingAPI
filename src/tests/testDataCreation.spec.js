import { test } from '@playwright/test';
import fs from 'fs';
import { ApiClient } from '../api/ApiClient.js';
import { TestDataHelper } from '../utils/TestDataHelper.js';
import 'dotenv/config';

// Load environment-specific config JSON
const TEST_ENV = process.env.TEST_ENV || 'staging-us';
const testPrefix = Math.floor(Math.random() * 900) + 100; // 3-digit random number (100-999)
const ENV_CONFIG_PATH = `config/environments/${TEST_ENV}.json`;
let ENV_CONFIG;
try {
  ENV_CONFIG = JSON.parse(fs.readFileSync(ENV_CONFIG_PATH, 'utf-8'));
} catch (err) {
  console.error(`Failed to load environment config at ${ENV_CONFIG_PATH}.`);
  throw err;
}
const ACCOUNT_IDS = ENV_CONFIG.accountIds;

test.describe('Test Data Creation', () => {
  let apiClient;
  let testDataHelper;

  test.beforeAll(async () => {
    const baseUrl = ENV_CONFIG.baseURL;
    const userId = ENV_CONFIG.defaultUserId;
    const region = ENV_CONFIG.region;

    apiClient = new ApiClient(baseUrl);
    testDataHelper = new TestDataHelper();

    apiClient.setHeaders({
      'User-Id': userId,
      'Region': region
    });

    const authData = await apiClient.authenticate(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET
    );
  });

  test('Account 1: Create project 1 and add user', async () => {
    const randomPrefix = Math.floor(Math.random() * 900) + 100;
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const projectData = {
      name: `PR${randomPrefix}-${timestamp}-TESTING ADVANCE ADD WITH CYPRESS test 06`,
      classification: 'production',
      startDate: '2010-01-01',
      endDate: '2015-12-31',
      type: 'Hospital',
      projectValue: { value: 1650000, currency: 'USD' },
      jobNumber: 'HP-0002',
      addressLine1: '123 Main Street',
      addressLine2: 'Suite 2',
      city: 'San Francisco',
      stateOrProvince: 'California',
      postalCode: '94001',
      country: 'United States',
      timezone: 'America/Los_Angeles',
      constructionType: 'New Construction',
      deliveryMethod: 'Unit Price',
      currentPhase: 'Design',
      products: [{ key: 'docs' }, { key: 'build' }]
    };

    console.log('🚀 Account 1: Creating Project 1...');
    let projectResponse;
    try {
      projectResponse = await apiClient.post(
        `/construction/admin/v1/accounts/${ACCOUNT_IDS.account1}/projects`,
        projectData
      );
    } catch (error) {
      console.error('Project 1 creation failed:', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }

    console.log('✅ Account 1: Project 1 created:', {
      projectId: projectResponse.data.id,
      projectName: projectResponse.data.name,
      accountId: projectResponse.data.accountId
    });

    testDataHelper.storeProjectData(projectResponse.data.id, projectResponse.data);

    const userData = {
      email: `${testPrefix}user_apma_${TEST_ENV}+13@pbrnfri5.mailosaur.net`,
      firstName: 'APMA',
      lastName: 'User',
      products: [{ key: 'projectAdministration', access: 'administrator' }]
    };

    console.log('👤 Account 1: Adding user to Project 1...');
    const userResponse = await apiClient.post(
      `/construction/admin/v1/projects/${testDataHelper.getProjectId()}/users`,
      userData
    );

    console.log('✅ Account 1: Project Admin User added to Project 1:', {
      userId: userResponse.data.autodeskId,
      email: userResponse.data.email
    });

    testDataHelper.storeUserData(userResponse.data.autodeskId, userResponse.data);
    testDataHelper.addInvitedEmail(userData.email, 'project_admin', ACCOUNT_IDS.account1, projectResponse.data.id, userData.firstName, userData.lastName);

    // Invite Account Admin User 1 (App Gallery)
    console.log('👤 Account 1: Inviting Account Admin User 1 to Account 1...');
    const accountAdmin1Data = {
      email: `${testPrefix}app_gallery_1_${TEST_ENV}+01@pbrnfri5.mailosaur.net`,
      firstName: 'App Gallery',
      lastName: 'One',
      accessLevels: {
        accountAdmin: true,
        accountStandardsAdministrator: true
      }
    };

    const accountAdmin1Response = await apiClient.post(
      `/bim360/admin/v1/accounts/${ACCOUNT_IDS.account1}/users`,
      accountAdmin1Data
    );

    console.log('✅ Account 1: Account Admin User 1 invited:', {
      userId: accountAdmin1Response.data.id,
      email: accountAdmin1Response.data.email
    });

    testDataHelper.storeAccountAdmin1Data(accountAdmin1Response.data.id, accountAdmin1Response.data);
    testDataHelper.addInvitedEmail(accountAdmin1Data.email, 'account_admin', ACCOUNT_IDS.account1, null, accountAdmin1Data.firstName, accountAdmin1Data.lastName);

    // Invite Account Admin User 2 (Custom user)
    console.log('👤 Account 1: Inviting Account Admin User 2 to Account 1...');
    const accountAdmin2Data = {
      email: `${testPrefix}custom_ints_1_${TEST_ENV}+01@pbrnfri5.mailosaur.net`,
      firstName: 'Custom',
      lastName: 'user',
      accessLevels: {
        accountAdmin: true,
        accountStandardsAdministrator: true
      }
    };

    const accountAdmin2Response = await apiClient.post(
      `/bim360/admin/v1/accounts/${ACCOUNT_IDS.account1}/users`,
      accountAdmin2Data
    );

    console.log('✅ Account 1: Account Admin User 2 invited:', {
      userId: accountAdmin2Response.data.id,
      email: accountAdmin2Response.data.email
    });

    testDataHelper.storeAccountAdmin2Data(accountAdmin2Response.data.id, accountAdmin2Response.data);
    testDataHelper.addInvitedEmail(accountAdmin2Data.email, 'account_admin', ACCOUNT_IDS.account1, null, accountAdmin2Data.firstName, accountAdmin2Data.lastName);
  });

  test('Account 2: Create project 2 and add user', async () => {
    const randomPrefix = Math.floor(Math.random() * 900) + 100;
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const projectData = {
      name: `PR${randomPrefix}-${timestamp}-CYPRESS-MFA`,
      classification: 'production',
      startDate: '2010-01-01',
      endDate: '2015-12-31',
      type: 'Hospital',
      projectValue: { value: 1650000, currency: 'USD' },
      jobNumber: 'HP-0002',
      addressLine1: '123 Main Street',
      addressLine2: 'Suite 2',
      city: 'San Francisco',
      stateOrProvince: 'California',
      postalCode: '94001',
      country: 'United States',
      timezone: 'America/Los_Angeles',
      constructionType: 'New Construction',
      deliveryMethod: 'Unit Price',
      currentPhase: 'Design',
      products: [{ key: 'docs' }, { key: 'build' }]
    };

    console.log('🚀 Account 2: Creating Project 2...');
    let projectResponse;
    try {
      projectResponse = await apiClient.post(
        `/construction/admin/v1/accounts/${ACCOUNT_IDS.account2}/projects`,
        projectData
      );
    } catch (error) {
      console.error('Project 2 creation failed:', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }

    console.log('✅ Account 2: Project 2 created:', {
      projectId: projectResponse.data.id,
      projectName: projectResponse.data.name,
      accountId: projectResponse.data.accountId
    });

    testDataHelper.storeProject2Data(projectResponse.data.id, projectResponse.data);

    const userData = {
      email: `${testPrefix}user_mfa_${TEST_ENV}+01@pbrnfri5.mailosaur.net`,
      firstName: 'MFA',
      lastName: 'User',
      products: [{ key: 'projectAdministration', access: 'administrator' }]
    };

    console.log('👤 Adding user to Project 2...');
    const userResponse = await apiClient.post(
      `/construction/admin/v1/projects/${projectResponse.data.id}/users`,
      userData
    );

    console.log('✅ Account 2:Project Admin User added to Project 2:', {
      userId: userResponse.data.autodeskId,
      email: userResponse.data.email
    });

    testDataHelper.storeUser2Data(userResponse.data.autodeskId, userResponse.data);
    testDataHelper.addInvitedEmail(userResponse.data.email, 'project_admin', ACCOUNT_IDS.account2, testDataHelper.getProject2Id(), userResponse.data.firstName, userResponse.data.lastName);

    // 1. Add Project Admin User to Account 2
    console.log('👤 Account 2:Adding Project Admin User to Account 2...');
    const account2ProjectAdminData = {
      email: `${testPrefix}user_mfa_${TEST_ENV}+05@pbrnfri5.mailosaur.net`,
      firstName: 'MFA',
      lastName: 'User',
      products: [{ key: 'projectAdministration', access: 'administrator' }]
    };

    const account2ProjectAdminResponse = await apiClient.post(
      `/construction/admin/v1/projects/${projectResponse.data.id}/users`,
      account2ProjectAdminData
    );

    console.log('✅ Account 2:Project Admin User added to Account 2:', {
      userId: account2ProjectAdminResponse.data.autodeskId,
      email: account2ProjectAdminResponse.data.email
    });

    testDataHelper.storeAccount2ProjectAdminData(account2ProjectAdminResponse.data.autodeskId, account2ProjectAdminResponse.data);
    testDataHelper.addInvitedEmail(account2ProjectAdminData.email, 'project_admin', ACCOUNT_IDS.account2, testDataHelper.getProject2Id(), account2ProjectAdminData.firstName, account2ProjectAdminData.lastName);

    // 2. Add Project Executive to Account 2
    console.log('👤 Account 2: Adding Project Executive to Account 2...');
    const account2ProjectExecutiveData = {
      email: `${testPrefix}user_mfa_${TEST_ENV}+04@pbrnfri5.mailosaur.net`,
      firstName: 'MFA',
      lastName: 'User',
      accessLevels: {
        executive: true
      }
    };

    const account2ProjectExecutiveResponse = await apiClient.post(
      `/bim360/admin/v1/accounts/${ACCOUNT_IDS.account2}/users`,
      account2ProjectExecutiveData
    );

    console.log('✅ Project Executive added to Account 2:', {
      userId: account2ProjectExecutiveResponse.data.id,
      email: account2ProjectExecutiveResponse.data.email
    });

    testDataHelper.storeAccount2ProjectExecutiveData(account2ProjectExecutiveResponse.data.id, account2ProjectExecutiveResponse.data);
    testDataHelper.addInvitedEmail(account2ProjectExecutiveData.email, 'project_executive', ACCOUNT_IDS.account2, null, account2ProjectExecutiveData.firstName, account2ProjectExecutiveData.lastName);



    // 5. Add Account Admin User to Account 2
    console.log('👤 Account 2: Inviting Account Admin User to Account 2...');
    const account2AdminData = {
      email: `${testPrefix}user_mfa_${TEST_ENV}+02@pbrnfri5.mailosaur.net`,
      firstName: 'MFA',
      lastName: 'User',
      accessLevels: {
        accountAdmin: true,
        accountStandardsAdministrator: true
      }
    };

    const account2AdminResponse = await apiClient.post(
      `/bim360/admin/v1/accounts/${ACCOUNT_IDS.account2}/users`,
      account2AdminData
    );

    console.log('✅ Account 2: Account Admin User invited to Account 2:', {
      userId: account2AdminResponse.data.id,
      email: account2AdminResponse.data.email
    });

    testDataHelper.storeAccount2AdminData(account2AdminResponse.data.id, account2AdminResponse.data);
    testDataHelper.addInvitedEmail(account2AdminData.email, 'account_admin', ACCOUNT_IDS.account2, null, account2AdminData.firstName, account2AdminData.lastName);

    // 6. Add Oversheetlimit Account Admin User to Account 2
    console.log('👤 Account 2: Inviting Oversheetlimit Account Admin User to Account 2...');
    const account2OversheetAdminData = {
      email: `${testPrefix}oversheetlimit+${TEST_ENV}@pbrnfri5.mailosaur.net`,
      firstName: 'overlimit',
      lastName: 'sheet',
      accessLevels: {
        accountAdmin: true,
        accountStandardsAdministrator: true
      }
    };

    const account2OversheetAdminResponse = await apiClient.post(
      `/bim360/admin/v1/accounts/${ACCOUNT_IDS.account2}/users`,
      account2OversheetAdminData
    );

    console.log('✅ Account 2: Oversheetlimit Account Admin User invited to Account 2:', {
      userId: account2OversheetAdminResponse.data.id,
      email: account2OversheetAdminResponse.data.email
    });

    testDataHelper.storeAccount2OversheetAdminData(account2OversheetAdminResponse.data.id, account2OversheetAdminResponse.data);
    testDataHelper.addInvitedEmail(account2OversheetAdminData.email, 'account_admin', ACCOUNT_IDS.account2, null, account2OversheetAdminData.firstName, account2OversheetAdminData.lastName);

    console.log('\n📊 Test Data Creation Summary:');
    console.log('Account 1: Project 1 ID:', testDataHelper.getProjectId());
    console.log('Account 2: Project 2 ID:', projectResponse.data.id);
    console.log('Account 1 ID:', ACCOUNT_IDS.account1);
    console.log('Account 2 ID:', ACCOUNT_IDS.account2);
    console.log('Account 1: Account Admin 1 ID:', testDataHelper.getAccountAdmin1Id());
    console.log('Account 1: Account Admin 2 ID:', testDataHelper.getAccountAdmin2Id());
    console.log('Account 2 Project Admin ID:', testDataHelper.getAccount2ProjectAdminId());
    console.log('Account 2 Project Executive ID:', testDataHelper.getAccount2ProjectExecutiveId());
    console.log('Account 2 Admin ID:', testDataHelper.getAccount2AdminId());
    console.log('Account 2 Oversheet Admin ID:', testDataHelper.getAccount2OversheetAdminId());
    
    // Save all invited emails to file for UI registration testing
    console.log('\n📧 Saving invited emails for UI registration testing...');
    const emailFilePath = await testDataHelper.saveInvitedEmailsToFile(`invited-emails-${TEST_ENV}.json`);
    const textFilePath = await testDataHelper.saveEmailsToTextFile(`invited-emails-${TEST_ENV}.txt`);
    
    console.log(`✅ Email files created:`);
    console.log(`   JSON: ${emailFilePath}`);
    console.log(`   Text: ${textFilePath}`);
  });
});


