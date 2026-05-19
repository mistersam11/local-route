# LocalRoute

For those who throw.

LocalRoute is a Letterboxd-style MVP for disc golf. Players can rate courses and holes from 1-5 stars, attach photos to reviews, and vote on each hole's best line. Maps and route drawing are intentionally parked for a later iteration.

## What Is Built

- Searchable and filterable course home page with ratings, quick facts, hole review counts, and line counts
- Course pages with cover photos, quick facts, played/want-to-play tracking, reviews, review form, hole list, and recent hole reviews
- Hole pages with from-the-tee photo, 1-5 star reviews, optional photo attachments, and voted line suggestions
- A "Best Line" per hole determined by community voting
- Course submission form with difficulty, amenities, dynamic hole setup, and photo attachments
- Community course lists with their own list pages
- Users directory for searching and following friends or pros
- Forum threads and comments with first-visit rules popup
- Pending/approved/rejected course moderation status
- Admin moderation dashboard with dedicated course submission review
- Admin content moderation queue for reported reviews and suggested lines
- User reporting for course reviews, hole reviews, and suggested lines
- User profiles with course reviews, suggested lines, and following list
- Real email/username account signup and login
- Profile editing with avatar upload, bio, and home course
- Follow/unfollow users
- Direct image uploads to Cloudinary for course, hole, and review photos
- OpenAI moderation checks for review text and suggested lines
- OpenAI moderation checks for forum threads and comments
- Prisma schema for users, courses, course facts, course marks, lists, forum threads, forum comments, course reviews, hole reviews, lines, line votes, and follows

## Stack

- Next.js app router
- React
- Tailwind CSS
- Prisma ORM
- PostgreSQL for hosted MVP storage

## Setup

Install Node.js 20 or newer, then run:

```bash
npm install
```

Create a local environment file and set `DATABASE_URL` to a PostgreSQL connection string:

```bash
cp .env.example .env
```

For image uploads, create a Cloudinary unsigned upload preset and set:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-unsigned-upload-preset"
```

For text moderation in production, add an OpenAI API key:

```bash
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODERATION_MODEL="omni-moderation-latest"
```

Initialize and seed the database:

```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

If you need to wipe and reseed a disposable development database:

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
- Prisma Postgres, Neon, Supabase, or Railway Postgres for the database
- Cloudinary for durable image uploads

After Prisma schema changes, run `npx prisma db push` against the production
database before using the newly deployed app.

Before public launch, add image moderation workflows.

## Demo Data

The seed creates:

- Two courses
- Seven holes with tee photos
- Four users
- Follow relationships
- Course reviews with 1-5 star ratings
- Hole reviews with ratings and optional photos
- Submitted courses with pending approval status
- Suggested lines with difficulty, risk, disc suggestions, tags, and votes
- Course quick facts, played/want-to-play marks, and a starter course list
- Forum threads and comments

All new users sign up with an email, username, and password. Set `ADMIN_EMAILS`
to a comma-separated list of owner emails to grant admin moderation access.
The seeded demo users use the password `localroute-demo`.

## API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PATCH /api/admin/content`
- `PATCH /api/me/profile`
- `POST /api/reports`
- `GET /api/courses`
- `POST /api/courses`
- `GET /api/courses/:courseId`
- `PATCH /api/courses/:courseId`
- `POST /api/courses/:courseId/marks`
- `POST /api/courses/:courseId/reviews`
- `POST /api/lists`
- `GET /api/holes/:holeId`
- `POST /api/holes/:holeId/reviews`
- `GET /api/holes/:holeId/lines`
- `POST /api/holes/:holeId/lines`
- `POST /api/lines/:lineId/vote`
- `POST /api/forum/threads`
- `POST /api/forum/threads/:threadId/comments`
- `GET /api/users/:userId`
- `POST /api/users/:userId/follow`
- `DELETE /api/users/:userId/follow`
- `GET /api/feed`

Write actions use the signed-in user's secure session cookie.

## Future Map Work

Route drawing can come back later as geometry attached to a `Line`, likely through a `polyline Json?` field or a separate `LineGeometry` table once map interactions are ready.
