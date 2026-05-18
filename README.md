# LocalRoute

For those who throw.

LocalRoute is a Letterboxd-style MVP for disc golf. Players can review courses, discuss specific holes, attach photos to reviews/comments, and vote on each hole's best line. Maps and route drawing are intentionally parked for a later iteration.

## What Is Built

- Searchable course home page with ratings, hole counts, comments, and line counts
- Course pages with cover photos, reviews, review form, hole list, and recent hole notes
- Hole pages with from-the-tee photo, comments with optional photo attachments, and voted line suggestions
- A "Best Line" per hole determined by community voting
- User profiles with course reviews, suggested lines, and following list
- Follow/unfollow users
- Prisma schema for users, courses, holes, course reviews, hole comments, lines, line votes, and follows

## Stack

- Next.js app router
- React
- Tailwind CSS
- Prisma ORM
- SQLite for local MVP storage

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

If you already ran the older map prototype locally, reset the SQLite database for this new schema:

```bash
npm run db:reset
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## GitHub

This project is safe to push to GitHub because `.env`, `node_modules`, `.next`, and local database files are ignored.

On another computer:

```bash
git clone https://github.com/mistersam11/local-route.git
cd local-route
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
- Object storage such as UploadThing, S3, or Cloudinary for durable image uploads

Before public launch, replace SQLite with PostgreSQL, replace the demo user system with real authentication, and move the MVP data-URL photo storage to durable object storage.

## Demo Data

The seed creates:

- Two courses
- Seven holes with tee photos
- Four users
- Follow relationships
- Course reviews with ratings
- Hole comments with optional photos
- Suggested lines with difficulty, risk, disc suggestions, tags, and votes

The UI uses user `dana` as the demo signed-in player.

## API Routes

- `GET /api/courses`
- `GET /api/courses/:courseId`
- `POST /api/courses/:courseId/reviews`
- `GET /api/holes/:holeId`
- `POST /api/holes/:holeId/comments`
- `GET /api/holes/:holeId/lines`
- `POST /api/holes/:holeId/lines`
- `POST /api/lines/:lineId/vote`
- `GET /api/users/:userId`
- `POST /api/users/:userId/follow`
- `DELETE /api/users/:userId/follow`
- `GET /api/feed`

Pass `x-demo-user-id` to API requests to change the acting user.

## Future Map Work

Route drawing can come back later as geometry attached to a `Line`, likely through a `polyline Json?` field or a separate `LineGeometry` table once map interactions are ready.
