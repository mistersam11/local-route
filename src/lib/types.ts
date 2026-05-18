export type LatLng = {
  lat: number;
  lng: number;
};

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type RiskLevel = "low" | "medium" | "high";
export type RouteTag = "safe" | "aggressive" | "scramble";
export type RouteSort = "top" | "newest" | "popular";
export type RouteOverlay = "all" | "following" | "top";

export type UserSummary = {
  id: number;
  username: string;
  profileImageUrl: string | null;
};

export type StrategyRoute = {
  id: number;
  holeId: number;
  name: string;
  description: string | null;
  difficulty: Difficulty;
  riskLevel: RiskLevel;
  tag: RouteTag;
  polyline: LatLng[];
  discSuggestion: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  author: UserSummary;
  isFollowedAuthor: boolean;
};

export type HoleMapPayload = {
  currentUser: UserSummary | null;
  course: {
    id: number;
    name: string;
    locationName: string;
    latitude: number;
    longitude: number;
  };
  hole: {
    id: number;
    holeNumber: number;
    par: number | null;
    description: string | null;
    tee: LatLng;
    basket: LatLng;
  };
  routes: StrategyRoute[];
};
