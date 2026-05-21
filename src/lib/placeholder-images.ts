export type PlaceholderImageKind = "course" | "hole";

export type PlaceholderImageTheme =
  | "basket"
  | "disc-golf"
  | "mountain"
  | "open-park"
  | "sunset"
  | "trail"
  | "wooded";

export type PlaceholderImage = {
  id: string;
  kind: PlaceholderImageKind;
  baseUrl: string;
  description: string;
  photoPageUrl: string;
  photographerName: string;
  photographerUrl: string;
  themes: PlaceholderImageTheme[];
  objectPosition?: string;
};

export type CoursePlaceholderInput = {
  id: number | string;
  name: string;
  locationName?: string | null;
  coverPhotoUrl?: string | null;
  difficulty?: string | null;
  beginnerFriendly?: boolean | null;
  cartFriendly?: boolean | null;
  dogFriendly?: boolean | null;
  hasParking?: boolean | null;
  isPayToPlay?: boolean | null;
};

export type HolePlaceholderInput = {
  id: number | string;
  courseId: number | string;
  courseName?: string | null;
  holeNumber: number;
  teePhotoUrl?: string | null;
  distanceFeet?: number | null;
  par?: number | null;
};

export type ResolvedImageCandidate = {
  alt: string;
  isUnavailable: boolean;
  source: "uploaded" | "placeholder" | "css-fallback";
  src: string | null;
  srcSet?: string;
};

const unsplashReferral = "utm_source=LocalRoute&utm_medium=referral";

export const placeholderImageWidths = [480, 768, 1024, 1280, 1600] as const;

