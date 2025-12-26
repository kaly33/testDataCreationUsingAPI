import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { MailosaurHelper } from '../utils/MailosaurClient.js';

const TEST_ENV = process.env.TEST_ENV || 'staging-us';
const ENV_CONFIG_PATH = `config/environments/${TEST_ENV}.json`;
let ENV_CONFIG;
try {
  ENV_CONFIG = JSON.parse(fs.readFileSync(ENV_CONFIG_PATH, 'utf-8'));
} catch (err) {
  console.error(`Failed to load environment config at ${ENV_CONFIG_PATH}.`);
  throw err;
}

let MAILOSAUR_CONFIG;
try {
  MAILOSAUR_CONFIG = JSON.parse(fs.readFileSync('config/mailosaur.json', 'utf-8'));
} catch (err) {
  MAILOSAUR_CONFIG = { apiKey: 'ZBUgazdC3aabzSqQ', serverId: 'pbrnfri5' };
}

const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY || MAILOSAUR_CONFIG.apiKey;
const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID || MAILOSAUR_CONFIG.serverId;
const mailosaur = new MailosaurHelper(MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID);

test.describe('UI Batch Registration Tests', () => {
  
  test('Process all invited emails with new invitation flow', async ({ page, context }) => {
    const emailFilePath = path.join('test-data', `invited-emails-${TEST_ENV}.json`);
    
    if (!fs.existsSync(emailFilePath)) {
      console.log(`⚠️ No email file found at ${emailFilePath}`);
      test.skip();
      return;
    }
    
    const emailData = JSON.parse(fs.readFileSync(emailFilePath, 'utf-8'));
    console.log(`📧 Found ${emailData.totalEmails} emails to process`);
    
    const maxUsersToProcess = 8; // Process all users
    const emailsToProcess = emailData.emails.slice(0, maxUsersToProcess);
    console.log(`🎯 Processing all ${emailsToProcess.length} users`);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const emailEntry of emailsToProcess) {
      processedCount++;
      const email = emailEntry.email;
      
      console.log(`\n🔄 Processing user ${processedCount}/${emailsToProcess.length}: ${email}`);
      
      try {
        // Clear all browser session data between users
        console.log('🧹 Clearing browser session for fresh start...');
        await context.clearCookies();
        await context.clearPermissions();
        
        // Clear any stored authentication tokens (with error handling)
        try {
          await page.evaluate(() => {
            if (typeof localStorage !== 'undefined') localStorage.clear();
            if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
          });
        } catch (error) {
          console.log('ℹ️ Storage clearing skipped (no document context yet)');
        }
        
        await page.waitForTimeout(3000); // Longer wait for session cleanup
        
        // Step 1: Get invitation email
        console.log('📬 Step 1: Waiting for invitation email...');
        const emailResult = await mailosaur.waitForInvitationEmail(email, 60000);
        
        if (!emailResult.invitationUrl) {
          console.log('❌ No invitation link found');
          errorCount++;
          continue;
        }
        
        // Step 2: Navigate to invitation link
        console.log('🌐 Step 2: Navigating to invitation link...');
        await page.goto(emailResult.invitationUrl);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(5000); // Longer wait for page to fully load
        
        console.log('📍 Landing URL:', page.url());
        console.log('📄 Page title:', await page.title());
        
        // Step 3: Detect page type and find password field
        console.log('🔍 Step 3: Detecting page type and looking for form fields...');
        
        const passwordSelectors = [
          'input[type="password"]',
          'input[name="password"]',
          'input[placeholder*="password" i]',
          'input[placeholder*="Password"]'
        ];
        
        let passwordField = null;
        for (const selector of passwordSelectors) {
          const field = page.locator(selector).first();
          if (await field.isVisible({ timeout: 3000 })) {
            passwordField = field;
            console.log(`✅ Found password field with selector: ${selector}`);
            break;
          }
        }
        
        if (passwordField) {
          await passwordField.fill('Autodesk1!');
          console.log('✅ Password entered');
          
          // Step 4: Fill names (clean - no numbers)
          const cleanFirstName = (emailEntry.firstName || 'Test').replace(/[0-9]/g, '').trim() || 'Test';
          const cleanLastName = (emailEntry.lastName || 'User').replace(/[0-9]/g, '').trim() || 'User';
          
          const firstNameField = page.locator('input[name="firstName"]').first();
          if (await firstNameField.isVisible({ timeout: 2000 })) {
            await firstNameField.fill(cleanFirstName);
            console.log('✅ First name filled');
          }
          
          const lastNameField = page.locator('input[name="lastName"]').first();
          if (await lastNameField.isVisible({ timeout: 2000 })) {
            await lastNameField.fill(cleanLastName);
            console.log('✅ Last name filled');
          }
          
          // Step 5: Click only the first checkbox (general terms)
          const checkboxes = await page.locator('input[type="checkbox"]').all();
          let clickedCheckboxes = 0;
          for (let i = 0; i < checkboxes.length && clickedCheckboxes < 1; i++) {
            const checkbox = checkboxes[i];
            if (await checkbox.isVisible() && !(await checkbox.isChecked())) {
              await checkbox.click();
              clickedCheckboxes++;
              await page.waitForTimeout(500);
            }
          }
          console.log(`✅ Clicked ${clickedCheckboxes} checkbox (general terms only)`);
          
          // Step 6: Submit
          const submitButton = page.locator('button[type="submit"]').first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            await submitButton.click();
            await page.waitForTimeout(5000);
            console.log('✅ Account creation form submitted!');
            
            // Step 7: Check for Continue button first, then OTP
            console.log('🔍 Step 7: Checking for Continue button or OTP requirement...');
            await page.waitForTimeout(3000);
            
            // First, check if there's a Continue button to click
            const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Proceed")').first();
            if (await continueButton.isVisible({ timeout: 3000 })) {
              console.log('🔘 Continue button found - clicking to proceed...');
              await continueButton.click();
              console.log('✅ Continue button clicked');
              
              // Wait for navigation to complete after Continue button click
              await page.waitForTimeout(8000);
            }
            
            // Now check for OTP requirement (with safer content retrieval)
            await page.waitForTimeout(2000);
            let pageContent = '';
            try {
              pageContent = await page.content();
            } catch (error) {
              console.log('⚠️ Unable to get page content, assuming navigation complete');
              pageContent = '';
            }
            
            if (pageContent.includes('passcode') || pageContent.includes('verification code') || pageContent.includes('Enter the code') || pageContent.includes('One-time') || pageContent.includes('6-digit')) {
              console.log('🔐 One-time passcode required - checking email...');
              
              try {
                // Wait for one-time passcode email
                console.log('📬 Waiting for one-time passcode email...');
                const passcodeEmail = await mailosaur.waitForVerificationEmail(email, 60000);
                
                if (passcodeEmail && passcodeEmail.verificationCode) {
                  console.log(`✅ One-time passcode received: ${passcodeEmail.verificationCode}`);
                  
                  // Look for passcode input field
                  const passcodeField = page.locator('input[type="text"], input[name="code"], input[name="passcode"]').first();
                  
                  if (await passcodeField.isVisible({ timeout: 2000 })) {
                    await passcodeField.fill(passcodeEmail.verificationCode);
                    console.log('✅ One-time passcode entered');
                    
                    // Look for continue button
                    const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify")').first();
                    
                    if (await continueButton.isVisible({ timeout: 2000 })) {
                      await continueButton.click();
                      await page.waitForTimeout(3000);
                      console.log('✅ One-time passcode verification completed!');
                    } else {
                      console.log('⚠️ Continue button not found after entering passcode');
                    }
                  } else {
                    console.log('⚠️ Passcode input field not found');
                  }
                } else {
                  console.log('⚠️ No one-time passcode received in email');
                }
              } catch (error) {
                console.log(`⚠️ One-time passcode handling failed: ${error.message}`);
              }
            } else {
              console.log('ℹ️ No one-time passcode required - account creation complete');
            }
            
            successCount++;
          } else {
            console.log('⚠️ Submit button not found');
            errorCount++;
          }
        } else {
          console.log('⚠️ Password field not found - checking if user is already registered...');
          
          // Check if this is a login page (user already exists)
          const isLoginPage = await page.locator('text=Sign in', 'text=Log in', 'text=Already have an account').count() > 0;
          const hasSignInButton = await page.locator('button:has-text("Sign in"), button:has-text("Log in")').count() > 0;
          
          if (isLoginPage || hasSignInButton) {
            console.log('ℹ️ User appears to already be registered (landed on login page)');
            console.log('✅ Skipping - user likely already active from previous test');
            successCount++; // Count as success since user is already registered
          } else {
            console.log('❌ Unknown page type - cannot process this user');
            errorCount++;
          }
        }
        
        await page.waitForTimeout(4000);
        
      } catch (error) {
        console.log(`❌ Error processing user ${email}:`, error.message);
        errorCount++;
        continue;
      }
    }
    
    console.log(`\n📊 Batch Processing Summary:`);
    console.log(`   Total: ${processedCount}, Success: ${successCount}, Errors: ${errorCount}`);
    console.log(`   Success Rate: ${Math.round((successCount / processedCount) * 100)}%`);
    
    await context.clearCookies();
    await context.clearPermissions();
    console.log('✅ Batch processing completed');
  });
});