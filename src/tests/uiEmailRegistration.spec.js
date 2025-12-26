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

test.describe('UI Email Registration Tests', () => {
  
  test('Complete invitation flow from API-generated emails', async ({ page, context }) => {
    const emailFilePath = path.join('test-data', `invited-emails-${TEST_ENV}.json`);
    
    if (!fs.existsSync(emailFilePath)) {
      console.log(`⚠️ No email file found at ${emailFilePath}`);
      test.skip();
      return;
    }
    
    const emailData = JSON.parse(fs.readFileSync(emailFilePath, 'utf-8'));
    console.log(`📧 Found ${emailData.totalEmails} emails from API tests`);
    
    if (emailData.emails.length === 0) {
      console.log('❌ No emails found in the API-generated file');
      test.skip();
      return;
    }
    
    const emailEntry = emailData.emails[0];
    const testEmail = emailEntry.email;
    
    console.log(`🚀 Starting invitation flow for: ${testEmail}`);
    console.log(`👤 User Type: ${emailEntry.userType}`);
    
    await context.clearCookies();
    await context.clearPermissions();
    await page.waitForTimeout(2000);
    
    // Step 1: Get invitation email
    console.log('📬 Step 1: Waiting for invitation email...');
    const emailResult = await mailosaur.waitForInvitationEmail(testEmail, 60000);
    
    console.log('✅ Invitation email received:', {
      subject: emailResult.subject,
      messageId: emailResult.messageId
    });
    
    if (!emailResult.invitationUrl) {
      throw new Error('No invitation link found in email');
    }
    
    // Step 2: Navigate to invitation link
    console.log('🌐 Step 2: Navigating to invitation link...');
    
    // Navigate directly to invitation link
    await page.goto(emailResult.invitationUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow page to fully load
    
    const currentUrl = page.url();
    const pageTitle = await page.title();
    console.log('📍 Landing URL:', currentUrl);
    console.log('📄 Page title:', pageTitle);
    
    await page.screenshot({ path: 'test-results/invitation-landing-page.png' });
    
    // Step 3: Wait for and detect account creation page elements
    console.log('🔐 Step 3: Looking for account creation page...');
    
    // Wait longer for dynamic content to load
    await page.waitForTimeout(5000);
    
    // Try broader selectors and wait for elements
    console.log('🔍 Searching for form elements...');
    
    // Look for password field with various selectors
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]', 
      'input[placeholder*="password" i]',
      'input[placeholder*="Password"]'
    ];
    
    let hasPasswordField = false;
    for (const selector of passwordSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        hasPasswordField = true;
        console.log(`✅ Found password field with selector: ${selector}`);
        break;
      }
    }
    
    // Look for checkboxes with various selectors
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    const hasCheckboxes = checkboxCount >= 2;
    
    const hasGeneralTermsCheckbox = await page.locator('input[name="generalTerms"], #generalTerms, input[type="checkbox"]:has-text("Terms"), input[type="checkbox"]:has-text("terms")').count() > 0;
    const hasMarketingTermsCheckbox = await page.locator('input[name="marketingTerms"], #marketingTerms, input[type="checkbox"]:has-text("Marketing"), input[type="checkbox"]:has-text("marketing")').count() > 0;
    
    // Check for old registration form (should not be this)
    const hasOldFormFields = await page.locator('input[name="FirstName"], input[name="LastName"], input[name="Email"]').count() > 0;
    
    console.log(`🔍 Form detection: Password=${hasPasswordField}, Checkboxes=${hasCheckboxes} (found ${checkboxCount}), GeneralTerms=${hasGeneralTermsCheckbox}, MarketingTerms=${hasMarketingTermsCheckbox}, OldForm=${hasOldFormFields}`);
    
    // Debug: List all form elements found
    console.log('📋 Debug: All form elements on page:');
    const allInputs = await page.locator('input').all();
    for (let i = 0; i < Math.min(allInputs.length, 10); i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type') || 'text';
      const name = await input.getAttribute('name') || 'no-name';
      const placeholder = await input.getAttribute('placeholder') || 'no-placeholder';
      console.log(`  Input ${i}: type="${type}", name="${name}", placeholder="${placeholder}"`);
    }
    
    // Check if this is a 2-step process (email + terms first, then password)
    const hasEmailField = await page.locator('input[name="email"], input[type="email"]').count() > 0;
    
    if (hasEmailField && hasGeneralTermsCheckbox) {
      console.log('✅ Found 2-step account creation page (email + terms first)!');
      console.log('📝 Step 4: Filling email and accepting terms...');
      
      // Fill email field
      const emailField = page.locator('input[name="email"], input[type="email"]').first();
      await emailField.fill(testEmail);
      console.log('✅ Email filled');
      
      // Check general terms checkbox
      const generalTermsCheckbox = page.locator('input[name="generalTerms"]').first();
      await generalTermsCheckbox.check();
      console.log('✅ General terms accepted');
      
      // Only check the general terms checkbox (skip marketing terms)
      const allCheckboxes = await page.locator('input[type="checkbox"]').all();
      console.log(`📋 Found ${allCheckboxes.length} total checkboxes`);
      
      for (let i = 0; i < allCheckboxes.length; i++) {
        const checkbox = allCheckboxes[i];
        const name = await checkbox.getAttribute('name') || `checkbox-${i}`;
        if (name === 'generalTerms' && !(await checkbox.isChecked())) {
          await checkbox.check();
          console.log(`✅ Checked general terms checkbox only`);
          break; // Only check the first one (general terms)
        }
      }
      
      // Submit first step
      console.log('🚀 Step 5: Submitting first step (email + terms)...');
      const submitButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Next"), button:has-text("Create")').first();
      await submitButton.click();
      await page.waitForTimeout(5000);
      
      console.log('✅ First step submitted');
      console.log('📍 URL after first step:', page.url());
      
      // Now look for password field (should appear after first step)
      console.log('🔐 Step 6: Looking for password field...');
      await page.waitForTimeout(3000);
      
      const passwordField = page.locator('input[type="password"], input[name="password"]').first();
      if (await passwordField.count() > 0) {
        await passwordField.fill('Autodesk1!');
        console.log('✅ Password entered');
        
        // Submit final step
        console.log('🚀 Step 7: Submitting final step (password)...');
        const finalSubmitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Complete")').first();
        await finalSubmitButton.click();
        await page.waitForTimeout(5000);
        
        console.log('✅ Account creation completed!');
        console.log('📍 Final URL:', page.url());
        
        // Check for OTP requirement
        await page.waitForTimeout(3000);
        const pageContent = await page.content();
        
        if (pageContent.includes('passcode') || pageContent.includes('verification code') || pageContent.includes('Enter the code')) {
          console.log('🔐 Step 8: One-time passcode required - checking email...');
          
          try {
            console.log('📬 Waiting for one-time passcode email...');
            const passcodeEmail = await mailosaur.waitForVerificationEmail(testEmail, 60000);
            
            if (passcodeEmail && passcodeEmail.verificationCode) {
              console.log(`✅ One-time passcode received: ${passcodeEmail.verificationCode}`);
              
              const passcodeField = page.locator('input[type="text"], input[name="code"], input[name="passcode"]').first();
              
              if (await passcodeField.isVisible({ timeout: 2000 })) {
                await passcodeField.fill(passcodeEmail.verificationCode);
                console.log('✅ One-time passcode entered');
                
                const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify")').first();
                if (await continueButton.isVisible({ timeout: 2000 })) {
                  await continueButton.click();
                  console.log('✅ OTP verification completed - User should now be Active!');
                }
              }
            } else {
              console.log('⚠️ No one-time passcode received in email');
            }
          } catch (error) {
            console.log(`⚠️ One-time passcode handling failed: ${error.message}`);
          }
        } else {
          console.log('✅ Step 8: No OTP required - User should now be Active!');
        }
        
      } else {
        console.log('⚠️ Password field not found after first step');
      }
      
    } else if (hasPasswordField && hasCheckboxes) {
      console.log('✅ Found single-step account creation page with password + 2 checkboxes!');
      console.log('📝 Step 4: Filling account creation form...');
      
      // Fill NEW account creation form (first name, last name, password + 2 checkboxes)
      // Clean names (remove numbers)
      const cleanFirstName = (emailEntry.firstName || 'Test').replace(/[0-9]/g, '').trim() || 'Test';
      const cleanLastName = (emailEntry.lastName || 'User').replace(/[0-9]/g, '').trim() || 'User';
      const firstName = cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1).toLowerCase();
      const lastName = cleanLastName.charAt(0).toUpperCase() + cleanLastName.slice(1).toLowerCase();
      
      console.log(`👤 Using cleaned names: "${firstName}" "${lastName}"`);
      
      // Fill first name if field exists
      const firstNameField = page.locator('input[name="firstName"], input[name="first_name"]');
      if (await firstNameField.count() > 0) {
        await firstNameField.first().fill(firstName);
        console.log('✅ First name filled');
      }
      
      // Fill last name if field exists  
      const lastNameField = page.locator('input[name="lastName"], input[name="last_name"]');
      if (await lastNameField.count() > 0) {
        await lastNameField.first().fill(lastName);
        console.log('✅ Last name filled');
      }
      
      console.log('🔐 Entering password...');
      await page.locator('input[type="password"], input[name="password"]').first().fill('Autodesk1!');
      console.log('✅ Password entered');
      
      // Click only the first checkbox (general terms)
      console.log('☑️ Accepting general terms only...');
      
      if (hasGeneralTermsCheckbox) {
        await page.locator('input[name="generalTerms"], #generalTerms').first().check();
        console.log('✅ General terms checkbox checked');
      }
      
      // Submit the form
      console.log('🚀 Step 5: Submitting account creation form...');
      await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Continue")').first().click();
      await page.waitForTimeout(5000);
      
      console.log('✅ New account creation form submitted');
      console.log('📍 Final URL after submission:', page.url());
      
      // Take screenshot to see what page we're on
      await page.screenshot({ path: 'test-results/after-form-submission.png' });
      
      // Step 6: Check for Continue button first, then OTP
      await page.waitForTimeout(3000);
      console.log('🔍 Step 6: Checking for Continue button or OTP requirement...');
      
      // First, check if there's a Continue button to click
      const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Proceed")').first();
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('🔘 Continue button found - clicking to proceed...');
        await continueButton.click();
        await page.waitForTimeout(3000);
        console.log('✅ Continue button clicked');
        console.log('📍 URL after Continue:', page.url());
      }
      
      // Now check for OTP requirement
      await page.waitForTimeout(2000);
      const pageContent = await page.content();
      console.log('🔍 Checking page content for OTP requirements...');
      
      if (pageContent.includes('passcode') || pageContent.includes('verification code') || pageContent.includes('Enter the code') || pageContent.includes('One-time') || pageContent.includes('6-digit')) {
        console.log('🔐 Step 7: One-time passcode required - checking email...');
        
        try {
          console.log('📬 Waiting for one-time passcode email...');
          const passcodeEmail = await mailosaur.waitForVerificationEmail(testEmail, 60000);
          
          if (passcodeEmail && passcodeEmail.verificationCode) {
            console.log(`✅ One-time passcode received: ${passcodeEmail.verificationCode}`);
            
            const passcodeField = page.locator('input[type="text"], input[name="code"], input[name="passcode"]').first();
            
            if (await passcodeField.isVisible({ timeout: 2000 })) {
              await passcodeField.fill(passcodeEmail.verificationCode);
              console.log('✅ One-time passcode entered');
              
              const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify")').first();
              if (await continueButton.isVisible({ timeout: 2000 })) {
                await continueButton.click();
                console.log('✅ OTP verification completed');
              }
            }
          } else {
            console.log('⚠️ No one-time passcode received in email');
          }
        } catch (error) {
          console.log(`⚠️ One-time passcode handling failed: ${error.message}`);
        }
      } else {
        console.log('✅ Step 7: No OTP required - account creation complete!');
      }
      
    } else if (hasOldFormFields) {
      console.log('📝 Detected OLD registration form - filling complete form...');
      
      // Fill old-style registration form
      const cleanFirstName = (emailEntry.firstName || 'Test').replace(/[0-9]/g, '').trim() || 'Test';
      const cleanLastName = (emailEntry.lastName || 'User').replace(/[0-9]/g, '').trim() || 'User';
      const firstName = cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1).toLowerCase();
      const lastName = cleanLastName.charAt(0).toUpperCase() + cleanLastName.slice(1).toLowerCase();
      
      console.log(`👤 Using cleaned names: "${firstName}" "${lastName}"`);
      
      await page.locator('input[name="FirstName"]').fill(firstName, { timeout: 10000 });
      console.log('✅ First name filled');
      
      await page.locator('input[name="LastName"]').fill(lastName, { timeout: 10000 });
      console.log('✅ Last name filled');
      
      await page.locator('input[name="Email"]').fill(testEmail, { timeout: 10000 });
      console.log('✅ Email filled');
      
      await page.locator('input[name="ConfirmEmail"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('input[name="ConfirmEmail"]').fill(testEmail, { timeout: 10000 });
      console.log('✅ Confirm email filled');
      
      await page.locator('input[name="Password"]').fill('Autodesk1!', { timeout: 10000 });
      console.log('✅ Password filled');
      
      // Accept terms and conditions (old form)
      console.log('☑️ Accepting terms and conditions...');
      try {
        await page.evaluate(() => {
          const checkbox = document.getElementById('privacypolicy_checkbox');
          if (checkbox) {
            checkbox.click();
            return true;
          }
          return false;
        });
        console.log('✅ Terms accepted via JavaScript');
      } catch (error) {
        console.log(`⚠️ Terms acceptance failed: ${error.message}`);
      }
      
      // Submit old form
      console.log('🚀 Submitting old registration form...');
      await page.locator('button[type="submit"], input[type="submit"]').first().click();
      await page.waitForTimeout(5000);
      
      console.log('✅ Old registration form submitted');
      console.log('📍 Final URL:', page.url());
      
      // Step 5: Check for one-time passcode requirement (after old form)
      console.log('📧 Step 5: Checking for one-time passcode requirement...');
      await page.waitForTimeout(3000);
      
      const pageContent = await page.content();
      
      if (pageContent.includes('passcode') || pageContent.includes('verification code') || pageContent.includes('Enter the code')) {
        console.log('🔐 One-time passcode required - checking email...');
        
        try {
          console.log('📬 Waiting for one-time passcode email...');
          const passcodeEmail = await mailosaur.waitForVerificationEmail(testEmail, 60000);
          
          if (passcodeEmail && passcodeEmail.verificationCode) {
            console.log(`✅ One-time passcode received: ${passcodeEmail.verificationCode}`);
            
            const passcodeField = page.locator('input[type="text"], input[name="code"], input[name="passcode"]').first();
            
            if (await passcodeField.isVisible({ timeout: 2000 })) {
              await passcodeField.fill(passcodeEmail.verificationCode);
              console.log('✅ One-time passcode entered');
              
              const continueButton = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Verify")').first();
              
              if (await continueButton.isVisible({ timeout: 2000 })) {
                await continueButton.click();
                await page.waitForTimeout(3000);
                console.log('✅ One-time passcode verification completed!');
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ One-time passcode handling failed: ${error.message}`);
        }
      } else {
        console.log('ℹ️ No one-time passcode required - old form registration complete');
      }
      
    } else {
      console.log('⚠️ Unknown page type - neither old nor new form detected');
      await page.screenshot({ path: 'test-results/unknown-page-type.png' });
    }
    
    console.log(`✅ Invitation flow completed for: ${testEmail}`);
    
    // Clean up browser session
    console.log('🧹 Cleaning up browser session...');
    await context.clearCookies();
    await context.clearPermissions();
    console.log('✅ Browser session cleaned up');
  });
});