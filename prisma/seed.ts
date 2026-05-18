import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.lineVote.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.line.deleteMany();
  await prisma.holeReview.deleteMany();
  await prisma.courseReview.deleteMany();
  await prisma.hole.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const [sam, nate, maya, ellis] = await Promise.all([
    prisma.user.create({
      data: {
        username: "sam",
        email: "sam@example.com",
        passwordHash: "demo-password-hash",
        isAdmin: true,
        profileImageUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=240&q=80"
      }
    }),
    prisma.user.create({
      data: {
        username: "natehyzer",
        email: "nate@example.com",
        passwordHash: "demo-password-hash",
        profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80"
      }
    }),
    prisma.user.create({
      data: {
        username: "mayaforehand",
        email: "maya@example.com",
        passwordHash: "demo-password-hash",
        profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80"
      }
    }),
    prisma.user.create({
      data: {
        username: "ellislines",
        email: "ellis@example.com",
        passwordHash: "demo-password-hash",
        profileImageUrl: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=240&q=80"
      }
    })
  ]);

  await prisma.follow.createMany({
    data: [
      { followerId: sam.id, followingId: nate.id },
      { followerId: sam.id, followingId: maya.id },
      { followerId: nate.id, followingId: maya.id },
      { followerId: ellis.id, followingId: nate.id }
    ]
  });

  const cedar = await prisma.course.create({
    data: {
      name: "Cedar Ridge Disc Golf",
      locationName: "Burlington, VT",
      latitude: 44.47602,
      longitude: -73.21246,
      status: "approved",
      submittedById: sam.id,
      coverPhotoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80",
      holes: {
        create: [
          {
            holeNumber: 1,
            par: 3,
            distanceFeet: 286,
            description: "Gentle downhill opener with a guarded green and a wider left lane.",
            teePhotoUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
            teeLat: 44.47624,
            teeLng: -73.21327,
            basketLat: 44.47574,
            basketLng: -73.21192
          },
          {
            holeNumber: 2,
            par: 4,
            distanceFeet: 526,
            description: "Placement drive to the mouth of the fairway before attacking a tucked pin.",
            teePhotoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
            teeLat: 44.47571,
            teeLng: -73.21218,
            basketLat: 44.47484,
            basketLng: -73.21305
          },
          {
            holeNumber: 3,
            par: 3,
            distanceFeet: 242,
            description: "Short technical lane with a late right finish.",
            teePhotoUrl: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80",
            teeLat: 44.47474,
            teeLng: -73.21318,
            basketLat: 44.47418,
            basketLng: -73.21197
          },
          {
            holeNumber: 4,
            par: 5,
            distanceFeet: 812,
            description: "Long wooded par five with a scoring gap near the second landing zone.",
            teePhotoUrl: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=80",
            teeLat: 44.47414,
            teeLng: -73.21234,
            basketLat: 44.47522,
            basketLng: -73.21088
          }
        ]
      }
    },
    include: { holes: true }
  });

  const pine = await prisma.course.create({
    data: {
      name: "Pine Hollow DGC",
      locationName: "Asheville, NC",
      latitude: 35.59671,
      longitude: -82.55512,
      status: "approved",
      submittedById: maya.id,
      coverPhotoUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
      holes: {
        create: [
          {
            holeNumber: 1,
            par: 3,
            distanceFeet: 318,
            description: "Open tee shot that tightens near a creek-side basket.",
            teePhotoUrl: "https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1200&q=80",
            teeLat: 35.59692,
            teeLng: -82.55619,
            basketLat: 35.59624,
            basketLng: -82.55491
          },
          {
            holeNumber: 2,
            par: 4,
            distanceFeet: 604,
            description: "Ridge carry with a conservative right landing zone.",
            teePhotoUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
            teeLat: 35.59633,
            teeLng: -82.55472,
            basketLat: 35.59542,
            basketLng: -82.55536
          },
          {
            holeNumber: 3,
            par: 3,
            distanceFeet: 221,
            description: "Low ceiling tunnel with a sloped green.",
            teePhotoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
            teeLat: 35.59535,
            teeLng: -82.55552,
            basketLat: 35.59478,
            basketLng: -82.55438
          }
        ]
      }
    },
    include: { holes: true }
  });

  const cedarHole = (holeNumber: number) =>
    cedar.holes.find((hole) => hole.holeNumber === holeNumber)!;
  const pineHole = (holeNumber: number) =>
    pine.holes.find((hole) => hole.holeNumber === holeNumber)!;

  await prisma.courseReview.createMany({
    data: [
      {
        courseId: cedar.id,
        userId: dana.id,
        rating: 5,
        title: "Technical without feeling mean",
        body: "Cedar Ridge rewards clean angle control and still gives newer players a smart bailout on most holes. Hole 2 is the separator.",
        photoUrl: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
        createdAt: new Date("2026-05-03T12:30:00.000Z")
      },
      {
        courseId: cedar.id,
        userId: nate.id,
        rating: 4,
        title: "Bring fairways and patience",
        body: "The lines are honest. You can score if you land in the right zones, but the rough makes lazy drives expensive.",
        createdAt: new Date("2026-05-07T19:45:00.000Z")
      },
      {
        courseId: pine.id,
        userId: maya.id,
        rating: 5,
        title: "Beautiful shot shaping",
        body: "Pine Hollow has a great mix of open pressure and wooded touch shots. The tee photos do not capture how much the wind matters.",
        photoUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
        createdAt: new Date("2026-05-10T16:15:00.000Z")
      }
    ]
  });

  await prisma.holeReview.createMany({
    data: [
      {
        holeId: cedarHole(1).id,
        userId: maya.id,
        rating: 4,
        title: "Friendly opener, touchy miss",
        body: "The left gap looks wider from the tee than it plays. Aim at the last dark trunk and let the disc fade.",
        photoUrl: "https://images.unsplash.com/photo-1498429089284-41f8cf3ffd39?auto=format&fit=crop&w=900&q=80",
        createdAt: new Date("2026-05-11T13:20:00.000Z")
      },
      {
        holeId: cedarHole(1).id,
        userId: ellis.id,
        rating: 4,
        title: "Good scoring chance",
        body: "Short is fine here. Long right is where the awkward comebacker lives.",
        createdAt: new Date("2026-05-12T10:05:00.000Z")
      },
      {
        holeId: cedarHole(2).id,
        userId: nate.id,
        rating: 5,
        title: "Best hole on the course",
        body: "Do not chase the pin from the tee unless you have the power to clear the corner clean. The landing zone is the play.",
        createdAt: new Date("2026-05-13T18:40:00.000Z")
      },
      {
        holeId: pineHole(1).id,
        userId: dana.id,
        rating: 4,
        title: "Pretty, but sneaky water",
        body: "Creek is closer than it feels. A slower fairway keeps the skip under control.",
        photoUrl: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=900&q=80",
        createdAt: new Date("2026-05-14T14:30:00.000Z")
      }
    ]
  });

  const lineData: Prisma.LineCreateManyInput[] = [
    {
      holeId: cedarHole(1).id,
      userId: nate.id,
      name: "Safe Hyzer Line",
      description: "Wide left shape that avoids the early guardian trees and settles under the basket.",
      difficulty: "beginner",
      riskLevel: "low",
      tag: "safe",
      discSuggestion: "Stable fairway driver",
      upvotes: 18,
      downvotes: 2,
      createdAt: new Date("2026-04-14T14:00:00.000Z")
    },
    {
      holeId: cedarHole(1).id,
      userId: maya.id,
      name: "Forehand Skip",
      description: "A flatter right-side push with a late skip toward the pin.",
      difficulty: "intermediate",
      riskLevel: "medium",
      tag: "aggressive",
      discSuggestion: "Overstable control driver",
      upvotes: 11,
      downvotes: 3,
      createdAt: new Date("2026-04-21T19:20:00.000Z")
    },
    {
      holeId: cedarHole(2).id,
      userId: ellis.id,
      name: "Two-Shot Center Play",
      description: "Land short of the pinch and throw a controlled approach into the pocket.",
      difficulty: "beginner",
      riskLevel: "low",
      tag: "safe",
      discSuggestion: "Neutral midrange, then putter",
      upvotes: 15,
      downvotes: 1,
      createdAt: new Date("2026-05-01T16:15:00.000Z")
    },
    {
      holeId: cedarHole(2).id,
      userId: nate.id,
      name: "Corner Crusher",
      description: "Push long toward the left corner to open a short pitch to the green.",
      difficulty: "advanced",
      riskLevel: "high",
      tag: "aggressive",
      discSuggestion: "Fast overstable distance driver",
      upvotes: 9,
      downvotes: 4,
      createdAt: new Date("2026-05-05T13:30:00.000Z")
    },
    {
      holeId: cedarHole(3).id,
      userId: maya.id,
      name: "Turnover Gap",
      description: "Slow anhyzer that drifts right after the midpoint and lands soft.",
      difficulty: "intermediate",
      riskLevel: "medium",
      tag: "scramble",
      discSuggestion: "Understable putter or midrange",
      upvotes: 14,
      downvotes: 2,
      createdAt: new Date("2026-05-08T12:45:00.000Z")
    },
    {
      holeId: pineHole(1).id,
      userId: nate.id,
      name: "Creek-Side Float",
      description: "Let the disc carry straight before finishing left away from the water.",
      difficulty: "intermediate",
      riskLevel: "medium",
      tag: "safe",
      discSuggestion: "Glidey fairway driver",
      upvotes: 12,
      downvotes: 1,
      createdAt: new Date("2026-05-10T10:00:00.000Z")
    }
  ];

  await prisma.line.createMany({ data: lineData });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
