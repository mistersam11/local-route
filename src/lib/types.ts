export type Difficulty = "beginner" | "intermediate" | "advanced";
export type RiskLevel = "low" | "medium" | "high";
export type LineTag = "safe" | "aggressive" | "scramble";

export type UserSummary = {
  id: number;
  username: string;
  profileImageUrl: string | null;
};

export type BestLine = {
  id: number;
  holeId: number;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  riskLevel: RiskLevel;
  tag: LineTag;
  discSuggestion: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  author: UserSummary;
  isFollowedAuthor: boolean;
};

export type CourseReviewCard = {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  photoUrl: string | null;
  createdAt: string;
  author: UserSummary;
};

export type HoleReviewCard = {
  id: number;
  rating: number;
  title: string | null;
  body: string;
  photoUrl: string | null;
  createdAt: string;
  author: UserSummary;
};

export type HoleSocialPayload = {
  currentUser: UserSummary | null;
  course: {
    id: number;
    name: string;
    locationName: string;
  };
  hole: {
    id: number;
    holeNumber: number;
    par: number | null;
    distanceFeet: number | null;
    description: string | null;
    teePhotoUrl: string | null;
  };
  reviews: HoleReviewCard[];
  lines: BestLine[];
};
