import type { ReactNode } from "react";
import { PlaceholderBackedImage } from "@/components/PlaceholderBackedImage";
import type { PlaceholderImage } from "@/lib/placeholder-images";

type PageCoverHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  placeholder: PlaceholderImage;
  children?: ReactNode;
};

export function PageCoverHeader({
  eyebrow,
  title,
  description,
  placeholder,
  children
}: PageCoverHeaderProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-ink px-5 py-8 shadow-panel sm:px-7 sm:py-10 lg:px-8">
      <PlaceholderBackedImage
        className="absolute inset-0"
        imageClassName="scale-105"
        loading="eager"
        placeholder={placeholder}
        placeholderAlt=""
        sizes="(min-width: 1280px) 1200px, 100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/92 via-ink/68 to-ink/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
      <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase text-clay-100">{eyebrow}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-white sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/76">
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="grid gap-3">{children}</div> : null}
      </div>
    </section>
  );
}
