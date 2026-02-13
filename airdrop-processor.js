/**
 * Airdrop Processor - Backend validation, verification, and storage
 * 
 * Usage:
 *   node airdrop-processor.js --action process-submission --email user@example.com --wallet 9B...5L
 *   node airdrop-processor.js --action verify --token abc123
 *   node airdrop-processor.js --action distribute --dry-run
 *   node airdrop-processor.js --action list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const REGISTRY_PATH = '/tmp/airdrop-registry.json';
const VERIFICATION_TOKEN_LENGTH = 32;
const VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Registry Management
// ============================================================================

function loadRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        return { submissions: [], distributions: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    } catch {
        return { submissions: [], distributions: [] };
    }
}

function saveRegistry(registry) {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
}

// ============================================================================
// Validation
// ============================================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSolanaWallet(wallet) {
    // Solana addresses are base58 encoded, typically 43-44 characters
    // Base58 excludes: 0 (zero), O (capital o), I (capital i), l (lowercase L)
    return /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(wallet);
}

function isValidUrl(urlString) {
    try {
        const url = new URL(urlString.startsWith('http') ? urlString : 'https://' + urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// ============================================================================
// Submission Processing
// ============================================================================

async function processSubmission(data) {
    const errors = [];

    // Validate email
    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Invalid email address');
    }

    // Validate wallet
    if (!data.wallet || !isValidSolanaWallet(data.wallet)) {
        errors.push('Invalid Solana wallet address');
    }

    // Validate entity type
    if (!data.entityType || !['human', 'agent'].includes(data.entityType)) {
        errors.push('Invalid entity type. Must be "human" or "agent"');
    }

    // Agent-specific validation
    if (data.entityType === 'agent') {
        if (!data.moltbookHandle) {
            errors.push('Moltbook handle required for agents');
        }
        if (!data.githubRepo) {
            errors.push('GitHub repository required for agents');
        } else if (!isValidUrl(data.githubRepo)) {
            errors.push('Invalid GitHub repository URL');
        }
    }

    // Check for duplicate email
    const registry = loadRegistry();
    const existing = registry.submissions.find(s => s.email.toLowerCase() === data.email.toLowerCase());
    if (existing && !existing.verifiedAt) {
        errors.push('Email already submitted. Check your inbox for verification link.');
    }

    if (errors.length > 0) {
        return { success: false, error: errors.join('; ') };
    }

    // Generate verification token
    const token = crypto.randomBytes(VERIFICATION_TOKEN_LENGTH).toString('hex');
    const submission = {
        id: crypto.randomBytes(8).toString('hex'),
        email: data.email.toLowerCase(),
        wallet: data.wallet,
        entityType: data.entityType,
        moltbookHandle: data.moltbookHandle || null,
        githubRepo: data.githubRepo || null,
        redditHandle: data.redditHandle || null,
        description: (data.description || '').substring(0, 500),
        newsletter: data.newsletter === 'true' || data.newsletter === true,
        verificationToken: token,
        verificationTokenExpiry: Date.now() + VERIFICATION_EXPIRY,
        verifiedAt: null,
        submittedAt: new Date().toISOString(),
        tokenAmount: data.entityType === 'agent' ? 200 : 100,
        agentVerified: data.entityType === 'human' ? true : false // Humans auto-verified
    };

    // Save submission
    registry.submissions.push(submission);
    saveRegistry(registry);

    // Send verification email
    await sendVerificationEmail(submission);

    return {
        success: true,
        message: 'Submission received. Verification email sent.',
        submissionId: submission.id
    };
}

// ============================================================================
// Email Functions (Integration with Agentmail)
// ============================================================================

async function sendVerificationEmail(submission) {
    const verifyUrl = `https://clawtip.me/verify?token=${submission.verificationToken}`;
    
    const emailContent = `
Hello${submission.entityType === 'agent' ? ' Agent' : ''},

Welcome to the CLAW airdrop! Verify your email to claim your tokens.

${submission.entityType === 'agent' ? `Entity: Autonomous Agent (200 CLAW)` : `Entity: Human (100 CLAW)`}
Wallet: ${submission.wallet}

VERIFY YOUR EMAIL:
${verifyUrl}

Or paste this link in your browser:
${verifyUrl}

This link expires in 24 hours.

If you didn't submit this, please ignore this email.

---
CLAW Team
clawtip.me
`;

    // Log for now (in production, integrate with Agentmail service)
    console.log(`[MAILER] Verification email to ${submission.email}`);
    console.log(`[MAILER] Token: ${submission.verificationToken}`);
    console.log(`[MAILER] Link: ${verifyUrl}`);
    console.log('---');

    // TODO: Integrate with actual Agentmail service
    // await agentmail.send({
    //     to: submission.email,
    //     subject: 'Verify your CLAW Airdrop',
    //     text: emailContent,
    //     html: htmlContent
    // });

    return true;
}

async function sendDistributionEmail(submission, transactionId) {
    const emailContent = `
Hello,

Your CLAW airdrop has been distributed!

Amount: ${submission.tokenAmount} CLAW
Wallet: ${submission.wallet}
Transaction: ${transactionId}
Date: ${new Date().toISOString()}

Check your wallet on Solana blockchain to confirm receipt.

---
CLAW Team
clawtip.me
`;

    console.log(`[MAILER] Distribution email to ${submission.email}`);
    console.log(`[MAILER] Amount: ${submission.tokenAmount} CLAW`);
    console.log(`[MAILER] TxID: ${transactionId}`);
    console.log('---');

    return true;
}

// ============================================================================
// Verification
// ============================================================================

function verifyEmail(token) {
    const registry = loadRegistry();
    const submission = registry.submissions.find(s => s.verificationToken === token);

    if (!submission) {
        return { success: false, error: 'Invalid verification token' };
    }

    if (Date.now() > submission.verificationTokenExpiry) {
        return { success: false, error: 'Verification token has expired' };
    }

    if (submission.verifiedAt) {
        return { success: false, error: 'Email already verified' };
    }

    // Mark as verified
    submission.verifiedAt = new Date().toISOString();
    submission.verificationToken = null;
    submission.verificationTokenExpiry = null;

    saveRegistry(registry);

    return { success: true, message: 'Email verified! You will receive your CLAW in the next distribution batch.' };
}

// ============================================================================
// Token Distribution
// ============================================================================

async function distributeTokens(dryRun = true) {
    const registry = loadRegistry();
    const verified = registry.submissions.filter(s => s.verifiedAt && !s.distributedAt);

    console.log(`Found ${verified.length} verified submissions pending distribution`);

    const results = [];

    for (const submission of verified) {
        const txId = crypto.randomBytes(32).toString('hex').substring(0, 44);

        if (dryRun) {
            console.log(`[DRY-RUN] Would distribute ${submission.tokenAmount} CLAW to ${submission.wallet}`);
            results.push({
                submissionId: submission.id,
                email: submission.email,
                amount: submission.tokenAmount,
                wallet: submission.wallet,
                status: 'DRY-RUN'
            });
        } else {
            // In production, this would call the Solana RPC to transfer tokens
            console.log(`[DISTRIBUTION] Sending ${submission.tokenAmount} CLAW to ${submission.wallet}`);

            // Simulate transaction
            submission.distributedAt = new Date().toISOString();
            submission.transactionId = txId;

            // Send confirmation email
            await sendDistributionEmail(submission, txId);

            results.push({
                submissionId: submission.id,
                email: submission.email,
                amount: submission.tokenAmount,
                wallet: submission.wallet,
                transactionId: txId,
                status: 'SENT'
            });
        }
    }

    if (!dryRun) {
        saveRegistry(registry);
    }

    return results;
}

// ============================================================================
// List Submissions
// ============================================================================

function listSubmissions(filter = 'all') {
    const registry = loadRegistry();
    let filtered = registry.submissions;

    if (filter === 'verified') {
        filtered = filtered.filter(s => s.verifiedAt);
    } else if (filter === 'pending') {
        filtered = filtered.filter(s => !s.verifiedAt);
    } else if (filter === 'distributed') {
        filtered = filtered.filter(s => s.distributedAt);
    }

    console.log(`\n=== AIRDROP SUBMISSIONS (${filter}) ===`);
    console.log(`Total: ${filtered.length}\n`);

    filtered.forEach(s => {
        console.log(`ID: ${s.id}`);
        console.log(`Email: ${s.email} ${s.verifiedAt ? '[VERIFIED]' : '[PENDING]'} ${s.distributedAt ? '[DISTRIBUTED]' : ''}`);
        console.log(`Wallet: ${s.wallet}`);
        console.log(`Type: ${s.entityType} (${s.tokenAmount} CLAW)`);
        console.log(`Submitted: ${s.submittedAt}`);
        if (s.transactionId) console.log(`TxID: ${s.transactionId}`);
        console.log('---');
    });

    // Summary stats
    const stats = {
        total: registry.submissions.length,
        verified: registry.submissions.filter(s => s.verifiedAt).length,
        pending: registry.submissions.filter(s => !s.verifiedAt).length,
        distributed: registry.submissions.filter(s => s.distributedAt).length,
        totalTokens: registry.submissions.reduce((sum, s) => sum + s.tokenAmount, 0),
        totalDistributed: registry.submissions
            .filter(s => s.distributedAt)
            .reduce((sum, s) => sum + s.tokenAmount, 0)
    };

    console.log('\n=== STATISTICS ===');
    console.log(`Total Submissions: ${stats.total}`);
    console.log(`Verified: ${stats.verified}`);
    console.log(`Pending: ${stats.pending}`);
    console.log(`Distributed: ${stats.distributed}`);
    console.log(`Total CLAW Committed: ${stats.totalTokens}`);
    console.log(`Total CLAW Distributed: ${stats.totalDistributed}\n`);

    return filtered;
}

// ============================================================================
// HTTP Server (for /api/airdrop endpoint)
// ============================================================================

function createServer() {
    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/api/airdrop') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const result = await processSubmission(data);
                    
                    res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else if (req.method === 'GET' && req.url.startsWith('/verify')) {
            const token = new URL(req.url, 'http://localhost').searchParams.get('token');
            const result = verifyEmail(token);
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    return server;
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];

    switch (action) {
        case 'process-submission': {
            const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
            const wallet = args.find(arg => arg.startsWith('--wallet='))?.split('=')[1];
            const entityType = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'human';

            const result = await processSubmission({
                email,
                wallet,
                entityType,
                newsletter: true
            });
            console.log(result);
            break;
        }

        case 'verify': {
            const token = args.find(arg => arg.startsWith('--token='))?.split('=')[1];
            const result = verifyEmail(token);
            console.log(result);
            break;
        }

        case 'distribute': {
            const dryRun = !args.includes('--execute');
            const results = await distributeTokens(dryRun);
            console.log('\nDistribution Results:', results);
            break;
        }

        case 'list': {
            const filter = args.find(arg => arg.startsWith('--filter='))?.split('=')[1] || 'all';
            listSubmissions(filter);
            break;
        }

        case 'server': {
            const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');
            const server = createServer();
            server.listen(port, () => {
                console.log(`Airdrop server listening on port ${port}`);
                console.log(`POST /api/airdrop - Submit airdrop claim`);
                console.log(`GET /verify?token=... - Verify email`);
            });
            break;
        }

        default:
            console.log(`
Usage:
  node airdrop-processor.js --action=process-submission --email=user@example.com --wallet=9B...5L
  node airdrop-processor.js --action=verify --token=abc123
  node airdrop-processor.js --action=distribute [--execute]
  node airdrop-processor.js --action=list [--filter=verified|pending|distributed]
  node airdrop-processor.js --action=server [--port=3000]
            `);
    }
}

// Export for use as module
module.exports = {
    processSubmission,
    verifyEmail,
    distributeTokens,
    listSubmissions,
    createServer,
    loadRegistry,
    saveRegistry,
    isValidEmail,
    isValidSolanaWallet,
    isValidUrl,
    sendVerificationEmail,
    sendDistributionEmail
};

if (require.main === module) {
    main().catch(console.error);
}
