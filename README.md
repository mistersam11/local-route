# DiscRoute Strategy Map

DiscRoute is a production-ready MVP for a community disc golf strategy map. It uses Next.js, Prisma, SQLite, Tailwind CSS, and Mapbox GL JS to let players browse courses, open hole maps, draw shot lines, save routes, vote, and follow other users.

## What Is Built

- Searchable course home page
- Course overview with hole list, preview map, and recent activity
- Hole strategy screen with tee marker, basket marker, baseline, route overlays, filters, sorting, voting, and route creation
- Click-to-add route drawing with double-click finish
- Community, followed-user, and top-route overlays
- User profiles with created routes and follow/unfollow
- Prisma schema for users, courses, holes, routes, follows, and route votes
- JSON route polylines stored in SQLite through Prisma

## Stack

- Next.js app router
- React
- Tailwind CSS
- Prisma ORM
- SQLite for local MVP storage
- Mapbox GL JS for satellite tiles

## Setup

Install Node.js 20 or newer, then run:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Initialize and seed the database:

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## GitHub

This project is safe to push to GitHub because `.env`, `node_modules`, `.next`, and local database files are ignored.

Create an empty GitHub repository, then connect this local repo:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

On another computer:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
cp .env.example .env
npm run prisma:generate
npm run db:push
npm run db:seed
npm run dev
```

## Letting Other People Use It

For quick testing on your home Wi-Fi, run Next on all network interfaces:

```bash
npm run dev -- -H 0.0.0.0
```

Then people on the same network can open:

```text
http://YOUR_COMPUTER_LOCAL_IP:3000
```

For public access from other networks, deploy it instead of running it from your laptop. Recommended MVP path:

- Vercel for the Next.js app
- Neon, Supabase, or Railway Postgres for the database
- Mapbox token configured as an environment variable

Before public launch, replace SQLite with PostgreSQL and replace the demo user header with real authentication.

## Mapbox

Set `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env` for real satellite map tiles:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN="pk..."
```

Without a token, the hole page still renders a local fallback strategy surface so route drawing, saving, filters, and voting remain usable.

## Demo Data

The seed creates:

- Two courses
- Seven holes
- Four users
- Follow relationships
- Community routes with ratings, tags, difficulty, risk, notes, and disc suggestions

The UI uses user `dana` as the demo signed-in player.

## API Routes

- `GET /api/courses`
- `GET /api/courses/:courseId`
- `GET /api/holes/:holeId`
- `GET /api/holes/:holeId/routes`
- `POST /api/holes/:holeId/routes`
- `POST /api/routes/:routeId/vote`
- `GET /api/users/:userId`
- `POST /api/users/:userId/follow`
- `DELETE /api/users/:userId/follow`
- `GET /api/feed`

Pass `x-demo-user-id` to API requests to change the acting user.

## Production Notes

- Move from SQLite to PostgreSQL when the app needs concurrent writes, account auth, or deployment across multiple instances.
- Replace demo user selection with authenticated sessions before opening write endpoints publicly.
- Mapbox token restrictions should be configured in the Mapbox dashboard.
- The route geometry is stored as a JSON array of `{ lat, lng }` points, which can be indexed or projected later when migrating to PostGIS.
