import { test } from '@playwright/test';
import fs from 'fs';
import { ApiClient } from '../api/ApiClient.js';
import { TestDataHelper } from '../utils/TestDataHelper.js';
import 'dotenv/config';

// Load environment-specific config JSON
const TEST_ENV = process.env.TEST_ENV || 'staging-us';
const ENV_CONFIG_PATH = `config/environments/${TEST_ENV}.json`;
let ENV_CONFIG;
try {
  ENV_CONFIG = JSON.parse(fs.readFileSync(ENV_CONFIG_PATH, 'utf-8'));
} catch (err) {
  console.error(`Failed to load environment config at ${ENV_CONFIG_PATH}.`);
  throw err;
}
const ACCOUNT_IDS = ENV_CONFIG.accountIds;

test.describe('Single User Test Data Creation', () => {
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

    // Get environment-specific credentials
    const clientId = (TEST_ENV === 'prod-us' || TEST_ENV === 'prod-emea' || TEST_ENV === 'prod-aus')
      ? process.env.CLIENT_ID_PROD || process.env.CLIENT_ID
      : process.env.CLIENT_ID;
    const clientSecret = (TEST_ENV === 'prod-us' || TEST_ENV === 'prod-emea' || TEST_ENV === 'prod-aus')
      ? process.env.CLIENT_SECRET_PROD || process.env.CLIENT_SECRET
      : process.env.CLIENT_SECRET;

    console.log(`🔑 Using ${(TEST_ENV === 'prod-us' || TEST_ENV === 'prod-emea' || TEST_ENV === 'prod-aus') ? 'production' : 'staging'} credentials...`);

    const authData = await apiClient.authenticate(
      clientId,
      clientSecret
    );
  });

  test('Add single custom user as account admin', async () => {
    // Get account ID from environment variable or use default
    const accountId = process.env.ACCOUNT_ID || ACCOUNT_IDS[0];

    console.log('🎯 Using account:');
    console.log('   Account ID:', accountId);

    // Add the custom user as account admin
    const customEmail = process.env.USER_EMAIL || 'custom@pbrnfri5.mailosaur.net';
    const userData = {
      email: customEmail,
      firstName: 'Custom',
      lastName: 'Integration',
      accessLevels: {
        accountAdmin: true,
        accountStandardsAdministrator: true
      }
    };

    console.log('👤 Adding custom user as Account Admin...');
    
    // Use different API path based on environment
    let apiPath;
    if (TEST_ENV === 'qa') {
      apiPath = `/bim360-qa/admin/v1/accounts/${accountId}/users`;
    } else if (TEST_ENV === 'prod-emea') {
      apiPath = `/ea-api/v1/accounts/${accountId}/users`;
    } else {
      apiPath = `/bim360/admin/v1/accounts/${accountId}/users`;
    }
    
    console.log(`🔗 Using API path: ${apiPath}`);
    
    let userResponse;
    try {
      userResponse = await apiClient.post(
        apiPath,
        userData
      );
    } catch (error) {
      console.error('Account Admin user creation failed:', {
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
    
    console.log('✅ Custom user added as Account Admin:', {
      userId: userResponse.data.id,
      email: userResponse.data.email
    });

    // Save the user details for UI tests (no project ID needed for account admin)
    testDataHelper.addInvitedEmail(
      customEmail,
      'account_admin',
      accountId,
      null, // No project ID for account-level user
      userData.firstName,
      userData.lastName
    );

    console.log('📧 Added email to collection:', `${customEmail} (account_admin) - ${userData.firstName} ${userData.lastName}`);

    // Save invited emails for UI registration testing
    console.log('\n📧 Saving invited emails for UI registration testing...');
    const emailFilePath = await testDataHelper.saveInvitedEmailsToFile(`invited-emails-${TEST_ENV}.json`);
    const textFilePath = await testDataHelper.saveEmailsToTextFile(`invited-emails-${TEST_ENV}.txt`);
    
    console.log('✅ Email files created:');
    console.log('   JSON:', emailFilePath);
    console.log('   Text:', textFilePath);
  });
});
