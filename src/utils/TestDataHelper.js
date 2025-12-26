import { Project } from '../models/Project.js';
import fs from 'fs';
import path from 'path';

export class TestDataHelper {
    constructor(apiClient) {
        this.testData = {};
        this.apiClient = apiClient;
        this.invitedEmails = []; // Track all invited emails
    }

    async createTestProject(accountId, prefix = 'PR3-', customData = {}) {
        const projectName = this.generateProjectName(prefix);
        const projectData = {
            name: projectName,
            classification: 'Commercial',
            startDate: '2024-03-01',
            endDate: '2024-12-31',
            projectType: 'Construction',
            constructionValue: 1000000,
            currency: 'USD',
            address: {
                line1: '123 Test Street',
                city: 'Test City',
                state: 'Test State',
                country: 'IND',
                postalCode: '12345'
            },
            ...customData
        };

        try {
            console.log('🚀 Creating project with data:', JSON.stringify(projectData, null, 2));
            console.log('📍 API endpoint:', `/construction/admin/v1/accounts/${accountId}/projects`);
            
            const response = await this.apiClient.post(
                `/construction/admin/v1/accounts/${accountId}/projects`,
                projectData
            );
            
            console.log('✅ Project created successfully:', response.data);
            this.storeProjectData(response.data.id, response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Error creating project:');
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
            console.error('Request Data:', JSON.stringify(projectData, null, 2));
            throw error;
        }
    }

    storeProjectData(projectId, projectData) {
        this.testData.project = {
            id: projectId,
            ...projectData
        };
    }

    storeUserData(userId, userData) {
        this.testData.user = {
            id: userId,
            ...userData
        };
    }

    storeProject2Data(projectId, projectData) {
        this.testData.project2 = {
            id: projectId,
            ...projectData
        };
    }

      storeUser2Data(userId, userData) {
    this.testData.user2 = {
      id: userId,
      ...userData
    };
  }

  storeAccountAdmin1Data(userId, userData) {
    this.testData.accountAdmin1 = {
      id: userId,
      ...userData
    };
  }

  storeAccountAdmin2Data(userId, userData) {
    this.testData.accountAdmin2 = {
      id: userId,
      ...userData
    };
  }

  // Account 2 users
  storeAccount2ProjectAdminData(userId, userData) {
    this.testData.account2ProjectAdmin = {
      id: userId,
      ...userData
    };
  }

  storeAccount2ProjectExecutiveData(userId, userData) {
    this.testData.account2ProjectExecutive = {
      id: userId,
      ...userData
    };
  }

  storeAccount2Admin1Data(userId, userData) {
    this.testData.account2Admin1 = {
      id: userId,
      ...userData
    };
  }

  storeAccount2Admin2Data(userId, userData) {
    this.testData.account2Admin2 = {
      id: userId,
      ...userData
    };
  }

  storeAccount2AdminData(userId, userData) {
    this.testData.account2Admin = {
      id: userId,
      ...userData
    };
  }

  storeAccount2OversheetAdminData(userId, userData) {
    this.testData.account2OversheetAdmin = {
      id: userId,
      ...userData
    };
  }

    getProjectId() {
        return this.testData.project?.id;
    }

    getUserId() {
        return this.testData.user?.id;
    }

    getProject2Id() {
        return this.testData.project2?.id;
    }

      getUser2Id() {
    return this.testData.user2?.id;
  }

  getAccountAdmin1Id() {
    return this.testData.accountAdmin1?.id;
  }

  getAccountAdmin2Id() {
    return this.testData.accountAdmin2?.id;
  }

  // Account 2 user getters
  getAccount2ProjectAdminId() {
    return this.testData.account2ProjectAdmin?.id;
  }

  getAccount2ProjectExecutiveId() {
    return this.testData.account2ProjectExecutive?.id;
  }

  getAccount2Admin1Id() {
    return this.testData.account2Admin1?.id;
  }

  getAccount2Admin2Id() {
    return this.testData.account2Admin2?.id;
  }

  getAccount2AdminId() {
    return this.testData.account2Admin?.id;
  }

  getAccount2OversheetAdminId() {
    return this.testData.account2OversheetAdmin?.id;
  }

    generateProjectName(prefix = 'PR3-') {
        const timestamp = new Date().getTime();
        return `${prefix}Test-Project-${timestamp}`;
    }

    getTestData() {
        return this.testData;
    }

    // Add email to the collection
    addInvitedEmail(email, userType, accountId = null, projectId = null, firstName = null, lastName = null) {
        const emailData = {
            email: email,
            userType: userType, // 'project_admin', 'account_admin', 'project_executive', etc.
            accountId: accountId,
            projectId: projectId,
            firstName: firstName,
            lastName: lastName,
            invitedAt: new Date().toISOString()
        };
        this.invitedEmails.push(emailData);
        console.log(`📧 Added email to collection: ${email} (${userType}) - ${firstName} ${lastName}`);
    }

    // Get all collected emails
    getAllInvitedEmails() {
        return this.invitedEmails;
    }

    // Save all invited emails to a JSON file
    async saveInvitedEmailsToFile(filename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `invited-emails-${timestamp}.json`;
        const finalFilename = filename || defaultFilename;
        const filePath = path.join('test-data', finalFilename);

        // Create test-data directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const emailData = {
            generatedAt: new Date().toISOString(),
            totalEmails: this.invitedEmails.length,
            emails: this.invitedEmails,
            summary: this.getEmailSummary()
        };

        try {
            fs.writeFileSync(filePath, JSON.stringify(emailData, null, 2));
            console.log(`✅ Saved ${this.invitedEmails.length} invited emails to: ${filePath}`);
            console.log(`📊 Email Summary:`, this.getEmailSummary());
            return filePath;
        } catch (error) {
            console.error(`❌ Error saving emails to file:`, error);
            throw error;
        }
    }

    // Get summary of email types
    getEmailSummary() {
        const summary = {};
        this.invitedEmails.forEach(emailData => {
            summary[emailData.userType] = (summary[emailData.userType] || 0) + 1;
        });
        return summary;
    }

    // Save emails to a simple text file (just email addresses)
    async saveEmailsToTextFile(filename = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `invited-emails-${timestamp}.txt`;
        const finalFilename = filename || defaultFilename;
        const filePath = path.join('test-data', finalFilename);

        // Create test-data directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const emailList = this.invitedEmails.map(emailData => emailData.email).join('\n');
        
        try {
            fs.writeFileSync(filePath, emailList);
            console.log(`✅ Saved ${this.invitedEmails.length} email addresses to: ${filePath}`);
            return filePath;
        } catch (error) {
            console.error(`❌ Error saving emails to text file:`, error);
            throw error;
        }
    }
} 