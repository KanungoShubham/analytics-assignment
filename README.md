# Analytics SDK & Dashboard

## Requirements

- **Node.js 20 or newer** (check with `node -v`), download from https://nodejs.org
- **npm** (comes with Node.js)
- **Git**
- Ports **3000** and **3001** free

No database, PHP or Docker needed.

## Installation

```bash
git clone https://github.com/KanungoShubham/analytics-assignment.git
cd analytics-assignment
npm install
```

## Run the project

```bash
npm run seed    # optional: adds sample data so the dashboard isn't empty
npm run dev     # starts both apps
```

Then open in your browser:

- **Restaurant demo**: http://localhost:3001
- **Analytics dashboard**: http://localhost:3000 (password: `admin`)

## See it working

1. Open http://localhost:3001, browse the **Menu** and click **Add** on a few dishes.
2. Click **Log in** and enter any name.
3. Go to **Cart → Checkout → Place order**.
4. Open http://localhost:3000, log in with `admin` and choose **Today**. Your visit, events and order appear within about 5 seconds.

## Run tests

```bash
npm test
```
