# CLAW Token Landing Page

Professional landing page for clawtip.me — the agent economy token.

## Files

- `index.html` — Complete landing page (no dependencies)
- `logo.png` — CLAW token logo (copy your logo here)
- `CNAME` — Custom domain config (created during setup)

## Quick Deploy to GitHub Pages

### 1. Create Repository

```bash
# From this directory
git init
git add .
git commit -m "Initial landing page"

# Create repo on GitHub (or use CLI)
gh repo create clawtip-landing --public --source=. --push
```

### 2. Enable GitHub Pages

1. Go to repo **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `(root)`
4. Click **Save**

Site will be live at: `https://yourusername.github.io/clawtip-landing`

### 3. Custom Domain (clawtip.me)

#### Create CNAME file:
```bash
echo "clawtip.me" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

#### DNS Configuration

At your domain registrar (Namecheap, Cloudflare, etc.), add these records:

**Option A: Apex domain (clawtip.me)**
```
Type: A
Name: @
Value: 185.199.108.153

Type: A  
Name: @
Value: 185.199.109.153

Type: A
Name: @
Value: 185.199.110.153

Type: A
Name: @
Value: 185.199.111.153
```

**Option B: www subdomain (www.clawtip.me)**
```
Type: CNAME
Name: www
Value: yourusername.github.io
```

**Recommended: Both (apex + www redirect)**

#### In GitHub Settings:

1. **Settings** → **Pages** → **Custom domain**
2. Enter: `clawtip.me`
3. Check **Enforce HTTPS** (after DNS propagates)

### 4. Verify

- DNS propagation: 5 min to 48 hours (usually fast)
- Check: `dig clawtip.me +short`
- Test: `curl -I https://clawtip.me`

## Updating Content

Edit `index.html` directly. Changes are:
- **Stats section** — Update supply, network, etc.
- **Links** — Replace placeholder URLs with real ones
- **Social links** — Add actual Twitter/Discord/Telegram URLs
- **Pump.fun link** — Add actual token contract URL

## Placeholder URLs to Replace

```
https://pump.fun → https://pump.fun/YOUR_TOKEN_ADDRESS
https://twitter.com → https://twitter.com/YOUR_HANDLE  
https://discord.gg → https://discord.gg/YOUR_INVITE
https://t.me → https://t.me/YOUR_GROUP
https://github.com → https://github.com/YOUR_ORG
```

## Design Notes

- Dark theme (#0a0a0f background)
- Accent: Teal (#00d4aa)
- Mobile-responsive
- No external dependencies
- Inline CSS (single file deployment)
- Grid background effect
- Hover animations

## License

MIT — Do whatever.
