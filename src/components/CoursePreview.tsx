import type { LatLng } from "@/lib/types";

type PreviewHole = {
  id: number;
  holeNumber: number;
  teeLat: number;
  teeLng: number;
  basketLat: number;
  basketLng: number;
};

type CoursePreviewProps = {
  holes: PreviewHole[];
};

function project(point: LatLng, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const lngRange = bounds.maxLng - bounds.minLng || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;

  return {
    x: ((point.lng - bounds.minLng) / lngRange) * 100,
    y: ((bounds.maxLat - point.lat) / latRange) * 100
  };
}

export function CoursePreview({ holes }: CoursePreviewProps) {
  if (holes.length === 0) {
    return (
      <div className="fallback-map field-grid relative min-h-[260px] overflow-hidden rounded-lg border border-white/50 shadow-panel">
        <div className="absolute left-4 top-4 rounded-full bg-[#fffdf7]/90 px-3 py-1 text-sm font-bold text-ink shadow">
          No holes mapped
        </div>
      </div>
    );
  }

  const points = holes.flatMap((hole) => [
    { lat: hole.teeLat, lng: hole.teeLng },
    { lat: hole.basketLat, lng: hole.basketLng }
  ]);
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const latPad = Math.max((maxLat - minLat) * 0.2, 0.0003);
  const lngPad = Math.max((maxLng - minLng) * 0.2, 0.0003);
  const bounds = {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad
  };

  return (
    <div className="fallback-map field-grid relative min-h-[260px] overflow-hidden rounded-lg border border-white/50 shadow-panel">
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {holes.map((hole) => {
          const tee = project({ lat: hole.teeLat, lng: hole.teeLng }, bounds);
          const basket = project({ lat: hole.basketLat, lng: hole.basketLng }, bounds);

          return (
            <g key={hole.id}>
              <line
                stroke="rgba(255,253,247,0.75)"
                strokeDasharray="2 2"
                strokeLinecap="round"
                strokeWidth="0.75"
                x1={tee.x}
                x2={basket.x}
                y1={tee.y}
                y2={basket.y}
              />
              <circle cx={tee.x} cy={tee.y} fill="#1f9d92" r="1.8" />
              <circle cx={basket.x} cy={basket.y} fill="#a85d31" r="1.8" />
            </g>
          );
        })}
      </svg>
      <div className="absolute left-4 top-4 rounded-full bg-[#fffdf7]/90 px-3 py-1 text-sm font-bold text-ink shadow">
        {holes.length} holes mapped
      </div>
    </div>
  );
}
