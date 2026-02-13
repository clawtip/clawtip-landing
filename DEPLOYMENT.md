# CLAW Airdrop System - Deployment Guide

Complete deployment instructions for the CLAW token airdrop system.

## Pre-Deployment Checklist

- [ ] Favicon generated: `favicon.ico` exists
- [ ] Landing page updated: Form embedded in `index.html`
- [ ] All CSS/JS files created and tested
- [ ] Registry initialized: `airdrop-registry.json` exists
- [ ] Backend processor: `airdrop-processor.js` tested
- [ ] Mailer integration: `airdrop-mailer.js` configured
- [ ] Netlify functions: `/netlify/functions/` directory created
- [ ] Distribution script: `distribute-weekly.sh` executable
- [ ] Documentation complete: `AIRDROP-README.md` and `DEPLOYMENT.md`

## Step 1: File Structure

Ensure all files are in place:

```
clawtip-landing/
├── index.html                              # Landing page (UPDATED)
├── airdrop.js                              # Frontend form handler
├── airdrop-styles.css                      # Form styling
├── airdrop-processor.js                    # Backend processor
├── airdrop-mailer.js                       # Email integration
├── airdrop-registry.json                   # Submission database
├── distribute-weekly.sh                    # Distribution script
├── favicon.ico                             # Generated from logo.png
├── AIRDROP-README.md                       # System documentation
├── DEPLOYMENT.md                           # This file
├── logo.png                                # (existing)
├── netlify/
│   └── functions/
│       ├── airdrop.js                      # POST /api/airdrop
│       └── verify.js                       # GET /verify?token=...
└── .netlify/
    └── netlify.toml                        # (configure if needed)
```

### Verify File Sizes

```bash
cd /home/connor/.openclaw/workspace/clawtip-landing

# Check all files are present
ls -lh *.html *.js *.css *.json *.ico *.md *.sh 2>/dev/null

# Expected approximate sizes:
# airdrop.js: 8-10 KB
# airdrop-processor.js: 16-18 KB
# airdrop-mailer.js: 16-18 KB
# airdrop-styles.css: 4-5 KB
# index.html: 35-40 KB (with embedded form)
# favicon.ico: 20-25 KB
```

## Step 2: Environment Configuration

### Netlify Environment Variables

Set these in the Netlify dashboard (Settings > Build & deploy > Environment):

```
AGENTMAIL_API_KEY=sk_live_xxxxx
AGENTMAIL_FROM=noreply@clawtip.me
AGENTMAIL_API_URL=https://agentmail.io/api
NODE_VERSION=20  # (optional, recommended)
```

### Local Development

Create `.env` file for local testing (do NOT commit):

```bash
AGENTMAIL_API_KEY=local-dev
AGENTMAIL_FROM=noreply@clawtip.me
```

Load environment:

```bash
export $(cat .env | xargs)
```

## Step 3: Netlify Function Configuration

Update `netlify.toml` in repository root if needed:

```toml
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."

[[redirects]]
  from = "/api/airdrop"
  to = "/.netlify/functions/airdrop"
  status = 200

[[redirects]]
  from = "/verify"
  to = "/.netlify/functions/verify"
  status = 200
```

## Step 4: Testing

### Local Testing

```bash
cd /home/connor/.openclaw/workspace/clawtip-landing

# Start development server with Node.js
node airdrop-processor.js --action=server --port=3000

# In another terminal, test the form submission:
curl -X POST http://localhost:3000/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "wallet": "EPjFWaLb3gSP6arysrx4zGVjS9o2XQd6gchcUTooqZC",
    "entityType": "human",
    "newsletter": true,
    "terms": true
  }'

# Test email verification:
curl "http://localhost:3000/verify?token=test-token"

# Check submissions:
node airdrop-processor.js --action=list

# Test distribution (dry-run):
node airdrop-processor.js --action=distribute

# Test mailer in dev mode:
node airdrop-mailer.js --action=test-verification
```

### Browser Testing

1. Open index.html in browser
2. Test form validation:
   - Invalid email (should show error)
   - Invalid wallet (should show error)
   - Required fields (should require selection)
