# FloorPort

A personal investment portfolio tracker built with Next.js and Supabase. Track your holdings, log transactions, monitor watchlists, and visualize portfolio performance — all in one place.

## Features

- **Dashboard** — Portfolio summary with allocation chart and performance overview
- **Holdings** — Track assets across multiple wallets with real-time price data
- **Transactions** — Log buy/sell transactions and view history
- **Watchlist** — Monitor assets you're interested in
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

## Project Structure

```
app/
├── (app)/              # Authenticated app routes
│   ├── dashboard/      # Portfolio overview
│   ├── holdings/       # Asset holdings
│   ├── transactions/   # Transaction history
│   └── watchlist/      # Watchlist
├── api/                # API routes (prices, holdings, transactions, etc.)
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
