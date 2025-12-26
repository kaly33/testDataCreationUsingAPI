import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const TEST_ENV = process.env.TEST_ENV || 'staging-us';
const emailFilePath = path.join('test-data', `invited-emails-${TEST_ENV}.json`);
const emailTextFilePath = path.join('test-data', `invited-emails-${TEST_ENV}.txt`);

async function runCommand(command, stepName) {
  console.log(`\n📋 ${stepName}`);
  console.log(`🔧 Command: ${command}`);
  try {
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
    console.log(stdout);
    if (stderr) {
      console.error(`❌ Error in ${stepName}:\n${stderr}`);
      throw new Error(`Command failed: ${command}`);
    }
    console.log(`✅ ${stepName} completed successfully.`);
  } catch (error) {
    console.error(`❌ ${stepName} failed:`, error.message);
    process.exit(1);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Step 1: Cleaning up previous test data...');
  if (fs.existsSync(emailFilePath)) {
    fs.unlinkSync(emailFilePath);
    console.log(`🗑️ Removed previous email file: ${emailFilePath}`);
  }
  if (fs.existsSync(emailTextFilePath)) {
    fs.unlinkSync(emailTextFilePath);
    console.log(`🗑️ Removed previous text email file: ${emailTextFilePath}`);
  }
}

async function runE2ETests() {
  console.log('🚀 Starting End-to-End Test Suite: API + UI');
  console.log('============================================================\n');

  // Step 1: Clean up previous test data
  await cleanupTestData();

  // Step 2: Run API Tests FIRST (this is critical!)
  await runCommand(
    `npx playwright test src/tests/testDataCreation.spec.js --reporter=line --timeout=300000`,
    'Step 2: Running API Tests to create projects and invite users'
  );

  // Step 3: Verify email file was created by API tests
  console.log('\n📧 Step 3: Verifying API test results...');
  if (fs.existsSync(emailFilePath)) {
    const emailData = JSON.parse(fs.readFileSync(emailFilePath, 'utf-8'));
    console.log(`✅ Email file created successfully: ${emailFilePath}`);
    console.log(`📊 Total emails generated: ${emailData.totalEmails}`);
    console.log(`📋 Email summary:`, emailData.summary);
    
    // Display first few emails for verification
    console.log(`\n📧 First 3 invited emails:`);
    emailData.emails.slice(0, 3).forEach((email, index) => {
      console.log(`  ${index + 1}. ${email.email} (${email.userType}) - ${email.firstName} ${email.lastName}`);
    });
  } else {
    console.error(`❌ Email file not found at: ${emailFilePath}`);
    console.error('API tests may not have completed successfully.');
    process.exit(1);
  }

  // Step 4: Run UI Tests with API-generated emails (AFTER API tests complete)
  await runCommand(
    `npx playwright test src/tests/uiEmailRegistration.spec.js -g "Complete invitation flow from API-generated emails" --reporter=line --timeout=180000`,
    'Step 4: Running UI Email Registration Test with API-generated emails'
  );

  // Step 5: Run UI Batch Registration Test (optional)
  await runCommand(
    `npx playwright test src/tests/uiBatchRegistration.spec.js -g "Process all invited emails with new invitation flow" --reporter=line --timeout=180000`,
    'Step 5: Running UI Batch Registration Test with API-generated emails'
  );

  console.log('\n============================================================');
  console.log('🎉 End-to-End Test Suite Completed Successfully!');
  console.log('============================================================');
}

runE2ETests();