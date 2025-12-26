export class Project {
    constructor({
        name,
        prefix = '',
        classification = 'production',
        startDate = '2010-01-01',
        endDate = '2015-12-31',
        type = 'Hospital',
        value = 1650000,
        currency = 'USD',
        jobNumber = 'HP-0002',
        location = {}
    } = {}) {
        this.name = `${prefix}${name || 'FOR CYPRESS TESTING ONLY'}`;
        this.classification = classification;
        this.startDate = startDate;
        this.endDate = endDate;
        this.type = type;
        this.projectValue = { value, currency };
        this.jobNumber = jobNumber;
        
        // Location details
        this.addressLine1 = location.addressLine1 || '123 Main Street';
        this.addressLine2 = location.addressLine2 || 'Suite 2';
        this.city = location.city || 'San Francisco';
        this.stateOrProvince = location.state || 'California';
        this.postalCode = location.postalCode || '94001';
        this.country = location.country || 'United States';
        this.timezone = location.timezone || 'America/Los_Angeles';

        // Project details
        this.constructionType = 'New Construction';
        this.deliveryMethod = 'Unit Price';
        this.currentPhase = 'Design';
        
        // Default products
        this.products = [
            { key: 'docs' },
            { key: 'build' }
        ];
    }

    toJSON() {
        return {
            name: this.name,
            classification: this.classification,
            startDate: this.startDate,
            endDate: this.endDate,
            type: this.type,
            projectValue: this.projectValue,
            jobNumber: this.jobNumber,
            addressLine1: this.addressLine1,
            addressLine2: this.addressLine2,
            city: this.city,
            stateOrProvince: this.stateOrProvince,
            postalCode: this.postalCode,
            country: this.country,
            timezone: this.timezone,
            constructionType: this.constructionType,
            deliveryMethod: this.deliveryMethod,
            currentPhase: this.currentPhase,
            products: this.products
        };
    }
} 