3. Test conditional fields:
   - Select "Human" (agent fields hidden)
   - Select "Agent" (agent fields shown and required)
4. Test form submission:
   - Fill all required fields
   - Click "Claim CLAW"
   - Check console for POST request
5. Test spam prevention:
   - Submit form successfully
   - Check browser console for spam cookie
   - Refresh page (form should show "already submitted" message)

### Netlify Testing

After deploying to Netlify:

```bash
# Test API endpoint:
curl -X POST https://clawtip.me/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "wallet": "EPjFWaLb3gSP6arysrx4zGVjS9o2XQd6gchcUTooqZC",
    "entityType": "human",
    "newsletter": true,
    "terms": true
  }'

# Check Netlify function logs:
# Dashboard > Logs > Function Logs
```

## Step 5: Deployment

### Git Push

```bash
cd /home/connor/.openclaw/workspace/clawtip-landing

# Add all files
git add .

# Commit
git commit -m "feat: complete airdrop system implementation

- Add signup form with validation (HTML/CSS/JS)
- Backend processor with email verification
- JSON registry for submissions
- Weekly distribution script
- Agentmail integration
- Netlify function endpoints
- Comprehensive documentation"

# Push
git push origin main
```

### Netlify Auto-Deploy

Once pushed to main branch:
1. Netlify automatically detects changes
2. Runs build command (npm install if package.json present)
3. Deploys to production (clawtip.me)
4. Check deployment status: Dashboard > Deploys

### Manual Verification

After deployment:

1. Visit https://clawtip.me
2. Scroll to airdrop form
3. Test form submission
4. Check browser console for successful POST
5. Verify email was "sent" (in logs or Agentmail dashboard)
6. Click verification link in dev logs or Agentmail
7. Confirm email is marked as verified

## Step 6: Production Setup

### Email Configuration

1. **Agentmail Account**:
   - Create account at agentmail.io
   - Get API key from settings
   - Add noreply@clawtip.me as sender

2. **Sender Domain**:
   - Configure SPF record: `v=spf1 include:agentmail.io ~all`
   - Configure DKIM (Agentmail provides setup)
   - Verify domain ownership in Agentmail dashboard

3. **Set Netlify Env Vars** (see Step 2)

### Token Distribution Setup

1. **Configure Solana RPC**:
   - Add to airdrop-processor.js:
     ```javascript
     const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
     ```
   - Set env var: `SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`

2. **Setup Token Custody Wallet**:
   - Create multi-sig wallet for CLAW tokens
   - Fund with airdrop amount
   - Add public key to airdrop-processor.js

3. **Implement Transaction Broadcasting**:
   - In `distributeTokens()`, replace console.log with actual Solana API calls
   - Use @solana/web3.js library
   - Test with devnet first, then testnet, then mainnet

4. **Setup Weekly Cron Job**:
   ```bash
   # SSH into server
   
   # Copy distribution script
   cp distribute-weekly.sh /opt/claw/distribute-weekly.sh
   chmod +x /opt/claw/distribute-weekly.sh
   
   # Add to crontab (every Friday 09:00 GMT)
   0 9 * * 5 /opt/claw/distribute-weekly.sh --execute >> /var/log/claw-distribution.log 2>&1
   
   # Verify cron job:
   crontab -l
   ```

5. **Monitor Distribution**:
   ```bash
   # Check logs
   tail -f /var/log/claw-distribution.log
   
   # Manual run (with --execute for real)
   /opt/claw/distribute-weekly.sh --execute
   ```

### Database Security

1. **Backup Registry**:
   ```bash
   # Daily backup (add to cron)
   0 2 * * * cp /path/to/airdrop-registry.json /backup/airdrop-registry-$(date +\%Y\%m\%d).json
   ```

2. **Encrypt Sensitive Data** (future enhancement):
   - Consider encrypting wallet addresses in registry
   - Use encryption module for email addresses

3. **Version Control**:
   ```bash
   # Add registry to .gitignore to prevent wallet exposure
   echo "airdrop-registry.json" >> .gitignore
   git rm --cached airdrop-registry.json
   git commit -m "Remove airdrop registry from version control"
   ```

