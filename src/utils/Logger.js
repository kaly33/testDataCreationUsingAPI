export class Logger {
    logOperation(operation, details) {
        console.log(`\n${operation}:`);
        console.log('-'.repeat(operation.length + 1));
        
        Object.entries(details).forEach(([key, value]) => {
            if (key === 'headers' && value.Authorization) {
                // Mask sensitive data
                const headers = { ...value };
                headers.Authorization = `Bearer ${headers.Authorization.split(' ')[1].substring(0, 10)}...`;
                console.log(`${key}:`, JSON.stringify(headers, null, 2));
            } else {
                console.log(`${key}:`, JSON.stringify(value, null, 2));
            }
        });
    }

    logResponse(operation, response) {
        console.log(`\n${operation} Response:`);
        console.log('-'.repeat(operation.length + 10));
        
        const { status, statusText, data } = response;
        console.log('Status:', status);
        console.log('Status Text:', statusText);
        console.log('Response Data:', JSON.stringify(data, null, 2));
    }

    logError(operation, error) {
        console.error(`\n${operation} Error:`);
        console.error('-'.repeat(operation.length + 7));
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Status Text:', error.response.statusText);
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
} 