# 🏠 Home Vault — Setup Guide

Follow these steps in order. Takes about 10–15 minutes total.

---

## Step 1 — Get your Gemini API Key (free)

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)
5. You'll paste this into the app's Settings screen

---

## Step 2 — Set up Google Sheets

### 2a. Create the spreadsheet

1. Go to https://sheets.google.com
2. Click **"+ Blank"** to create a new spreadsheet
3. Name it: **Home Vault**
4. Leave it open — you'll need it in the next step

### 2b. Add the Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all the existing code in the editor
3. Open the file `Code.gs` from this project
4. Copy ALL the code and paste it into the Apps Script editor
5. Click **Save** (the floppy disk icon or Ctrl+S)

### 2c. Run first-time setup

1. In the Apps Script editor, click the **function dropdown** at the top (it says "Select function")
2. Choose **`setupSheets`**
3. Click **▶ Run**
4. It will ask for permissions — click **Review Permissions → Allow**
5. Go back to your Google Sheet — you should now see 4 tabs:
   - Transactions
   - LineItems
   - IOUs
   - MonthlySummary

### 2d. Deploy as a Web App

1. In Apps Script, click **Deploy → New deployment**
2. Click the gear icon ⚙ next to "Type" and select **Web app**
3. Fill in:
   - Description: `Home Vault`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Click **Authorize access** if prompted
6. **Copy the Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfy.../exec`

---

## Step 3 — Configure the app

1. Open the Home Vault app in your browser
2. Select any family member
3. Tap the **⚙ Settings** icon (top right of home screen)
4. Paste your **Gemini API key**
5. Paste your **Google Apps Script URL**
6. Tap **Save Settings**

✅ You're done! Try scanning a receipt.

---

## Step 4 — Deploy to Cloudflare Pages (so everyone can use it)

### 4a. Push to GitHub

```bash
# In the project folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/home-vault.git
git push -u origin main
```

### 4b. Connect to Cloudflare Pages

1. Go to https://pages.cloudflare.com
2. Sign up / sign in (free)
3. Click **"Create a project" → "Connect to Git"**
4. Select your **home-vault** repository
5. Set build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Click **Save and Deploy**
7. After a minute, you'll get a URL like `home-vault.pages.dev`

### 4c. Share with family

Send the Cloudflare URL to all family members. They open it in their phone browser — no app install needed!

**Tip:** On iPhone, open in Safari → tap Share → "Add to Home Screen" for an app-like experience. On Android, Chrome will prompt to install automatically.

---

## Troubleshooting

**"Gemini error 400"** — Check your API key is correct in Settings

**Scanning returns wrong items** — Use the manual edit feature to fix them after scanning

**Google Sheets not saving** — Make sure your Apps Script is deployed with "Anyone" access and you authorized it

**Camera doesn't work on iOS** — Must use Safari (not Chrome) on iPhone/iPad

**Data not showing on dashboard** — Pull to refresh, or check your Sheets URL in Settings

---

## Notes

- The app works offline for browsing, but needs internet to scan and save
- Each family member uses the same URL — just select their name when opening
- API keys are stored locally on each device (not in the code)
- The Google Sheet is the single source of truth — you can view/edit it directly

---

## Monthly routine

At the end of each month:
1. Open the app → **Month End** tab
2. Screenshot or share the breakdown with the family
3. Everyone pays their share
4. The next month starts automatically
