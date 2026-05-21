export const courseForumFlairs = [
  "Conditions",
  "Question",
  "League",
  "Lost disc",
  "Travel",
  "Event",
  "Photo",
  "Basket update"
] as const;

export type CourseForumFlair = (typeof courseForumFlairs)[number];

export function normalizeCourseForumFlair(value: unknown) {
  const flair = String(value ?? "").trim();

  if (!flair) {
    return null;
  }

  const knownFlair = courseForumFlairs.find(
    (candidate) => candidate.toLowerCase() === flair.toLowerCase()
  );

  return knownFlair ?? flair.slice(0, 32);
}

export function applyCourseFollowTransition(
  currentFollowerCount: number,
  wasFollowing: boolean,
  nextFollowing: boolean
) {
  if (wasFollowing === nextFollowing) {
    return currentFollowerCount;
  }

  return Math.max(0, currentFollowerCount + (nextFollowing ? 1 : -1));
}
