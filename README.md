# FloorPort

A personal investment portfolio tracker built with Next.js and Supabase. Track your holdings and visualize portfolio performance in one place.

## Features

- **Dashboard** — Portfolio summary with allocation chart and performance overview
- **Holdings** — Track assets across multiple wallets with real-time price data
- **Multi-currency support** — View portfolio value in your preferred currency
- **Authentication** — Secure login via Supabase Auth

## Tech Stack

- [Next.js](https://nextjs.org/) (v16, App Router, Turbopack)
- [Supabase](https://supabase.com/) — database, auth, and row-level security
- [Recharts](https://recharts.org/) — portfolio charts and visualizations
- [Twelve Data](https://twelvedata.com/) — stock market data (quotes, search, time series)
- [Tailwind CSS](https://tailwindcss.com/) (v4)
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TWELVE_DATA_API_KEY=your_twelve_data_api_key
```

### Twelve Data limits

The app is designed for Twelve Data free-tier style limits:

- 8 requests per minute
- 800 requests per day

To stay within limits, stock requests are batched, cached, and deduplicated. When Twelve Data returns a rate-limit response (`429`), stock data gracefully degrades instead of crashing pages.

### 3. Set up the database

Run the SQL in `supabase/schema.sql` using the Supabase SQL Editor in your project dashboard. This creates all required tables, policies, and triggers.

If the `handle_new_user` trigger fails during setup, re-run it with:

```sql
EXECUTE FUNCTION handle_new_user();
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. (Optional) Weekly Telegram portfolio summary

FloorPort can run a weekly cron job that snapshots your holdings' live prices into the database and sends you a Telegram message summarizing the week — total portfolio % change, and the biggest % loser/gainer among your assets. This also keeps the Supabase project active with regular writes.

**Create a Telegram bot and get your chat ID:**

1. Message [@BotFather](https://t.me/BotFather) on Telegram, run `/newbot`, and follow the prompts. Save the bot token it gives you.
2. Send any message to your new bot (search for it by the username you chose).
3. Visit `https://api.telegram.org/bot<your_bot_token>/getUpdates` in your browser and find `"chat":{"id":...}` in the response — that number is your chat ID.

**Add these environment variables** (in `.env.local` for local runs, and in your host's environment variable settings for production):

```env
CRON_SECRET=a_long_random_string_you_make_up
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id
CRON_USER_ID=your_supabase_auth_user_uuid
```

`CRON_USER_ID` is your own user's UUID, found in the Supabase Dashboard under **Authentication → Users**.

**Run the migration:** apply `supabase/migrations/20260805220000_portfolio_snapshots.sql` (or re-run the updated `supabase/schema.sql`) in the Supabase SQL Editor to create the `portfolio_snapshots` table.

**Schedule it with [cronjob.org](https://cronjob.org):**

1. Create a new cron job pointing at `https://<your-deployed-domain>/api/cron/weekly-summary`.
2. Set the request method to `GET`.
3. Add a custom header: `Authorization: Bearer <the CRON_SECRET you set above>`.
4. Set the schedule to run weekly (e.g. every Sunday at 9am).

Each run fetches live prices, stores a snapshot, and sends a Telegram message like:

```
📊 FloorPort Weekly Summary

Total: $12,345.67 (📉 -3.20% this week, -$408.12)

📉 Biggest loser: SOL -8.42%
📈 Biggest gainer: AAPL +2.13%
```

## Project Structure

```
app/
├── (app)/              # Authenticated app routes
│   ├── dashboard/      # Portfolio overview
│   ├── holdings/       # Asset holdings
├── api/                # API routes (prices, holdings, profiles, etc.)
├── login/              # Auth page
components/             # Reusable UI components
lib/                    # Utilities (calculations, formatting, FX, price fetching)
supabase/               # Database schema and migrations
```

## Scripts

| Command         | Description                  |
|-----------------|------------------------------|
| `npm run dev`   | Start dev server (Turbopack) |
| `npm run build` | Build for production         |
| `npm run start` | Start production server      |
| `npm run lint`  | Run ESLint                   |
