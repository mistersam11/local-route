import assert from "node:assert/strict";
import {
  CourseEventRsvpStatus,
  CourseEventType,
  CourseEventVisibility
} from "@prisma/client";
import {
  applyEventRsvpTransition,
  canAcceptGoingRsvp,
  filterAndSortEvents,
  groupCourseEventsForCommunity,
  validateCourseEventDraft,
  type FilterableCourseEvent
} from "./events";

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const baseEvent = {
  id: 1,
  title: "Wednesday League",
  description: "Weekly singles league with cards by rating.",
  type: CourseEventType.leagueNight,
  startTime: new Date("2026-06-03T22:00:00.000Z"),
  tags: ["league", "singles"],
  course: {
    id: 10,
    name: "Cedar Ridge Disc Golf",
    locationName: "Burlington, VT",
    locationAddress: "100 Park Road",
    latitude: 44.47602,
    longitude: -73.21246
  },
  rsvpCounts: { going: 8, interested: 4 }
} satisfies FilterableCourseEvent;

function event(
  overrides: Partial<FilterableCourseEvent>
): FilterableCourseEvent {
  return {
    ...baseEvent,
    ...overrides,
    course: {
      ...baseEvent.course,
      ...overrides.course
    },
    rsvpCounts: {
      ...baseEvent.rsvpCounts,
      ...overrides.rsvpCounts
    }
  };
}

test("event creation validation normalizes a complete draft", () => {
  const result = validateCourseEventDraft({
    title: "Friday Glow Doubles",
    description: "Bring lights and a partner for rotating doubles.",
    courseId: "42",
    type: "glow round",
    startTime: "2026-06-05T20:30:00.000Z",
    endTime: "2026-06-05T23:00:00.000Z",
    timezone: "America/New_York",
    maxPlayers: "36",
    visibility: CourseEventVisibility.public,
    tags: "glow, doubles, glow",
    imageUrl: "https://example.com/glow.jpg"
  });

  assert.equal(result.ok, true);
  assert.equal(result.value?.courseId, 42);
  assert.equal(result.value?.type, CourseEventType.glowRound);
  assert.deepEqual(result.value?.tags, ["glow", "doubles"]);
  assert.equal(result.value?.maxPlayers, 36);
});

test("event creation validation rejects missing course and invalid time range", () => {
  const result = validateCourseEventDraft({
    title: "Ace",
    description: "x",
    courseId: "nope",
    type: "mystery",
    startTime: "2026-06-05T20:30:00.000Z",
    endTime: "2026-06-05T19:30:00.000Z",
    timezone: "Invalid/Zone"
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.title, "Event title is required.");
  assert.equal(result.errors.description, "Event description is required.");
  assert.equal(result.errors.courseId, "Choose a course.");
  assert.equal(result.errors.type, "Choose an event type.");
  assert.equal(result.errors.endTime, "End time must be after the start time.");
  assert.equal(result.errors.timezone, "Use a valid timezone.");
});

test("RSVP flow moves counts between interested, going, and none", () => {
  assert.deepEqual(
    applyEventRsvpTransition(
      { going: 5, interested: 2 },
      CourseEventRsvpStatus.interested,
      CourseEventRsvpStatus.going
    ),
    { going: 6, interested: 1 }
  );
  assert.deepEqual(
    applyEventRsvpTransition(
      { going: 5, interested: 2 },
      CourseEventRsvpStatus.going,
      null
    ),
    { going: 4, interested: 2 }
  );
  assert.equal(
    canAcceptGoingRsvp({
      maxPlayers: 5,
      goingCount: 5,
      currentStatus: CourseEventRsvpStatus.interested
    }),
    false
  );
  assert.equal(
    canAcceptGoingRsvp({
      maxPlayers: 5,
      goingCount: 5,
      currentStatus: CourseEventRsvpStatus.going
    }),
    true
  );
});

test("event filtering handles search, location, date, course, type, popularity, and distance", () => {
  const events = [
    baseEvent,
    event({
      id: 2,
      title: "Mountain Doubles",
      type: CourseEventType.doubles,
      startTime: new Date("2026-06-04T22:00:00.000Z"),
      course: {
        id: 11,
        name: "Pine Hollow DGC",
        locationName: "Asheville, NC",
        latitude: 35.59671,
        longitude: -82.55512
      },
      rsvpCounts: { going: 20, interested: 10 }
    }),
    event({
      id: 3,
      title: "Putting League",
      type: CourseEventType.puttingLeague,
      startTime: new Date("2026-06-03T15:00:00.000Z"),
      course: { id: 10 },
      rsvpCounts: { going: 3, interested: 20 }
    })
  ];

  assert.deepEqual(
    filterAndSortEvents(events, {
      query: "league",
      location: "burlington",
      date: "2026-06-03",
      courseId: 10
    }).map((entry) => entry.id),
    [3, 1]
  );
  assert.deepEqual(
    filterAndSortEvents(events, {
      type: CourseEventType.doubles
    }).map((entry) => entry.id),
    [2]
  );
  assert.deepEqual(
    filterAndSortEvents(events, {
      sort: "popularity"
    }).map((entry) => entry.id),
    [2, 3, 1]
  );
  assert.deepEqual(
    filterAndSortEvents(events, {
      originLatitude: 44.48,
      originLongitude: -73.21,
      maxDistanceMiles: 25,
      sort: "distance"
    }).map((entry) => entry.id),
    [3, 1]
  );
});

test("course integration groups upcoming events into community sections", () => {
  const groups = groupCourseEventsForCommunity([
    event({ id: 1, type: CourseEventType.leagueNight }),
    event({ id: 2, type: CourseEventType.tournament }),
    event({ id: 3, type: CourseEventType.doubles }),
    event({ id: 4, type: CourseEventType.casualRound }),
    event({ id: 5, type: CourseEventType.puttingLeague })
  ]);

  assert.deepEqual(groups.leagues.map((entry) => entry.id), [1, 5]);
  assert.deepEqual(groups.tournaments.map((entry) => entry.id), [2]);
  assert.deepEqual(groups.doubles.map((entry) => entry.id), [3]);
  assert.deepEqual(groups.casualRounds.map((entry) => entry.id), [4]);
});
