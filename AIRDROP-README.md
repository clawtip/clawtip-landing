# CLAW Token Airdrop System

Complete signup, verification, and distribution system for the CLAW token airdrop.

## Overview

This airdrop system provides:
- **Signup Form**: HTML/CSS/JS form with client-side validation
- **Backend Processor**: Node.js validation, verification, and storage
- **Email Verification**: Integration with Agentmail for verification emails
- **Cookie-based Anti-spam**: Prevents duplicate submissions within 24 hours
- **JSON Database**: Simple JSON-based registry of submissions
- **Token Distribution**: Automated weekly distribution to verified recipients
- **Agent Verification**: Special handling for autonomous agents (200 CLAW) vs humans (100 CLAW)

## File Structure

```
clawtip-landing/
├── index.html                    # Landing page with embedded airdrop form
├── airdrop-form.html            # Standalone form HTML (for reference)
├── airdrop.js                   # Frontend form handler & validation
├── airdrop-styles.css           # Form styling
├── airdrop-processor.js         # Backend processor (Node.js)
├── airdrop-mailer.js            # Email integration with Agentmail
├── airdrop-registry.json        # JSON database of submissions
├── distribute-weekly.sh         # Weekly distribution script
├── favicon.ico                  # Generated from logo.png
└── AIRDROP-README.md            # This file
```

## Frontend: Signup Form

### Location
The form is embedded in `index.html` above the "How to Qualify" section.

### Features
- **Email validation**: RFC 5322 compliant email format
- **Wallet validation**: Checks Solana wallet address format (44-char base58)
- **Entity type selection**: Human or Autonomous Agent
- **Agent-specific fields**: 
  - Moltbook handle (for agent identity)
  - GitHub repository link (proof of work)
  - Reddit handle (optional, for r/clawtip community)
- **Newsletter subscription**: Users can opt-in to updates
- **Terms agreement**: Checkbox for TOS/Privacy Policy acceptance
- **Cookie-based anti-spam**: Prevents resubmission within 24 hours

### Client-Side Validation
The form validates all inputs before submission:
- Email format
- Solana wallet address format
- Required fields for agents
- Agreement to terms

### Error Handling
- Field-level error messages
- Color-coded error states
- Responsive error display with focus management
- Form submission disabled during processing

### Success Flow
1. Form submission triggers client-side validation
2. Valid data sent to `/api/airdrop` endpoint
3. Server processes and validates
4. Success message displayed
5. Spam cookie set (24-hour duration)
6. Verification email sent to user
7. Form is reset

## Backend: Processing & Storage

### API Endpoint
**POST `/api/airdrop`**

Request body:
```json
{
  "email": "user@example.com",
  "wallet": "9B5X5Y3qZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5",
  "entityType": "human",
  "moltbookHandle": "@YourAgent",
  "githubRepo": "github.com/user/agent",
  "redditHandle": "u/username",
  "description": "I'm building an AI assistant...",
  "newsletter": true,
  "terms": true
}
```

Response:
```json
{
  "success": true,
  "message": "Submission received. Verification email sent.",
  "submissionId": "a1b2c3d4e5f6g7h8"
}
```

### Validation Logic
- **Email**: Validates format and checks for duplicates
- **Wallet**: Validates Solana address format (44 chars, base58)
- **Entity Type**: Must be "human" or "agent"
- **Agent Fields**: Required if entity type is "agent"
  - Moltbook handle
  - GitHub repository (must be valid URL)
  - Reddit handle (optional)
- **Duplicates**: Prevents resubmission of same email

### Storage Format
Submissions stored in `airdrop-registry.json`:

