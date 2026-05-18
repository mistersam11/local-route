import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, getFollowingIds } from "@/lib/current-user";
import type { HoleMapPayload, LatLng, StrategyRoute } from "@/lib/types";

const routeWithAuthor = Prisma.validator<Prisma.RouteDefaultArgs>()({
  include: {
    user: {
      select: {
        id: true,
        username: true,
        profileImageUrl: true
      }
    }
  }
});

export type RouteWithAuthor = Prisma.RouteGetPayload<typeof routeWithAuthor>;

export function parsePolyline(value: Prisma.JsonValue): LatLng[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((point) => {
      if (
        point &&
        typeof point === "object" &&
        "lat" in point &&
        "lng" in point
      ) {
        const lat = Number((point as { lat: unknown }).lat);
        const lng = Number((point as { lng: unknown }).lng);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }

      return null;
    })
    .filter((point): point is LatLng => Boolean(point));
}

export function normalizePolyline(points: unknown): LatLng[] {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point) => {
      if (!point || typeof point !== "object") {
        return null;
      }

      const lat = Number((point as { lat?: unknown }).lat);
      const lng = Number((point as { lng?: unknown }).lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      return { lat, lng };
    })
    .filter((point): point is LatLng => Boolean(point));
}

export function serializeRoute(
  route: RouteWithAuthor,
  followingIds = new Set<number>()
): StrategyRoute {
  return {
    id: route.id,
    holeId: route.holeId,
    name: route.name,
    description: route.description,
    difficulty: route.difficulty,
    riskLevel: route.riskLevel,
    tag: route.tag,
    polyline: parsePolyline(route.polyline),
    discSuggestion: route.discSuggestion,
    upvotes: route.upvotes,
    downvotes: route.downvotes,
    score: route.upvotes - route.downvotes,
    createdAt: route.createdAt.toISOString(),
    author: {
      id: route.user.id,
      username: route.user.username,
      profileImageUrl: route.user.profileImageUrl
    },
    isFollowedAuthor: followingIds.has(route.user.id)
  };
}

export function sortRoutes(routes: StrategyRoute[], sort: string | null) {
  return [...routes].sort((first, second) => {
    if (sort === "newest") {
      return (
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );
    }

    if (sort === "popular") {
      return second.upvotes + second.downvotes - (first.upvotes + first.downvotes);
    }

    return second.score - first.score || second.upvotes - first.upvotes;
  });
}

export async function getHoleMapPayload(
  holeId: number,
  currentUserId = 1
): Promise<HoleMapPayload | null> {
  const [currentUser, followingIds, hole] = await Promise.all([
    getCurrentUser(currentUserId),
    getFollowingIds(currentUserId),
    prisma.hole.findUnique({
      where: { id: holeId },
      include: {
        course: true,
        routes: {
          include: routeWithAuthor.include
        }
      }
    })
  ]);

  if (!hole) {
    return null;
  }

  const routes = hole.routes
    .map((route) => serializeRoute(route, followingIds))
    .sort((first, second) => second.score - first.score || second.upvotes - first.upvotes);

  return {
    currentUser,
    course: {
      id: hole.course.id,
      name: hole.course.name,
      locationName: hole.course.locationName,
      latitude: hole.course.latitude,
      longitude: hole.course.longitude
    },
    hole: {
      id: hole.id,
      holeNumber: hole.holeNumber,
      par: hole.par,
      description: hole.description,
      tee: { lat: hole.teeLat, lng: hole.teeLng },
      basket: { lat: hole.basketLat, lng: hole.basketLng }
    },
    routes
  };
}

export async function getSerializedRoutesForHole(
  holeId: number,
  currentUserId: number,
  sort: string | null
) {
  const [followingIds, routes] = await Promise.all([
    getFollowingIds(currentUserId),
    prisma.route.findMany({
      where: { holeId },
      include: routeWithAuthor.include
    })
  ]);

  return sortRoutes(
    routes.map((route) => serializeRoute(route, followingIds)),
    sort
  );
}
