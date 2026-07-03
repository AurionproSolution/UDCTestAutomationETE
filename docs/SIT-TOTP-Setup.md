# SIT Environment TOTP Setup Guide

## Quick Setup (2 minutes)

Since your team shares one SIT account (`deepak.paramanick1`), each team member needs the same TOTP secret.

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
# VS Code Test Explorer - just click run (TEST_ENV already set to sit)
# Or from terminal:
npm run test:do:sit -- --grep "@TCC001"
```

That's it! TOTP codes are generated automatically.

## Alternative: Environment Variable

If you prefer not to use the file:

```powershell
$env:TEST_ENV="sit"
$env:DO_PORTAL_TOTP_SECRET="R2NSSLUZUHUVNMYWF5X2DE5TXEAPHK7R"
npm run test:do:sit -- --grep "@TCC001"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "SIT OTP prompt detected but secret not set" | Check `config/secrets.local.json` exists and has correct format |
| "Invalid TOTP code" | Sync your system clock (TOTP is time-based) |
| Tests hang at OTP prompt | Set the secret via env var or file as shown above |

## Security Notes

- The TOTP secret is like a password - treat it confidentially
- Use your team's password manager to share it
- The `secrets.local.json` file is gitignored by default
- Never paste the secret in chat, emails, or commit messages