```json
{
  "submissions": [
    {
      "id": "a1b2c3d4",
      "email": "user@example.com",
      "wallet": "9B5X5Y3qZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5",
      "entityType": "human",
      "moltbookHandle": null,
      "githubRepo": null,
      "redditHandle": null,
      "description": "Building an AI...",
      "newsletter": true,
      "verificationToken": "abc123...",
      "verificationTokenExpiry": 1739433600000,
      "verifiedAt": null,
      "submittedAt": "2026-02-13T07:33:00Z",
      "tokenAmount": 100,
      "agentVerified": true,
      "distributedAt": null,
      "transactionId": null
    }
  ],
  "distributions": [],
  "metadata": {
    "created": "2026-02-13T07:33:00Z",
    "lastDistribution": null,
    "totalTokensCommitted": 100,
    "totalTokensDistributed": 0
  }
}
```

## Email Verification

### Agentmail Integration
The `airdrop-mailer.js` module handles all email communications:

```bash
AGENTMAIL_API_KEY=your_api_key node airdrop-mailer.js --action=test-verification
```

### Verification Flow
1. User submits form
2. Verification token generated (32-byte hex)
3. Verification email sent with unique token
4. Token expires in 24 hours
5. User clicks link: `https://clawtip.me/verify?token=...`
6. Email marked as verified
7. User eligible for next distribution batch

### Email Templates
- **Verification Email**: HTML + text with verification link
- **Distribution Email**: HTML + text with transaction details and Solscan link

### Development Mode
If `AGENTMAIL_API_KEY` is not set (or set to `local-dev`), emails are logged to stdout:
```
[AGENTMAIL-DEV] Email to: user@example.com
[AGENTMAIL-DEV] Subject: Verify your CLAW Airdrop
[AGENTMAIL-DEV] HTML length: 5432 bytes
```

### Configuration
```bash
# Set environment variables
export AGENTMAIL_API_KEY=sk_live_xxx
export AGENTMAIL_FROM=noreply@clawtip.me
export AGENTMAIL_API_URL=https://agentmail.io/api
```

## Anti-Spam: Cookie-Based Prevention

### Implementation
- **Cookie name**: `airdrop_submitted`
- **Duration**: 24 hours
- **Scope**: Path: `/`, SameSite: Strict

### Flow
1. User submits form successfully
2. `setSpamCookie()` called
3. Cookie set with 24-hour expiry
4. On page load, `checkExistingSubmission()` reads cookie
5. If cookie exists, form is disabled and informational message shown

### Bypass Protection
- Different browsers = different cookies
- Clearing cookies = can resubmit (intentional for legitimate re-registration)
- VPN/proxy changes don't affect same-device cookie

## Token Distribution

### Amounts
- **Humans**: 100 CLAW per verified signup
- **Agents**: 200 CLAW per verified signup
  - Agents must pass identity verification (Moltbook + GitHub)

### Distribution Schedule
- **Frequency**: Every Friday at 09:00 GMT
- **Automation**: Cron job via `distribute-weekly.sh`
- **Batch Processing**: All verified unprocessed submissions in one transaction

### Distribution Processor
Command-line interface in `airdrop-processor.js`:

```bash
# Dry run (preview what would be distributed)
node airdrop-processor.js --action=distribute

# Execute distribution (actually sends tokens)
node airdrop-processor.js --action=distribute --execute

# List submissions
node airdrop-processor.js --action=list
node airdrop-processor.js --action=list --filter=verified
node airdrop-processor.js --action=list --filter=pending
node airdrop-processor.js --action=list --filter=distributed
```

### Cron Setup
Schedule the weekly distribution via cron:

```bash
# Add to crontab (every Friday 09:00 GMT)
0 9 * * 5 /path/to/distribute-weekly.sh --execute >> /var/log/claw-distribution.log 2>&1
```

The script:
1. Loads all verified, unprocessed submissions
2. Generates transaction IDs
3. Sends tokens (in production, calls Solana RPC)
4. Sends confirmation emails
5. Updates registry with distribution timestamp and transaction ID
6. Logs results to `/var/log/claw-distribution.log`

## Deployment

### Netlify Functions
Create `/netlify/functions/airdrop.js` to handle the API endpoint:

```javascript
const processor = require('../../airdrop-processor');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const result = await processor.processSubmission(data);
        return {
            statusCode: result.success ? 200 : 400,
            body: JSON.stringify(result)
        };
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

### Environment Variables
Set in Netlify dashboard:
```
AGENTMAIL_API_KEY=sk_live_xxx
AGENTMAIL_FROM=noreply@clawtip.me
AGENTMAIL_API_URL=https://agentmail.io/api
```

### Static Files
Deploy these files to Netlify:
- `index.html` (with embedded form)
- `airdrop.js` (frontend validation)
- `airdrop-styles.css` (form styling)
- `favicon.ico` (from logo)

## Usage

### For Users
1. Navigate to [clawtip.me](https://clawtip.me)
2. Scroll to the airdrop form
3. Select "Human" or "Autonomous Agent"
4. Fill in required fields
5. Click "Claim CLAW"
6. Check email for verification link
7. Click link to verify
8. Wait for Friday distribution batch
9. Check wallet for CLAW tokens

### For Operators
```bash
# Start backend server locally
node airdrop-processor.js --action=server --port=3000

# Test submission
curl -X POST http://localhost:3000/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "wallet": "9B5X5Y3qZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5",
    "entityType": "human"
  }'

# Verify email
curl "http://localhost:3000/verify?token=abc123"

# Check submissions
node airdrop-processor.js --action=list

# Dry run distribution
node airdrop-processor.js --action=distribute

# Execute distribution
node airdrop-processor.js --action=distribute --execute
```

### For Developers
```bash
# Test form validation (in browser console)
validateForm()
isValidEmail('user@example.com')
isValidSolanaWallet('9B5X5Y3qZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5')
isValidUrl('github.com/user/repo')

# Test mailer
AGENTMAIL_API_KEY=test node airdrop-mailer.js --action=test-verification
```

## Agent Verification

### Requirements for Agents
To claim the 200 CLAW agent bonus, autonomous agents must provide:

1. **Moltbook Handle**: Verified profile on [Moltbook](https://moltbook.com)
   - Links to agent's public profile
   - Demonstrates identity and reputation

2. **GitHub Repository**: Public repository or proof of work
   - Links to agent's codebase
   - Demonstrates technical legitimacy
   - Can be example code, agent config, or tools repo

3. **Reddit Handle** (optional): Profile on [r/clawtip](https://reddit.com/r/clawtip)
   - Additional community presence signal
   - Not required but recommended

### Verification Process
1. On airdrop submission, agent fields are validated for format
2. Email is sent with verification link
3. Upon email verification, submission is queued for manual review
4. CLAW team verifies agent identity via:
   - Moltbook profile lookup
   - GitHub repository review
   - Reddit community participation
5. If verified: Agent marked as `agentVerified: true`
6. If not verified: Agent receives 100 CLAW (human rate) or claim is rejected

### Rejection Handling
If agent verification fails:
1. Email sent explaining reason
2. Option to resubmit with corrected info
3. Can claim as human (100 CLAW) if preferred
4. Can contact support for manual review

## Security Considerations

### Input Validation
- All user inputs validated on both client and server
- Email format verified with regex
- Solana wallet format verified (44-char base58)
- URL format validated with URL constructor
- Text inputs limited to 500 characters

### CSRF Protection
- Form submission requires valid HTML form (not raw POST)
- CORS headers configured
- Cookies use SameSite=Strict

### Token Security
- Verification tokens are 32-byte random hex
- Tokens expire in 24 hours
- Tokens are single-use (cleared after verification)
- Tokens stored in registry (not accessible without file access)

### Database Security
- JSON registry file should be in version control with .gitignore
- In production, use encrypted database backend
- Never commit production registry with real wallet addresses

### Email Security
- Verification links are time-limited
- Tokens are random and unique per submission
- Emails sent only to verified sender email
- Distribution emails contain public transaction info only

## Monitoring & Metrics

### Registry Stats
```bash
node airdrop-processor.js --action=list

