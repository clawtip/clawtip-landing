/**
 * Netlify Function: Email Verification Handler
 * 
 * Handles GET requests to /verify?token=...
 * Verifies email and marks submission as verified
 */

const processor = require('../../airdrop-processor');

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    // Get token from query params
    const token = event.queryStringParameters?.token;

    if (!token) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing verification token' })
        };
    }

    try {
        // Verify email using the shared processor
        const result = processor.verifyEmail(token);

        // Return response
        return {
            statusCode: result.success ? 200 : 400,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Verification error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error'
            })
        };
    }
};
