import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const point = (lat: number, lng: number) => ({ lat, lng });

async function main() {
  await prisma.routeVote.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.route.deleteMany();
  await prisma.hole.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const [dana, nate, maya, ellis] = await Promise.all([
    prisma.user.create({
      data: {
        username: "dana",
        email: "dana@example.com",
        passwordHash: "demo-password-hash",
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
      { followerId: dana.id, followingId: nate.id },
      { followerId: dana.id, followingId: maya.id },
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
      holes: {
        create: [
          {
            holeNumber: 1,
            par: 3,
            description: "Gentle downhill opener with a guarded green and a wider left lane.",
            teeLat: 44.47624,
            teeLng: -73.21327,
            basketLat: 44.47574,
            basketLng: -73.21192
          },
          {
            holeNumber: 2,
            par: 4,
            description: "Placement drive to the mouth of the fairway before attacking a tucked pin.",
            teeLat: 44.47571,
            teeLng: -73.21218,
            basketLat: 44.47484,
            basketLng: -73.21305
          },
          {
            holeNumber: 3,
            par: 3,
            description: "Short technical lane with a late right finish.",
            teeLat: 44.47474,
            teeLng: -73.21318,
            basketLat: 44.47418,
            basketLng: -73.21197
          },
          {
            holeNumber: 4,
            par: 5,
            description: "Long wooded par five with a scoring gap near the second landing zone.",
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
      holes: {
        create: [
          {
            holeNumber: 1,
            par: 3,
            description: "Open tee shot that tightens near a creek-side basket.",
            teeLat: 35.59692,
            teeLng: -82.55619,
            basketLat: 35.59624,
            basketLng: -82.55491
          },
          {
            holeNumber: 2,
            par: 4,
            description: "Ridge carry with a conservative right landing zone.",
            teeLat: 35.59633,
            teeLng: -82.55472,
            basketLat: 35.59542,
            basketLng: -82.55536
          },
          {
            holeNumber: 3,
            par: 3,
            description: "Low ceiling tunnel with a sloped green.",
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

  const routeData: Prisma.RouteCreateManyInput[] = [
    {
      holeId: cedarHole(1).id,
      userId: nate.id,
      name: "Safe Hyzer Line",
      description: "Wide left shape that avoids the early guardian trees and settles under the basket.",
      difficulty: "beginner",
      riskLevel: "low",
      tag: "safe",
      polyline: [
        point(44.47624, -73.21327),
        point(44.47608, -73.21278),
        point(44.47591, -73.21225),
        point(44.47574, -73.21192)
      ],
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
      polyline: [
        point(44.47624, -73.21327),
        point(44.47601, -73.21291),
        point(44.47568, -73.21237),
        point(44.47574, -73.21192)
      ],
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
      polyline: [
        point(44.47571, -73.21218),
        point(44.47531, -73.21249),
        point(44.47505, -73.21278),
        point(44.47484, -73.21305)
      ],
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
      polyline: [
        point(44.47571, -73.21218),
        point(44.47546, -73.21289),
        point(44.47506, -73.21331),
        point(44.47484, -73.21305)
      ],
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
      polyline: [
        point(44.47474, -73.21318),
        point(44.47455, -73.21282),
        point(44.47432, -73.21232),
        point(44.47418, -73.21197)
      ],
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
      polyline: [
        point(35.59692, -82.55619),
        point(35.59667, -82.55573),
        point(35.59643, -82.55523),
        point(35.59624, -82.55491)
      ],
      discSuggestion: "Glidey fairway driver",
      upvotes: 12,
      downvotes: 1,
      createdAt: new Date("2026-05-10T10:00:00.000Z")
    }
  ];

  await prisma.route.createMany({ data: routeData });
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
