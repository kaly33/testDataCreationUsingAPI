import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_ENV = process.env.TEST_ENV || 'staging-us';

console.log('🚀 Starting Single User E2E Test Suite: API + UI');
console.log('============================================================');
console.log(`Environment: ${TEST_ENV}`);
console.log(`Email: custom-int@pbrnfri5.mailosaur.net`);
console.log('');

async function runCommand(command, args, stepName) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Command: ${command} ${args.join(' ')}`);
    const childProcess = spawn(command, args, { 
      stdio: 'inherit',
      env: { ...process.env, TEST_ENV }
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${stepName} completed successfully\n`);
        resolve();
      } else {
        console.log(`❌ ${stepName} failed with exit code ${code}\n`);
        reject(new Error(`${stepName} failed`));
      }
    });
  });
}

async function cleanupPreviousData() {
  const emailFile = `test-data/invited-emails-${TEST_ENV}.json`;
  const txtFile = `test-data/invited-emails-${TEST_ENV}.txt`;
  
  try {
    if (fs.existsSync(emailFile)) {
      fs.unlinkSync(emailFile);
      console.log(`🗑️ Removed previous email file: ${emailFile}`);
    }
    if (fs.existsSync(txtFile)) {
      fs.unlinkSync(txtFile);
      console.log(`🗑️ Removed previous text email file: ${txtFile}`);
    }
  } catch (error) {
    console.log(`ℹ️ No previous files to clean up`);
  }
}

async function checkEmailFileExists() {
  const emailFile = `test-data/invited-emails-${TEST_ENV}.json`;
  if (!fs.existsSync(emailFile)) {
    throw new Error(`No email file found at ${emailFile}. API test may have failed.`);
  }
  
  const emailData = JSON.parse(fs.readFileSync(emailFile, 'utf-8'));
  if (!emailData.emails || emailData.emails.length === 0) {
    throw new Error('Email file exists but contains no emails.');
  }
  
  console.log(`✅ Found ${emailData.emails.length} email(s) for UI testing`);
  return emailData;
}

async function main() {
  try {
    // Step 1: Clean up previous test data
    console.log('🧹 Step 1: Cleaning up previous test data...');
    await cleanupPreviousData();
    
    // Step 2: Run API test to create single user
    console.log('📋 Step 2: Running API Test to create single user');
    await runCommand('npx', [
      'playwright', 'test', 'src/tests/singleUserTest.spec.js',
      '--reporter=line',
      '--timeout=300000'
    ], 'API Test');
    
    // Step 3: Verify email data was created
    console.log('📧 Step 3: Verifying email data...');
    const emailData = await checkEmailFileExists();
    
    // Step 4: Run single UI test
    console.log('🌐 Step 4: Running Single UI Test');
    await runCommand('npx', [
      'playwright', 'test', 'src/tests/uiEmailRegistration.spec.js',
      '-g', 'Complete invitation flow from API-generated emails',
      '--reporter=line',
      '--timeout=180000'
    ], 'Single UI Test');
    
    console.log('🎉 Single User E2E Test Suite completed successfully!');
    console.log('============================================================');
    console.log('✅ API Test: Created 1 user with custom-int@pbrnfri5.mailosaur.net');
    console.log('✅ UI Test: Successfully activated the user');
    console.log('');
    
  } catch (error) {
    console.error(`❌ E2E Test Suite failed: ${error.message}`);
    process.exit(1);
  }
}

main();
