# Smoke Test - Finance Calendar

Use this checklist after a deploy, version bump, or backend/storage change.

## 1) Start The App

Choose one run mode.

Local:

```bash
npm install
npm start
```

Docker:

```bash
docker compose up -d --build
docker compose ps
```

Expected:
- Local app available at http://localhost:3000
- Docker app available at http://localhost:8081
- Login page loads without console errors.

## 2) API Health

Open health endpoint for the mode you started:
- Local: http://localhost:3000/api/health
- Docker: http://localhost:8081/api/health

Expected:
- JSON response with status set to ok.

## 3) Authentication

- Register a new user (or log in with existing test user)
- Confirm redirect to calendar after login
- Log out and log back in

Expected:
- Session and redirects work consistently.

## 4) Account Smoke Checks

- Create a second account using the plus button
- Rename the second account
- Set an account color using the palette button
- Switch between accounts
- Set the second account as primary using the star button

Expected:
- Account list updates immediately
- Color indicator and account tint appear for colored accounts
- Primary account reorder works.

## 5) Transaction Smoke Checks

In one account:
- Add one expense and one income on today
- Add one recurring transaction (weekly is enough)
- Edit one transaction
- Delete one transaction

Expected:
- Daily totals and running balances update correctly
- Recurring item appears on future dates
- Edit/delete actions update list and calendar immediately.

## 6) Transfer Smoke Check

- Create a transfer to another account
- Open destination account and confirm matching linked transaction exists
- Edit source transfer and verify destination updates
- Delete one side and verify linked transaction is also removed

Expected:
- Linked transfer behavior stays consistent across both accounts.

## 7) Graph And Categories Pages

- Open Graph page and verify it loads with data
- Open Categories page and verify expense/income breakdown renders

Expected:
- No load errors
- Charts and totals are visible.

## 8) Persistence Regression (Critical)

- Refresh browser tab
- Confirm accounts, transactions, and account colors are unchanged
- Restart service

Local restart:

```bash
# Stop running server first (Ctrl+C), then start again
npm start
```

Docker restart:

```bash
docker compose restart
```

- Reload app and log in again

Expected:
- Accounts persist
- Transactions persist
- Account label colors persist after refresh and restart.

## 9) Mobile Layout Check

- Open browser device emulator (iPhone/Pixel preset)
- Verify sidebar/cards stack correctly
- Verify no horizontal scrolling on key pages

Expected:
- Layout remains usable on small screens.
