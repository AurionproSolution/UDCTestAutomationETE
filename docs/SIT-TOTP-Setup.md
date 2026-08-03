# SIT Environment TOTP Setup Guide

## Quick Setup (2 minutes)

Since your team shares one SIT account (`deepak.paramanick1`), each team member needs the same TOTP secret for **both DO and RSS** portals (same FIS IdP user).

### Step 1: Get the TOTP Secret
Contact your team lead for the shared TOTP secret, or check your team's password manager (1Password, LastPass, Azure Key Vault, etc.).

### Step 2: Create Your Local Secrets File

```powershell
# Copy the example file
copy config/secrets.local.json.example config/secrets.local.json
```

Edit `config/secrets.local.json`:
```json
{
  "_comment": "Copy this file to secrets.local.json and add your TOTP secret for SIT",
  "sit": {
    "totpSecret": "R2NSSLUZUHUVNMYWF5X2DE5TXEAPHK7R"
  }
}
```

**IMPORTANT:** This file is gitignored - never commit it!

### Step 3: Run Tests

```powershell
# DO portal
$env:TEST_ENV="sit"
npm run test:do:auth
npm run test:do:sit -- --grep "@TCC001"

# RSS portal
npm run test:rss:auth
npm run test:rss:sit -- tests/rss-portal/login/login.test.ts
```

That's it! TOTP codes are generated automatically.

## Alternative: Environment Variable

If you prefer not to use the file:

```powershell
$env:TEST_ENV="sit"
$env:DO_PORTAL_TOTP_SECRET="R2NSSLUZUHUVNMYWF5X2DE5TXEAPHK7R"
$env:RSS_PORTAL_TOTP_SECRET="R2NSSLUZUHUVNMYWF5X2DE5TXEAPHK7R"
npm run test:do:sit -- --grep "@TCC001"
npm run test:rss:sit
```

## RSS SIT Portal

- **URL:** `https://udc-test.fiscloudservices.com/SITRSSPortal/`
- **User:** `deepak.paramanick1` (configured in `testData/rss-portal/loginData.json` → `environments.sit`)
- **Post-login:** Retail Self Service card on the Select Application screen
- **Session file:** `playwright/.auth/rss-portal.sit.json`
- **Token refresh:** Silent `refresh_token` grant every ~15 min (same as DO)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "SIT OTP prompt detected but secret not set" | Check `config/secrets.local.json` exists and has correct format |
| "Invalid TOTP code" | Sync your system clock (TOTP is time-based) |
| Tests hang at OTP prompt | Set the secret via env var or file as shown above |
| RSS auth setup fails on Retail Self Service | Ensure `TEST_ENV=sit` and run `npm run test:rss:auth` headed once |

## Security Notes

- The TOTP secret is like a password - treat it confidentially
- Use your team's password manager to share it
- The `secrets.local.json` file is gitignored by default
- Never paste the secret in chat, emails, or commit messages
