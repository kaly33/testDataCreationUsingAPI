import MailosaurClient from 'mailosaur';

export class MailosaurHelper {
    constructor(apiKey, serverId) {
        this.apiKey = apiKey;
        this.serverId = serverId;
        this.client = new MailosaurClient(apiKey);
    }

    /**
     * Wait for and retrieve verification email
     * @param {string} emailAddress - The email address to wait for
     * @param {number} timeout - Timeout in milliseconds (default: 60000)
     * @returns {Promise<Object>} Email message object
     */
    async waitForVerificationEmail(emailAddress, timeout = 60000) {
        console.log(`📧 Waiting for verification email to: ${emailAddress}`);
        
        try {
            const message = await this.client.messages.get(
                this.serverId,
                {
                    sentTo: emailAddress
                },
                {
                    timeout: timeout
                }
            );
            
            console.log(`✅ Verification email received for: ${emailAddress}`);
            return message;
        } catch (error) {
            console.error(`❌ Failed to retrieve email for ${emailAddress}:`, error.message);
            throw error;
        }
    }

    /**
     * Extract verification code from email content
     * @param {Object} message - Email message object from Mailosaur
     * @returns {string|null} Verification code or null if not found
     */
    extractVerificationCode(message) {
        try {
            // Common patterns for verification codes
            const patterns = [
                /(\d{6})/g,                           // 6-digit code
                /verification code[:\s]*(\d{4,8})/i,  // "verification code: 123456"
                /code[:\s]*(\d{4,8})/i,               // "code: 123456"
                /enter[:\s]*(\d{4,8})/i,              // "enter: 123456"
            ];

            // Check HTML content first
            let content = message.html?.body || '';
            
            // If no HTML, check text content
            if (!content) {
                content = message.text?.body || '';
            }

            for (const pattern of patterns) {
                const matches = content.match(pattern);
                if (matches && matches[1]) {
                    const code = matches[1];
                    console.log(`🔍 Found verification code: ${code}`);
                    return code;
                }
            }

            // If no pattern matches, try to find any 6-digit number
            const sixDigitMatch = content.match(/\b\d{6}\b/);
            if (sixDigitMatch) {
                console.log(`🔍 Found 6-digit code: ${sixDigitMatch[0]}`);
                return sixDigitMatch[0];
            }

            console.warn('⚠️ Could not extract verification code from email');
            return null;
        } catch (error) {
            console.error('❌ Error extracting verification code:', error.message);
            return null;
        }
    }

    /**
     * Get verification code from email
     * @param {string} emailAddress - The email address to wait for
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<string|null>} Verification code or null
     */
    async getVerificationCode(emailAddress, timeout = 60000) {
        try {
            const message = await this.waitForVerificationEmail(emailAddress, timeout);
            return this.extractVerificationCode(message);
        } catch (error) {
            console.error(`❌ Failed to get verification code for ${emailAddress}:`, error.message);
            return null;
        }
    }

    /**
     * Wait for account verification email and extract verification URL
     * @param {string} emailAddress - The email address to wait for
     * @param {number} timeout - Timeout in milliseconds (default: 40000)
     * @returns {Promise<Object>} Object containing verification URL and message
     */
    async waitForAccountVerificationEmail(emailAddress, timeout = 40000) {
        console.log(`📧 Waiting for account verification email to: ${emailAddress}`);
        
        try {
            const message = await this.client.messages.get(
                this.serverId,
                {
                    sentTo: emailAddress
                },
                {
                    timeout: timeout
                }
            );
            
            // Validate email subject
            const expectedSubject = 'Verify your Autodesk account';
            if (message.subject !== expectedSubject) {
                console.log(`⚠️ Unexpected email subject: "${message.subject}", expected: "${expectedSubject}"`);
            } else {
                console.log(`✅ Account verification email received with correct subject`);
            }
            
            // Extract verification URL from email links
            let verificationUrl = null;
            if (message.html && message.html.links && message.html.links.length > 1) {
                verificationUrl = message.html.links[1].href;
                console.log(`🔗 Verification URL extracted: ${verificationUrl}`);
            } else {
                console.log(`⚠️ Could not extract verification URL from email`);
            }
            
            return {
                message: message,
                verificationUrl: verificationUrl,
                subject: message.subject
            };
        } catch (error) {
            console.error(`❌ Failed to retrieve account verification email for ${emailAddress}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete a specific message by ID
     * @param {string} messageId - The message ID to delete
     */
    async deleteMessage(messageId) {
        console.log(`🗑️ Deleting message with ID: ${messageId}`);
        try {
            await this.client.messages.del(messageId);
            console.log('✅ Message deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting message:', error.message);
            throw error;
        }
    }

    /**
     * Wait for invitation email and extract invitation URL
     * @param {string} emailAddress - The email address to wait for
     * @param {number} timeout - Timeout in milliseconds (default: 40000)
     * @returns {Promise<Object>} Object containing invitation URL and message
     */
    async waitForInvitationEmail(emailAddress, timeout = 40000) {
        console.log(`📧 Waiting for invitation email to: ${emailAddress}`);
        
        try {
            const message = await this.client.messages.get(
                this.serverId,
                {
                    sentTo: emailAddress
                },
                {
                    timeout: timeout
                }
            );

            // Check for invitation-related subjects
            const invitationSubjects = [
                'Invitation to',
                'You have been invited',
                'Join the',
                'Welcome to the',
                'You\'re invited to join'
            ];

            const hasInvitationSubject = invitationSubjects.some(subject => 
                message.subject && message.subject.includes(subject)
            );

            if (hasInvitationSubject) {
                console.log(`✅ Invitation email received with subject: "${message.subject}"`);
                
                // Extract invitation URL from email links - use the first web link (skip mailto)
                let invitationUrl = null;
                if (message.html && message.html.links && message.html.links.length > 0) {
                    // Find the first non-mailto link (the actual button/invitation link)
                    const webLinks = message.html.links.filter(link => 
                        link.href && !link.href.startsWith('mailto:')
                    );
                    
                    if (webLinks.length > 0) {
                        invitationUrl = webLinks[0].href; // First web link (Get Started/Activate button)
                        console.log(`🔗 Using first web link from email: ${invitationUrl}`);
                    }
                }

                console.log(`🔗 Invitation URL: ${invitationUrl}`);
                
                return {
                    invitationUrl: invitationUrl,
                    subject: message.subject,
                    messageId: message.id,
                    message: message
                };
            } else {
                console.log(`⚠️ Unexpected email subject: "${message.subject}", expected invitation email`);
                return {
                    invitationUrl: null,
                    subject: message.subject,
                    messageId: message.id,
                    message: message
                };
            }
            
        } catch (error) {
            console.error(`❌ Failed to get invitation email for ${emailAddress}:`, error.message);
            return {
                invitationUrl: null,
                subject: null,
                messageId: null,
                message: null,
                error: error.message
            };
        }
    }

    /**
     * Delete all messages in the server (useful for cleanup)
     */
    async deleteAllMessages() {
        try {
            await this.client.messages.deleteAll(this.serverId);
            console.log('🗑️ Deleted all messages from Mailosaur server');
        } catch (error) {
            console.error('❌ Failed to delete messages:', error.message);
        }
    }
}
