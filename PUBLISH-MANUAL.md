# ConstroBill Pro — Publish Manual
**Created by Khammina · SCMV**

> Complete step-by-step guide to publish ConstroBill Pro online using GitHub Pages (free hosting) with optional Google Sheets cloud database for multi-user support.

---

## 📦 Files You Need

| File | Purpose |
|---|---|
| `construction-billing-app.html` | The web application (rename to `index.html` for GitHub) |
| `gas-server.gs` | Google Apps Script backend for cloud database |
| `PUBLISH-MANUAL.md` | This guide |

---

## PART 1 — Publish to GitHub Pages (Free Hosting)

### Step 1.1 — Create a GitHub Account

1. Go to **[github.com](https://github.com)**
2. Click **Sign up**
3. Enter your email, create a password, choose a username
4. Verify your email address
5. Choose the **Free** plan

---

### Step 1.2 — Create a New Repository

1. After signing in, click the **+** icon (top right) → **New repository**
2. Fill in:
   - **Repository name:** `constrobill-pro`
   - **Description:** `Construction Billing Management System by Khammina · SCMV`
   - **Visibility:** ✅ **Public** *(required for free GitHub Pages)*
   - Check ✅ **Add a README file**
3. Click **Create repository**

---

### Step 1.3 — Upload Your Files

1. Inside your new repository, click **Add file → Upload files**
2. Drag and drop these files:
   - `construction-billing-app.html` — **rename this to `index.html` before uploading**
   - `gas-server.gs`
   - `PUBLISH-MANUAL.md`
3. At the bottom, type a commit message: `Initial release - ConstroBill Pro v1.0`
4. Click **Commit changes**

> ⚠️ **Important:** The main app file MUST be named `index.html` for GitHub Pages to serve it correctly.

---

### Step 1.4 — Enable GitHub Pages

1. In your repository, click the **Settings** tab (top menu)
2. In the left sidebar, click **Pages**
3. Under **Source**, select:
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**
5. Wait **1–3 minutes** for GitHub to build your site
6. Refresh the page — you will see:
   > ✅ Your site is live at `https://khammina.github.io/constrobill-pro/`

7. Click the link to open your live app 🎉

---

### Step 1.5 — Test Your Published App

Open your live URL and verify:

- [ ] Login screen appears with ConstroBill Pro branding
- [ ] "Continue without account (Demo)" button works
- [ ] BOQ page loads and you can add items
- [ ] Invoice, Receipt, Dashboard, Finance pages all work
- [ ] Export buttons (Excel, PDF, JPEG) work
- [ ] Theme settings work
- [ ] Preview modal opens correctly

---

### Step 1.6 — Update Your README

1. In your repository, click `README.md`
2. Click the **pencil icon** (Edit)
3. Replace the content with:

```markdown
# ConstroBill Pro
> Construction Billing Management System — Created by Khammina · SCMV

## 🌐 Live App
**[Open ConstroBill Pro →](https://khammina.github.io/constrobill-pro/)**

## ✨ Features
- 📋 Bill of Quotation (BOQ) with Scope, T&C, Discount, Notes
- 🧾 Progress Invoice with cumulative tracking
- ✅ Received Bill with payment verification
- 💰 Finance Tracker & Dashboard
- 💱 Multi-currency: USD / THB / LAK with live exchange rates
- 📄 Export to PDF (A4/A3/Letter), Excel, JPEG
- 🎨 12 UI Themes + custom colors
- 👥 Multi-user with Google Sheets cloud sync (optional)
- 💳 Payment profile history (selectable per invoice)
- ✍ Signature profile history

## 🚀 How to Use
1. Open the live app link above
2. Click **"Continue without account (Demo)"** to start immediately
3. Or register an account and connect Google Sheets for cloud sync

## ☁ Cloud Sync Setup (Optional)
See `gas-server.gs` and `PUBLISH-MANUAL.md` for setup instructions.

## 📄 License
Created by **Khammina · SCMV** — All rights reserved.
```

4. Replace `khammina` and `constrobill-pro` with your actual GitHub username and repo name
5. Click **Commit changes**

---

## PART 2 — Google Sheets Cloud Database Setup (Multi-User)

> This part is **optional**. Without it, the app works perfectly in Demo/Local mode using the browser's localStorage. Set this up if you want:
> - Data saved across multiple devices
> - Multiple users with separate accounts
> - Real login / registration / password reset via email

---

> **Your Google Apps Script Library ID:**
> `1XgwwgNrpMcljBIWxGxUvXEEy6WFvnjlSLMIq_DdnzrtsBZ-ozsQJHhmo`
>
> ⚠️ This is a **library URL** — you still need to create your own Google Sheet and deploy `gas-server.gs` as a Web App to get the `/exec` URL. The library URL is not directly callable as an API.

### Step 2.1 — Create a Google Sheet

1. Go to **[sheets.google.com](https://sheets.google.com)**
2. Click **+ Blank spreadsheet**
3. Name it: `ConstroBill Database`
4. Keep this tab open — you'll return to it

---

### Step 2.2 — Open Google Apps Script

1. In your Google Sheet, click the menu: **Extensions → Apps Script**
2. A new browser tab opens with the Apps Script editor
3. Delete all existing code in the editor (select all → Delete)
4. Open the `gas-server.gs` file from your downloaded files
5. Copy the **entire contents** of `gas-server.gs`
6. Paste it into the Apps Script editor
7. Click the **💾 Save** button (or press `Ctrl+S`)
8. Name the project: `ConstroBill Backend`

---

### Step 2.3 — Initialize the Database Sheets

1. In the Apps Script editor, click the **function dropdown** (shows `doPost` by default)
2. Select **`initSheets`** from the dropdown
3. Click the **▶ Run** button
4. First time only: a permissions dialog will appear
   - Click **Review permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to ConstroBill Backend (unsafe)** *(this is safe — it's your own script)*
   - Click **Allow**
5. Wait for execution to finish
6. You should see: `✅ ConstroBill sheets initialized successfully!`
7. Go back to your Google Sheet — you'll see 5 new sheets created:
   - `Users`
   - `Sessions`
   - `UserData`
   - `PasswordResets`
   - `AuditLog`

---

### Step 2.4 — Set Up Daily Cleanup (Recommended)

1. In Apps Script, select **`setupDailyCleanup`** from the function dropdown
2. Click **▶ Run**
3. This creates an automatic trigger that runs every night at 3am to:
   - Delete expired session tokens
   - Clean up used password reset links
4. You only need to do this once

---

### Step 2.5 — Deploy as Web App

1. In Apps Script, click **Deploy** (top right) → **New deployment**
2. Click the **⚙ gear icon** next to "Type" → select **Web app**
3. Fill in the settings:
   - **Description:** `ConstroBill API v1`
   - **Execute as:** `Me` *(your Google account)*
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. If prompted, authorize again (same steps as Step 2.3)
6. Copy the **Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXX/exec
   ```
7. **Save this URL** — you need it in the next step

---

### Step 2.6 — Connect the Web App to Your App

You have two options:

#### Option A — Edit before uploading to GitHub (recommended)

1. Open `construction-billing-app.html` (or `index.html`) in a text editor (Notepad, VS Code, etc.)
2. Find this line near the top of the file (around line 358):
   ```javascript
   const GAS_URL = '';  // ← paste your Web App URL here
   ```
3. Replace it with your Web App URL:
   ```javascript
   const GAS_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXX/exec';
   ```
4. Save the file
5. Upload the updated file to GitHub (replace the existing `index.html`)

#### Option B — Update on GitHub directly

1. Go to your GitHub repository
2. Click `index.html`
3. Click the **pencil icon** (Edit)
4. Use `Ctrl+F` to find: `const GAS_URL = '';`
5. Replace with your URL (keep the quotes):
   ```javascript
   const GAS_URL = 'https://script.google.com/macros/s/AKfycbxXXXXXXXXX/exec';
   ```
6. Click **Commit changes**

---

### Step 2.7 — Test Cloud Login

1. Open your live GitHub Pages URL
2. Click **Register**
3. Fill in your name, email, company, password
4. Click **Create Account**
5. You should see: `✅ Account created! Please sign in.`
6. Switch to the **Sign In** tab
7. Enter your email and password
8. Click **Sign In**
9. The nav bar should show your name + a **☁ Cloud** green badge
10. Go to BOQ, create a quotation, save it
11. Open the app in another browser or device — sign in — your data should sync ✅

---

### Step 2.8 — Test Password Reset Email

1. Click **Reset** tab on the login screen
2. Enter your email address
3. Click **Send Reset Link**
4. Check your Gmail inbox for a reset email from your Google account
5. Click the link in the email
6. Enter a new password
7. Sign in with the new password

> 📧 Reset emails are sent from **your own Gmail account** (the one that owns the Google Sheet). If users don't receive emails, check your Gmail's Sent folder to confirm it was sent.

---

## PART 3 — Custom Domain (Optional)

> If you want a professional URL like `constrobill.scmv.com *(example)*` instead of `github.io`

### Step 3.1 — Buy a Domain

Purchase a domain from any registrar:
- [Namecheap](https://namecheap.com) — affordable
- [GoDaddy](https://godaddy.com)
- [Google Domains / Squarespace](https://domains.squarespace.com)

### Step 3.2 — Configure DNS

In your domain registrar's DNS settings, add these records:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | khammina.github.io |

### Step 3.3 — Set Custom Domain in GitHub

1. GitHub repo → **Settings → Pages**
2. Under **Custom domain**, enter: `constrobill.scmv.com *(example)*`
3. Click **Save**
4. Check ✅ **Enforce HTTPS**
5. DNS propagation takes **10 minutes to 48 hours**

---

## PART 4 — Sharing With Users

### Share the link

Simply send users your GitHub Pages URL:
```
https://khammina.github.io/constrobill-pro/
```

### What users need to do

| User type | Steps |
|---|---|
| **Demo user** | Open URL → click "Continue without account" → done |
| **Registered user (local)** | Open URL → Register → Sign in → data stays in browser |
| **Full cloud user** | Deploy their own `gas-server.gs` → Register with their URL |

### Each user has their own private database

> ⚠️ Each user who wants cloud sync must deploy their own Google Apps Script and their own Google Sheet. This means **each user's data is stored in their own Google account** — completely private and isolated.

This architecture means:
- You (the publisher) don't store anyone's data
- No central server to maintain
- No hosting costs
- Unlimited users possible

---

## PART 5 — Updating the App

When you want to release a new version:

1. Make your changes to `index.html`
2. Go to your GitHub repository
3. Click `index.html` → **pencil icon** → paste updated content → **Commit changes**
4. Or: upload the new file (it replaces the existing one)
5. GitHub Pages updates automatically within **1–2 minutes**

> 💡 **Tip:** All user data is stored in their own browser / Google Sheet — updating the app file never deletes user data.

---

## PART 6 — Troubleshooting

### App shows blank page
- Make sure the file is named exactly `index.html` (not `construction-billing-app.html`)
- Wait 2–3 minutes after enabling GitHub Pages
- Try hard refresh: `Ctrl+Shift+R`

### Login doesn't work / "GAS_URL not configured"
- Make sure you pasted the Web App URL correctly into `index.html`
- The URL must start with `https://script.google.com/macros/s/`
- Redeploy your Apps Script if you made changes (Deploy → Manage deployments)

### Registration says "Email already exists"
- The user already registered. Try Sign In instead.
- Check the `Users` sheet in your Google Sheet

### Password reset email not received
- Check the Gmail Sent folder of the account that owns the Google Sheet
- Check spam/junk folder of the recipient
- The Gmail daily sending limit is 100 emails/day for free accounts

### Data not syncing between devices
- Make sure the user is signed in (not in Demo mode)
- Check the `☁ Cloud` badge appears in the nav bar
- If it shows "Local" — the GAS_URL is not set
- Check the `UserData` sheet has rows for that user

### Apps Script permission error
- Re-run `initSheets()` and accept permissions again
- Make sure "Who has access" is set to **Anyone** (not "Anyone with link")

### CORS error in browser console
- This is expected when testing locally from a file:// URL
- The app works correctly when hosted on GitHub Pages (https://)
- Test only from your live GitHub Pages URL

---

## Quick Reference

| Item | Value |
|---|---|
| Your live URL | `https://khammina.github.io/constrobill-pro/` |
| GAS_URL location | Line ~358 in `index.html` |
| Function to run first | `initSheets()` |
| Function for cleanup trigger | `setupDailyCleanup()` |
| Google Sheet name | `ConstroBill Database` |
| Session expiry | 30 days |
| Reset link expiry | 2 hours |
| Supported currencies | USD, THB, LAK |
| Export formats | PDF (A4/A3/Letter), Excel (.xlsx), JPEG |
| Themes | 12 presets + full custom |

---

## Credits

**ConstroBill Pro** — Construction Billing Management System  
Created by **Khammina · SCMV**

Built with:
- [XLSX.js](https://github.com/SheetJS/sheetjs) — Excel export
- [html2canvas](https://html2canvas.hertzen.com) — JPEG export
- [Chart.js](https://www.chartjs.org) — Dashboard charts
- [Google Apps Script](https://script.google.com) — Backend API
- [Google Sheets](https://sheets.google.com) — Database
- [GitHub Pages](https://pages.github.com) — Free hosting

---

*Last updated: 2025 · ConstroBill Pro by Khammina · SCMV*