## Step 7: Monitoring & Maintenance

### Daily Checks

```bash
# Monitor form submissions
node airdrop-processor.js --action=list --filter=pending

# Check distribution schedule
crontab -l | grep distribute

# Monitor logs
tail -20 /var/log/claw-distribution.log
```

### Weekly Checks

```bash
# After Friday distribution, verify:
node airdrop-processor.js --action=list --filter=distributed

# Check email delivery stats in Agentmail dashboard
# Review any failed submissions in registry
```

### Monthly Checks

- Update AIRDROP-README.md with stats
- Review and archive old logs
- Audit registry for data quality
- Update distribution script as needed

### Alerts to Setup

1. **Failed Distribution**: Notify ops if distribution script fails
2. **High Bounce Rate**: Alert if emails bouncing > 5%
3. **Unusual Activity**: Monitor for spam/abuse patterns
4. **Token Transfer Failures**: Alert on failed Solana transactions

## Step 8: Support & Documentation

### Support Workflow

1. User encounters issue
2. Check AIRDROP-README.md FAQ
3. Review console logs for errors
4. Escalate to ops team if needed

### Documentation Updates

When deploying updates:
1. Update AIRDROP-README.md
2. Update DEPLOYMENT.md
3. Add changelog entry
4. Commit with descriptive message

## Rollback Procedure

If deployment fails:

```bash
# 1. Identify issue
# Check Netlify deploy logs: Dashboard > Deploys > Latest

# 2. Revert code
git revert HEAD
git push origin main

# 3. Verify rollback
# Netlify auto-deploys previous version
# Check that airdrop form is back to working state

# 4. Investigate and fix locally
# Test thoroughly before re-deploying
```

## Performance Checklist

- [ ] Form loads in < 2 seconds
- [ ] Form submission completes in < 5 seconds
- [ ] Email delivery within 5 minutes
- [ ] Verification link works within 24 hours
- [ ] Distribution completes within 1 hour
- [ ] Registry queries return in < 1 second
- [ ] No memory leaks in background jobs

## Security Checklist

- [ ] No wallet addresses in client-side code
- [ ] No API keys in version control
- [ ] Environment variables set in Netlify dashboard
- [ ] CORS headers properly configured
- [ ] Input validation on both client and server
- [ ] HTTPS enforced (https://clawtip.me)
- [ ] Registry file permissions: `chmod 600 airdrop-registry.json`
- [ ] No sensitive data in logs
- [ ] Verification tokens are random and unique
- [ ] Email validation prevents spoofing

## Troubleshooting Guide

### Form Submission Fails

```bash
# Check API endpoint:
curl -X POST https://clawtip.me/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","wallet":"EPjFWaLb3gSP6arysrx4zGVjS9o2XQd6gchcUTooqZC","entityType":"human","newsletter":true,"terms":true}'

# Check Netlify logs:
# Dashboard > Logs > Function Logs > airdrop

# Verify endpoint is configured in netlify.toml
```

### Email Not Sending

```bash
# Check AGENTMAIL_API_KEY is set:
curl -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  https://agentmail.io/api/status

# Check email provider logs
# Verify sender domain is configured in Agentmail

# In dev mode, emails are logged to stdout
```

### Distribution Script Fails

```bash
# Check cron job output:
tail /var/log/claw-distribution.log

# Run manually with debug output:
bash -x /opt/claw/distribute-weekly.sh

# Check Node.js version:
node --version  # Should be v12+

# Check registry file exists and is readable:
ls -l /path/to/airdrop-registry.json
```

## Post-Deployment

1. **Announce Launch**: Post on social media/Discord
2. **Monitor Submissions**: Track form submissions for first 24 hours
3. **Test Distribution**: Run first distribution to verify everything works
4. **Gather Feedback**: Review user feedback and adjust as needed
5. **Celebrate**: 🎉 Airdrop system is live!

---

**Deployment Date**: [DATE]  
**Deployed By**: [NAME]  
**Status**: [PENDING/IN PROGRESS/COMPLETE]  
**Notes**: [Any issues or decisions made]