# Output includes:
# - Total submissions
# - Verified vs pending
# - Distributed vs pending
# - Total CLAW committed
# - Total CLAW distributed
```

### Distribution Log
```bash
tail -f /var/log/claw-distribution.log
```

### Webhook Integration (Future)
Could integrate with:
- Discord bot: Post distribution results to #airdrop channel
- Email: Send summary to ops team
- Slack: Post distribution status

## Troubleshooting

### Form Not Submitting
1. Check browser console for JavaScript errors
2. Verify `/api/airdrop` endpoint is configured
3. Check CORS headers
4. Verify form validation passes (check error messages)

### Email Not Received
1. Check spam/junk folder
2. Verify email in Agentmail logs (development mode shows in stdout)
3. Check AGENTMAIL_API_KEY is set correctly
4. Verify sender domain (noreply@clawtip.me) is whitelisted

### Verification Link Not Working
1. Check token matches in registry
2. Verify token hasn't expired (24-hour window)
3. Check `/verify` endpoint is configured
4. Test with: `curl "http://localhost/verify?token=..."`

### Distribution Not Running
1. Check cron job is scheduled: `crontab -l`
2. Check logs: `tail -f /var/log/claw-distribution.log`
3. Manual test: `node airdrop-processor.js --action=distribute --execute`
4. Check Node.js version (requires v12+)

### Solana Token Transfer Fails
1. Verify wallet addresses are valid (use Solscan)
2. Check token contract address is correct
3. Verify sender wallet has sufficient CLAW + SOL for fees
4. Check Solana RPC endpoint is accessible
5. Verify transaction didn't already broadcast (check Solscan for txid)

## Future Enhancements

### Roadmap
- [ ] Multi-signature wallet for token custody
- [ ] Tiered airdrop amounts (loyalty bonuses)
- [ ] Referral system (earn CLAW for recruiting)
- [ ] Agent reputation system (verified agents get more)
- [ ] Automated agent verification (GitHub + Moltbook API integration)
- [ ] Dashboard for users to check claim status
- [ ] CSV export for accounting/tax purposes
- [ ] Webhook notifications (Discord, Slack, email)
- [ ] Rate limiting per IP/wallet
- [ ] Captcha protection (if spam becomes issue)
- [ ] Multi-language support
- [ ] Mobile-optimized form
- [ ] Wallet auto-detection (Phantom, Solflare integration)

### Integration Opportunities
- **Moltbook API**: Automatic agent identity verification
- **GitHub API**: Validate repos exist and are active
- **Reddit API**: Check r/clawtip membership
- **Solana RPC**: Direct token transfers instead of manual processing
- **Twitter API**: Verify followers for loyalty bonuses
- **Discord Bot**: Claim CLAW via Discord commands

## Support

### Contact
- **Discord**: [CLAW Community]()
- **Telegram**: [@clawtip](https://t.me/clawtip)
- **Twitter**: [@clawtipbot](https://twitter.com/clawtipbot)
- **Email**: support@clawtip.me

### FAQ

**Q: How long until I receive my CLAW?**
A: After email verification, you'll receive CLAW in the next Friday distribution batch (within 7 days).

**Q: Can I claim multiple times?**
A: No. One submission per email address. Spam prevention cookie prevents duplicate claims within 24 hours.

**Q: What if I'm both human and agent?**
A: Select "Agent" to claim 200 CLAW (with identity verification). You can't claim both.

**Q: Can I use a different wallet later?**
A: No. The wallet address submitted is permanent. You'll need to verify a new email if you want to claim to a different wallet.

**Q: Why do agents get more?**
A: Agents require identity verification and provide ongoing value to the ecosystem. The extra 100 CLAW recognizes this contribution.

---

**Last Updated**: 2026-02-13  
**Version**: 1.0  
**Status**: Production Ready
