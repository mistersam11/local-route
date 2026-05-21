"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  buildPlaceholderImageSrcSet,
  resolveImageCandidate,
  type PlaceholderImage
} from "@/lib/placeholder-images";

type PlaceholderBackedImageProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  placeholder: PlaceholderImage;
  placeholderAlt?: string;
  sizes: string;
  uploadedAlt?: string;
  uploadedSrc?: string | null;
};

export function PlaceholderBackedImage({
  alt = "",
  className,
  imageClassName,
  loading = "lazy",
  placeholder,
  placeholderAlt,
  sizes,
  uploadedAlt,
  uploadedSrc
}: PlaceholderBackedImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const image = useMemo(
    () =>
      resolveImageCandidate({
        failedSources,
        placeholder,
        placeholderAlt: placeholderAlt ?? alt,
        uploadedAlt: uploadedAlt ?? alt,
        uploadedSrc
      }),
    [alt, failedSources, placeholder, placeholderAlt, uploadedAlt, uploadedSrc]
  );
  const isLoaded = Boolean(image.src && loadedSrc === image.src);

  return (
    <div
      className={clsx(
        "placeholder-image-shell fallback-map field-grid",
        image.isUnavailable && "placeholder-image-unavailable",
        className
      )}
      data-image-source={image.source}
    >
      <div
        aria-hidden
        className={clsx(
          "placeholder-image-skeleton",
          isLoaded || image.isUnavailable ? "opacity-0" : "opacity-100"
        )}
      />
      {image.src ? (
        <img
          alt={image.alt}
          className={clsx(
            "placeholder-image-element",
            isLoaded ? "opacity-100" : "opacity-0",
            imageClassName
          )}
          decoding="async"
          fetchPriority={loading === "eager" ? "high" : "auto"}
          key={image.src}
          loading={loading}
          onError={() => {
            setFailedSources((current) =>
              image.src && !current.includes(image.src)
                ? [...current, image.src]
                : current
            );
          }}
          onLoad={() => setLoadedSrc(image.src)}
          sizes={sizes}
          src={image.src}
          srcSet={
            image.source === "placeholder"
              ? image.srcSet ?? buildPlaceholderImageSrcSet(placeholder)
              : undefined
          }
          style={{ objectPosition: placeholder.objectPosition }}
        />
      ) : null}
    </div>
  );
}
