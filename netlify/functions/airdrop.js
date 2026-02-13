/**
 * Netlify Function: Airdrop Claim Handler
 * 
 * Handles POST requests to /api/airdrop
 * Processes airdrop submissions and triggers verification emails
 */

const processor = require('../../airdrop-processor');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ok: true })
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
        };
    }

    try {
        // Parse request body
        const data = JSON.parse(event.body || '{}');

        // Validate required fields
        if (!data.email || !data.wallet || !data.entityType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: email, wallet, entityType'
                })
            };
        }

        // Process submission using the shared processor
        const result = await processor.processSubmission(data);

        // Return response
        return {
            statusCode: result.success ? 200 : 400,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Airdrop processing error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Internal server error'
            })
        };
    }
};