export const placeholderImages: PlaceholderImage[] = [
  {
    id: "disc-basket-rocky-mound",
    kind: "course",
    baseUrl: "https://images.unsplash.com/photo-1777174032198-006ff503a390",
    description: "Disc golf basket with orange flag on a rocky mound.",
    photoPageUrl:
      "https://unsplash.com/photos/disc-golf-basket-with-orange-flag-on-rocky-mound-CaaEbahVgdk",
    photographerName: "Priscilla Du Preez",
    photographerUrl: "https://unsplash.com/@priscilladupreez",
    themes: ["basket", "disc-golf", "mountain", "open-park"],
    objectPosition: "center"
  },
  {
    id: "sunset-disc-basket-field",
    kind: "course",
    baseUrl: "https://images.unsplash.com/photo-1697746483194-cab9b84f6705",
    description: "Disc golf basket in a grassy field under warm light.",
    photoPageUrl:
      "https://unsplash.com/photos/a-frisbee-golf-basket-in-a-grassy-field-ofTNBtBoVbI",
    photographerName: "Warren Valentine",
    photographerUrl: "https://unsplash.com/@wjosiahv",
    themes: ["basket", "disc-golf", "open-park", "sunset"],
    objectPosition: "center"
  },
  {
    id: "wooded-trail-light",
    kind: "course",
    baseUrl: "https://images.unsplash.com/photo-1647568915657-c237b6fea460",
    description: "Sunlit forest trail with tall trees.",
    photoPageUrl:
      "https://unsplash.com/photos/a-trail-in-the-woods-with-lots-of-trees-Z_NsZnAYxgA",
    photographerName: "David Schultz",
    photographerUrl: "https://unsplash.com/@davidschultz",
    themes: ["trail", "wooded"],
    objectPosition: "center"
  },
  {
    id: "park-path-sunset",
    kind: "course",
    baseUrl: "https://images.unsplash.com/photo-1765550232079-d000cacded33",
    description: "Paved park path through grass at sunset.",
    photoPageUrl:
      "https://unsplash.com/photos/a-paved-path-through-a-grassy-field-at-sunset-s9pDreUxCIQ",
    photographerName: "negin",
    photographerUrl: "https://unsplash.com/@negin_nn",
    themes: ["open-park", "sunset", "trail"],
    objectPosition: "center"
  },
  {
    id: "garden-trail-sunset",
    kind: "course",
    baseUrl: "https://images.unsplash.com/photo-1772125798315-21b68500a9cd",
    description: "Rocky park trail at sunset.",
    photoPageUrl:
      "https://unsplash.com/photos/road-winding-through-a-rocky-landscape-at-sunset-tdIgwOPECAQ",
    photographerName: "Daniel Forster",
    photographerUrl: "https://unsplash.com/@danielforsterphoto",
    themes: ["mountain", "open-park", "sunset", "trail"],
    objectPosition: "center"
  },
  {
    id: "disc-basket-chains",
    kind: "hole",
    baseUrl: "https://images.unsplash.com/photo-1725724767938-26e57f67a12c",
    description: "Disc golf basket chains on a course.",
    photoPageUrl:
      "https://unsplash.com/photos/a-frisbee-golf-basket-with-chains-attached-to-it-UMySXRWU3Rg",
    photographerName: "Priscilla Du Preez",
    photographerUrl: "https://unsplash.com/@priscilladupreez",
    themes: ["basket", "disc-golf", "wooded"],
    objectPosition: "center"
  },
  {
    id: "basket-hill-walk",
    kind: "hole",
    baseUrl: "https://images.unsplash.com/photo-1777174031966-2fd2c0989269",
    description: "Disc golf basket on a rolling park hole.",
    photoPageUrl:
      "https://unsplash.com/photos/man-walking-towards-a-disc-golf-basket-on-a-hill-ASmBwTVBsE0",
    photographerName: "Priscilla Du Preez",
    photographerUrl: "https://unsplash.com/@priscilladupreez",
    themes: ["basket", "disc-golf", "open-park"],
    objectPosition: "center"
  },
  {
    id: "forest-tee-trail",
    kind: "hole",
    baseUrl: "https://images.unsplash.com/photo-1647568915657-c237b6fea460",
    description: "Wooded fairway trail with filtered sunlight.",
    photoPageUrl:
      "https://unsplash.com/photos/a-trail-in-the-woods-with-lots-of-trees-Z_NsZnAYxgA",
    photographerName: "David Schultz",
    photographerUrl: "https://unsplash.com/@davidschultz",
    themes: ["trail", "wooded"],
    objectPosition: "center"
  },
  {
    id: "golden-park-hole",
    kind: "hole",
    baseUrl: "https://images.unsplash.com/photo-1765550232079-d000cacded33",
    description: "Open park path and field in golden light.",
    photoPageUrl:
      "https://unsplash.com/photos/a-paved-path-through-a-grassy-field-at-sunset-s9pDreUxCIQ",
    photographerName: "negin",
    photographerUrl: "https://unsplash.com/@negin_nn",
    themes: ["open-park", "sunset", "trail"],
    objectPosition: "center"
  },
  {
    id: "mountain-hole-view",
    kind: "hole",
    baseUrl: "https://images.unsplash.com/photo-1772125798315-21b68500a9cd",
    description: "Scenic rocky park trail for an outdoor round.",
    photoPageUrl:
      "https://unsplash.com/photos/road-winding-through-a-rocky-landscape-at-sunset-tdIgwOPECAQ",
    photographerName: "Daniel Forster",
    photographerUrl: "https://unsplash.com/@danielforsterphoto",
    themes: ["mountain", "open-park", "sunset", "trail"],
    objectPosition: "center"
  }
];

const courseImages = placeholderImages.filter((image) => image.kind === "course");
const holeImages = placeholderImages.filter((image) => image.kind === "hole");

function normalizeUploadedUrl(value?: string | null) {
  const url = value?.trim();

  return url ? url : null;
}

export function stableHash(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return hash >>> 0;
}

function chooseDeterministic<T>(items: T[], seed: string, offset = 0) {
  if (!items.length) {
    throw new Error("Cannot choose from an empty placeholder image set.");
  }

  return items[(stableHash(seed) + offset) % items.length];
}

function classifyCourseThemes(course: CoursePlaceholderInput): PlaceholderImageTheme[] {
  const text = `${course.name} ${course.locationName ?? ""}`.toLowerCase();

  if (
    course.difficulty === "expert" ||
    course.difficulty === "challenging" ||
    /mount|ridge|hill|peak|valley|rock|boulder|canyon|aspen|denver|colorado|utah/.test(
      text
    )
  ) {
    return ["mountain", "trail", "disc-golf"];
  }

  if (
    course.beginnerFriendly ||
    course.cartFriendly ||
    course.hasParking ||
    /park|campus|green|meadow|field|commons|urban|city/.test(text)
  ) {
    return ["open-park", "basket", "sunset"];
  }

  return ["wooded", "trail", "disc-golf"];
}

