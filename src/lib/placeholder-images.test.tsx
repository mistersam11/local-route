import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlaceholderImageAttribution } from "@/components/PlaceholderImageAttribution";
import {
  buildPlaceholderImageUrl,
  getCoursePlaceholderImage,
  getHolePlaceholderImage,
  placeholderImages,
  resolveCourseImage,
  resolveHoleImage,
  resolveImageCandidate
} from "./placeholder-images";

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

const course = {
  id: 42,
  name: "Maple Ridge Park",
  locationName: "Boulder, Colorado",
  coverPhotoUrl: null,
  difficulty: "challenging",
  hasParking: true
};

test("course placeholder fallback returns an optimized Unsplash image", () => {
  const image = resolveCourseImage(course);

  assert.equal(image.source, "placeholder");
  assert.equal(image.alt, "");
  assert.match(image.src ?? "", /^https:\/\/images\.unsplash\.com\/photo-/);
  assert.match(image.src ?? "", /w=1280/);
  assert.match(image.srcSet ?? "", /480w/);
  assert.match(image.srcSet ?? "", /1600w/);
});

test("hole placeholder fallback returns contextual placeholder imagery", () => {
  const image = resolveHoleImage({
    id: 7,
    courseId: course.id,
    courseName: course.name,
    holeNumber: 3,
    teePhotoUrl: null,
    distanceFeet: 330,
    par: 3
  });

  assert.equal(image.source, "placeholder");
  assert.equal(image.alt, "");
  assert.match(image.src ?? "", /^https:\/\/images\.unsplash\.com\/photo-/);
});

test("placeholder selection is deterministic and avoids adjacent hole repetition", () => {
  const firstCoursePick = getCoursePlaceholderImage(course);
  const secondCoursePick = getCoursePlaceholderImage({ ...course });
  const firstHolePick = getHolePlaceholderImage({
    id: 1,
    courseId: course.id,
    courseName: course.name,
    holeNumber: 1,
    teePhotoUrl: null
  });
  const secondHolePick = getHolePlaceholderImage({
    id: 2,
    courseId: course.id,
    courseName: course.name,
    holeNumber: 2,
    teePhotoUrl: null
  });

  assert.equal(firstCoursePick.id, secondCoursePick.id);
  assert.notEqual(firstHolePick.id, secondHolePick.id);
});

test("uploaded images override deterministic placeholders", () => {
  const image = resolveCourseImage({
    ...course,
    coverPhotoUrl: "https://example.test/uploaded-course.jpg"
  });

  assert.equal(image.source, "uploaded");
  assert.equal(image.src, "https://example.test/uploaded-course.jpg");
  assert.equal(image.alt, "Photo of Maple Ridge Park");
  assert.equal(image.srcSet, undefined);
});

test("broken uploaded images fall back before the css texture", () => {
  const placeholder = placeholderImages.find((image) => image.kind === "course");

  assert.ok(placeholder);

  const brokenUploaded = "https://example.test/missing.jpg";
  const placeholderSrc = buildPlaceholderImageUrl(placeholder, 1280);
  const firstFallback = resolveImageCandidate({
    failedSources: [brokenUploaded],
    placeholder,
    uploadedSrc: brokenUploaded
  });
  const finalFallback = resolveImageCandidate({
    failedSources: [brokenUploaded, placeholderSrc],
    placeholder,
    uploadedSrc: brokenUploaded
  });

  assert.equal(firstFallback.source, "placeholder");
  assert.equal(firstFallback.src, placeholderSrc);
  assert.equal(finalFallback.source, "css-fallback");
  assert.equal(finalFallback.src, null);
  assert.equal(finalFallback.isUnavailable, true);
});

test("footer attribution renders Unsplash and photographer credits", () => {
  const html = renderToStaticMarkup(<PlaceholderImageAttribution />);

  assert.match(html, /Photo credits:/);
  assert.match(html, /Unsplash/);
  assert.match(html, /Priscilla Du Preez/);
  assert.match(html, /utm_source=LocalRoute/);
});
