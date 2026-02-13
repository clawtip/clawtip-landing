/**
 * Airdrop Mailer - Agentmail Integration
 * 
 * Sends verification and distribution emails via Agentmail
 * 
 * Environment variables:
 *   AGENTMAIL_API_KEY - API key for Agentmail service
 *   AGENTMAIL_FROM - Sender email (default: noreply@clawtip.me)
 *   AGENTMAIL_API_URL - Base URL for Agentmail (default: https://agentmail.io/api)
 */

const https = require('https');
const querystring = require('querystring');

const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY || 'local-dev';
const AGENTMAIL_FROM = process.env.AGENTMAIL_FROM || 'noreply@clawtip.me';
const AGENTMAIL_API_URL = process.env.AGENTMAIL_API_URL || 'https://agentmail.io/api';

// ============================================================================
// Email Templates
// ============================================================================

function getVerificationEmailTemplate(submission) {
    const verifyUrl = `https://clawtip.me/verify?token=${submission.verificationToken}`;
    const isAgent = submission.entityType === 'agent';
    const clawAmount = isAgent ? 200 : 100;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #ff4d4d 0%, #ff9f43 100%); color: white; padding: 2rem; text-align: center; }
        .body { padding: 2rem; background: #f5f5f5; }
        .code-box { background: white; border: 2px solid #ff4d4d; padding: 1.5rem; border-radius: 8px; text-align: center; margin: 1.5rem 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #ff4d4d 0%, #ff9f43 100%); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
        .footer { padding: 1rem; text-align: center; font-size: 12px; color: #999; }
        .badge { background: #fff3e0; color: #ff6f00; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🪶 CLAW Airdrop</h1>
            <p>Verify Your Email</p>
        </div>
        <div class="body">
            <p>Hello${isAgent ? ' Agent' : ''},</p>
            <p>Welcome to the CLAW airdrop! You're eligible for <strong>${clawAmount} CLAW tokens</strong>.</p>
            
            <p><strong>Entity Type:</strong> <span class="badge">${isAgent ? 'Autonomous Agent' : 'Human'}</span></p>
            <p><strong>Wallet Address:</strong> <code>${submission.wallet}</code></p>
            
            <p>To claim your tokens, verify your email by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="${verifyUrl}" class="btn">Verify Email</a>
            </div>
            
            <p style="color: #666; font-size: 12px;">Or paste this link in your browser:</p>
            <div class="code-box">
                <code style="word-break: break-all; font-size: 11px;">
                    ${verifyUrl}
                </code>
            </div>
            
            <p><strong>Important:</strong> This verification link expires in 24 hours.</p>
            
            ${isAgent ? `
            <hr style="border: none; border-top: 1px solid #ddd; margin: 2rem 0;">
            <h3>Agent Verification Details</h3>
            <p>We've received the following information for verification:</p>
            <ul>
                <li><strong>Moltbook Handle:</strong> ${submission.moltbookHandle || 'Not provided'}</li>
                <li><strong>GitHub Repository:</strong> ${submission.githubRepo || 'Not provided'}</li>
                <li><strong>Reddit Handle:</strong> ${submission.redditHandle || 'Not provided'}</li>
            </ul>
            <p>Our team will verify your agent's authenticity. This may take 24-48 hours.</p>
            ` : ''}
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 2rem 0;">
            <h3>What Happens Next?</h3>
            <ol>
                <li>Click the verification link above</li>
                <li>Your email will be marked as verified</li>
                ${isAgent ? '<li>Our team will verify your agent identity (1-2 days)</li>' : ''}
                <li>Every Friday, verified recipients receive their CLAW in a weekly batch distribution</li>
                <li>CLAW will be sent directly to your Solana wallet</li>
            </ol>
            
            <p style="color: #666; font-size: 14px; margin-top: 2rem;">
                <strong>Questions?</strong> Reply to this email or visit <a href="https://clawtip.me">clawtip.me</a> for more information.
            </p>
        </div>
        <div class="footer">
            <p>© 2026 CLAW TOKEN. Built by agents, for agents.</p>
            <p><a href="https://twitter.com/clawtipbot">Twitter</a> | <a href="https://moltbook.com/u/ConnorClaw">Moltbook</a> | <a href="https://t.me/clawtip">Telegram</a></p>
            <p><em>DYOR/NFA. This is not financial advice.</em></p>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
CLAW Airdrop - Email Verification

Hello${isAgent ? ' Agent' : ''},

Welcome to the CLAW airdrop! You're eligible for ${clawAmount} CLAW tokens.

Entity Type: ${isAgent ? 'Autonomous Agent' : 'Human'}
Wallet Address: ${submission.wallet}

To claim your tokens, verify your email:
${verifyUrl}

This link expires in 24 hours.

What Happens Next:
1. Click the verification link
2. Your email will be marked as verified
${isAgent ? '3. Our team will verify your agent identity (1-2 days)' : ''}
${isAgent ? '4. Every Friday, verified recipients receive CLAW' : '3. Every Friday, verified recipients receive CLAW'}

Questions? Visit clawtip.me or reply to this email.

© 2026 CLAW TOKEN
    `;

    return { html, text };
}

function getDistributionEmailTemplate(submission, transactionId) {
    const solscanUrl = `https://solscan.io/tx/${transactionId}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #27c93f 0%, #00d95f 100%); color: white; padding: 2rem; text-align: center; }
        .body { padding: 2rem; background: #f5f5f5; }
        .success-box { background: #e8f5e9; border: 2px solid #27c93f; padding: 1.5rem; border-radius: 8px; text-align: center; }
        .detail { background: white; padding: 1rem; margin: 1rem 0; border-radius: 6px; border-left: 4px solid #27c93f; }
        .detail-label { font-weight: bold; color: #27c93f; }
        .btn { display: inline-block; background: #27c93f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; }
        .footer { padding: 1rem; text-align: center; font-size: 12px; color: #999; }
        code { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; word-break: break-all; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 CLAW Airdrop Distributed!</h1>
        </div>
        <div class="body">
            <div class="success-box">
                <h2 style="margin-top: 0; color: #27c93f;">Your CLAW has been sent! ✓</h2>
                <p style="font-size: 24px; font-weight: bold; color: #27c93f; margin: 1rem 0;">
                    +${submission.tokenAmount} CLAW
                </p>
            </div>
            
            <h3>Distribution Details</h3>
            <div class="detail">
                <span class="detail-label">Wallet:</span><br>
                <code>${submission.wallet}</code>
            </div>
            <div class="detail">
                <span class="detail-label">Amount:</span><br>
                ${submission.tokenAmount} CLAW
            </div>
            <div class="detail">
                <span class="detail-label">Transaction ID:</span><br>
                <code>${transactionId}</code>
            </div>
            <div class="detail">
                <span class="detail-label">Distributed:</span><br>
                ${new Date().toLocaleString()}
            </div>
            
            <p style="text-align: center; margin-top: 2rem;">
                <a href="${solscanUrl}" class="btn">View on Solscan</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 2rem 0;">
            
            <h3>Next Steps</h3>
            <ol>
                <li>Check your Solana wallet to confirm receipt of CLAW tokens</li>
                <li>Import the CLAW token contract address in your wallet if it's not showing</li>
                <li>Join the community: <a href="https://twitter.com/clawtipbot">Twitter</a>, <a href="https://t.me/clawtip">Telegram</a></li>
                <li>Explore CLAW use cases at <a href="https://clawtip.me">clawtip.me</a></li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 2rem 0;">
            
            <p><strong>CLAW Token Details</strong></p>
            <ul>
                <li><strong>Network:</strong> Solana Mainnet</li>
                <li><strong>Type:</strong> SPL Token</li>
                <li><strong>Use Cases:</strong> Inter-agent tipping, resource arbitrage, reputation signaling</li>
            </ul>
            
            <p style="color: #666; font-size: 14px;">
                Welcome to the agent economy! 🪶
            </p>
        </div>
        <div class="footer">
            <p>© 2026 CLAW TOKEN. Built by agents, for agents.</p>
            <p><a href="https://twitter.com/clawtipbot">Twitter</a> | <a href="https://moltbook.com/u/ConnorClaw">Moltbook</a> | <a href="https://t.me/clawtip">Telegram</a></p>
            <p><em>DYOR/NFA. This is not financial advice.</em></p>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
CLAW Airdrop - Distribution Confirmation

🎉 Your CLAW has been distributed!

Amount: ${submission.tokenAmount} CLAW
Wallet: ${submission.wallet}
Transaction: ${transactionId}
Time: ${new Date().toLocaleString()}

View on Solscan:
${solscanUrl}

Check your wallet to confirm receipt. Import the CLAW token if it's not showing automatically.

Next Steps:
1. Confirm receipt in your Solana wallet
2. Join the CLAW community
3. Explore use cases at clawtip.me

© 2026 CLAW TOKEN
    `;

    return { html, text };
}

// ============================================================================
// Agentmail API Integration
// ============================================================================

function sendEmailViaAgentmail(to, subject, html, text) {
    return new Promise((resolve, reject) => {
        if (AGENTMAIL_API_KEY === 'local-dev') {
            // Development mode - just log
            console.log(`[AGENTMAIL-DEV] Email to: ${to}`);
            console.log(`[AGENTMAIL-DEV] Subject: ${subject}`);
            console.log(`[AGENTMAIL-DEV] HTML length: ${html.length} bytes`);
            resolve({ success: true, mode: 'development' });
            return;
        }

        const data = JSON.stringify({
            to,
            from: AGENTMAIL_FROM,
            subject,
            html,
            text
        });

        const options = {
            hostname: new URL(AGENTMAIL_API_URL).hostname,
            port: 443,
            path: '/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': `Bearer ${AGENTMAIL_API_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(result);
                    } else {
                        reject(new Error(`Agentmail error: ${result.error || 'Unknown error'}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// ============================================================================
// Email Send Wrappers
// ============================================================================

async function sendVerificationEmail(submission) {
    try {
        const template = getVerificationEmailTemplate(submission);
        const subject = 'Verify Your CLAW Airdrop Email';

        const result = await sendEmailViaAgentmail(
            submission.email,
            subject,
            template.html,
            template.text
        );

        console.log(`✓ Verification email sent to ${submission.email}`);
        return result;
    } catch (error) {
        console.error(`✗ Failed to send verification email to ${submission.email}:`, error.message);
        throw error;
    }
}

async function sendDistributionEmail(submission, transactionId) {
    try {
        const template = getDistributionEmailTemplate(submission, transactionId);
        const subject = 'Your CLAW Airdrop Has Been Distributed!';

        const result = await sendEmailViaAgentmail(
            submission.email,
            subject,
            template.html,
            template.text
        );

        console.log(`✓ Distribution email sent to ${submission.email}`);
        return result;
    } catch (error) {
        console.error(`✗ Failed to send distribution email to ${submission.email}:`, error.message);
        throw error;
    }
}

async function sendBulkDistributionEmails(submissions, transactionMap) {
    const results = [];

    for (const submission of submissions) {
        try {
            const txId = transactionMap[submission.id];
            await sendDistributionEmail(submission, txId);
            results.push({ id: submission.id, status: 'sent' });
        } catch (error) {
            results.push({ id: submission.id, status: 'failed', error: error.message });
        }
    }

    return results;
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];

    switch (action) {
        case 'test-verification': {
            const testSubmission = {
                email: 'test@example.com',
                wallet: '9B5X5Y3qZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5',
                entityType: 'human',
                verificationToken: 'test-token-12345'
            };
            await sendVerificationEmail(testSubmission);
            break;
        }

        case 'test-distribution': {
            const testSubmission = {
                email: 'test@example.com',
                wallet: '9B5X5Y3qZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5',
                tokenAmount: 100
            };
            await sendDistributionEmail(testSubmission, 'txid123456789');
            break;
        }

        default:
            console.log(`
Usage:
  node airdrop-mailer.js --action=test-verification
  node airdrop-mailer.js --action=test-distribution

Environment:
  AGENTMAIL_API_KEY - API key for Agentmail service
  AGENTMAIL_FROM - Sender email (default: noreply@clawtip.me)
  AGENTMAIL_API_URL - Agentmail API base URL
            `);
    }
}

module.exports = {
    sendVerificationEmail,
    sendDistributionEmail,
    sendBulkDistributionEmails,
    getVerificationEmailTemplate,
    getDistributionEmailTemplate
};

if (require.main === module) {
    main().catch(console.error);
}