function imageMatchesAnyTheme(image: PlaceholderImage, themes: PlaceholderImageTheme[]) {
  return image.themes.some((theme) => themes.includes(theme));
}

export function getCoursePlaceholderImage(course: CoursePlaceholderInput) {
  const themes = classifyCourseThemes(course);
  const themedImages = courseImages.filter((image) =>
    imageMatchesAnyTheme(image, themes)
  );
  const candidates = themedImages.length >= 2 ? themedImages : courseImages;
  const seed = `course:${course.id}:${course.name}:${course.locationName ?? ""}`;

  return chooseDeterministic(candidates, seed);
}

export function getHolePlaceholderImage(hole: HolePlaceholderInput) {
  const seed = `hole:${hole.courseId}:${hole.courseName ?? ""}:${hole.id}:${hole.holeNumber}`;
  const distanceOffset = hole.distanceFeet ? Math.floor(hole.distanceFeet / 75) : 0;
  const offset = hole.holeNumber * 3 + (hole.par ?? 0) + distanceOffset;

  return chooseDeterministic(holeImages, seed, offset);
}

export function buildPlaceholderImageUrl(
  image: PlaceholderImage,
  width: number,
  quality = 78
) {
  return `${image.baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

export function buildPlaceholderImageSrcSet(image: PlaceholderImage) {
  return placeholderImageWidths
    .map((width) => `${buildPlaceholderImageUrl(image, width)} ${width}w`)
    .join(", ");
}

export function getPlaceholderImageAttributionUrl(url: string) {
  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}${unsplashReferral}`;
}

export function getPlaceholderAttributionEntries() {
  const byPhotographer = new Map<
    string,
    { name: string; url: string; photoCount: number }
  >();

  for (const image of placeholderImages) {
    const existing = byPhotographer.get(image.photographerUrl);

    if (existing) {
      existing.photoCount += 1;
    } else {
      byPhotographer.set(image.photographerUrl, {
        name: image.photographerName,
        url: getPlaceholderImageAttributionUrl(image.photographerUrl),
        photoCount: 1
      });
    }
  }

  return [...byPhotographer.values()].sort((first, second) =>
    first.name.localeCompare(second.name)
  );
}

export function resolveImageCandidate({
  uploadedSrc,
  placeholder,
  failedSources = [],
  placeholderAlt,
  uploadedAlt
}: {
  uploadedSrc?: string | null;
  placeholder: PlaceholderImage;
  failedSources?: string[];
  placeholderAlt?: string;
  uploadedAlt?: string;
}): ResolvedImageCandidate {
  const normalizedUploadedSrc = normalizeUploadedUrl(uploadedSrc);
  const failed = new Set(failedSources);

  if (normalizedUploadedSrc && !failed.has(normalizedUploadedSrc)) {
    return {
      alt: uploadedAlt ?? "",
      isUnavailable: false,
      source: "uploaded",
      src: normalizedUploadedSrc
    };
  }

  const placeholderSrc = buildPlaceholderImageUrl(placeholder, 1280);

  if (!failed.has(placeholderSrc)) {
    return {
      alt: placeholderAlt ?? "",
      isUnavailable: false,
      source: "placeholder",
      src: placeholderSrc,
      srcSet: buildPlaceholderImageSrcSet(placeholder)
    };
  }

  return {
    alt: "",
    isUnavailable: true,
    source: "css-fallback",
    src: null
  };
}

export function resolveCourseImage(course: CoursePlaceholderInput) {
  const placeholder = getCoursePlaceholderImage(course);

  return resolveImageCandidate({
    uploadedAlt: `Photo of ${course.name}`,
    uploadedSrc: course.coverPhotoUrl,
    placeholder,
    placeholderAlt: ""
  });
}

export function resolveHoleImage(hole: HolePlaceholderInput) {
  const placeholder = getHolePlaceholderImage(hole);

  return resolveImageCandidate({
    uploadedAlt: `Tee view for hole ${hole.holeNumber}`,
    uploadedSrc: hole.teePhotoUrl,
    placeholder,
    placeholderAlt: ""
  });
}
