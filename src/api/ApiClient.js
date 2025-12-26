import axios from 'axios';

export class ApiClient {
    constructor(baseURL, userId, region) {
        this.baseURL = baseURL;
        this.userId = userId;
        this.region = region;
        this.client = axios.create({
            baseURL: `https://${baseURL}`,
            headers: {
                'Content-Type': 'application/json',
                'User-Id': userId,
                'Region': region
            }
        });

        // Log outgoing requests with headers (mask sensitive fields)
        this.client.interceptors.request.use((config) => {
            // Ensure required headers are always present on every request
            config.headers = config.headers || {};
            if (this.userId) {
                config.headers['User-Id'] = this.userId;
            }
            if (this.region) {
                config.headers['Region'] = this.region;
            }
            const toJSON = (headers) => {
                if (!headers) return {};
                if (typeof headers.toJSON === 'function') return headers.toJSON();
                return { ...headers };
            };
            const headers = toJSON(config.headers);
            if (headers.Authorization) {
                const token = String(headers.Authorization);
                headers.Authorization = token.slice(0, 20) + '...';
            }
            // Print request info and headers
            try {
                const dataOut = typeof config.data === 'string' ? config.data : (config.data ? JSON.stringify(config.data) : undefined);
                console.log('HTTP Request:', {
                    method: (config.method || 'get').toUpperCase(),
                    url: `${config.baseURL || ''}${config.url || ''}`,
                    headers,
                    data: dataOut
                });
            } catch (_) {
                // no-op
            }
            return config;
        });
    }

    async init() {
        // Nothing to initialize for axios
        return Promise.resolve();
    }

    async dispose() {
        // Nothing to dispose for axios
        return Promise.resolve();
    }

    setHeaders(headers) {
        if (headers && typeof headers === 'object') {
            if (headers['User-Id']) this.userId = headers['User-Id'];
            if (headers['Region']) this.region = headers['Region'];
        }
        const existingCommonHeaders = this.client.defaults.headers?.common || {};
        this.client.defaults.headers.common = {
            ...existingCommonHeaders,
            ...headers
        };
    }

    async authenticate(clientId, clientSecret) {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('scope', 'data:read data:write account:read account:write');
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);

        const response = await this.client.post('/authentication/v2/token', formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        this.setHeaders({
            'Authorization': `Bearer ${response.data.access_token}`
        });

        return response.data;
    }

    async get(url, config = {}) {
        return this.client.get(url, config);
    }

    async post(url, data, config = {}) {
        return this.client.post(url, data, config);
    }

    async put(url, data, config = {}) {
        return this.client.put(url, data, config);
    }

    async delete(url, config = {}) {
        return this.client.delete(url, config);
    }
} 