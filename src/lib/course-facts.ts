export const courseDifficultyOptions = [
  { value: "beginner", label: "Beginner" },
  { value: "mixed", label: "Mixed" },
  { value: "challenging", label: "Challenging" },
  { value: "expert", label: "Expert" }
] as const;

export type CourseDifficultyValue = (typeof courseDifficultyOptions)[number]["value"];

export const courseDifficultyLabels: Record<CourseDifficultyValue, string> = {
  beginner: "Beginner",
  mixed: "Mixed",
  challenging: "Challenging",
  expert: "Expert"
};

export const courseFactDefinitions = [
  { key: "hasParking", label: "Parking" },
  { key: "hasBathrooms", label: "Bathrooms" },
  { key: "hasWater", label: "Water" },
  { key: "cartFriendly", label: "Cart friendly" },
  { key: "dogFriendly", label: "Dog friendly" },
  { key: "beginnerFriendly", label: "Beginner friendly" },
  { key: "isPayToPlay", label: "Pay to play" }
] as const;

export type CourseFactKey = (typeof courseFactDefinitions)[number]["key"];

export function booleanInput(value: unknown) {
  return value === true || value === "true" || value === "on" || value === "1";
}

export function selectedCourseFacts(course: Record<CourseFactKey, boolean>) {
  return courseFactDefinitions.filter((fact) => course[fact.key]);
}
