"use client";

import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  Check,
  Eye,
  Flag,
  MapPin,
  Plus,
  Route as RouteIcon,
  Save,
  SlidersHorizontal,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type {
  Difficulty,
  HoleMapPayload,
  LatLng,
  RiskLevel,
  RouteOverlay,
  RouteSort,
  RouteTag,
  StrategyRoute
} from "@/lib/types";

type HoleMapClientProps = {
  initialPayload: HoleMapPayload;
};

type RouteFormState = {
  name: string;
  description: string;
  difficulty: Difficulty;
  riskLevel: RiskLevel;
  tag: RouteTag;
  discSuggestion: string;
};

type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

const routeColors: Record<RouteTag, string> = {
  safe: "#1f9d92",
  aggressive: "#e0a13a",
  scramble: "#b85f3f"
};

const initialForm: RouteFormState = {
  name: "",
  description: "",
  difficulty: "intermediate",
  riskLevel: "medium",
  tag: "safe",
  discSuggestion: ""
};

function sortRouteList(routes: StrategyRoute[], sort: RouteSort) {
  return [...routes].sort((first, second) => {
    if (sort === "newest") {
      return (
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );
    }

    if (sort === "popular") {
      return second.upvotes + second.downvotes - (first.upvotes + first.downvotes);
    }

    return second.score - first.score || second.upvotes - first.upvotes;
  });
}

function getBounds(points: LatLng[]): Bounds {
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const latPad = Math.max((maxLat - minLat) * 0.24, 0.0004);
  const lngPad = Math.max((maxLng - minLng) * 0.24, 0.0004);

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad
  };
}

function project(point: LatLng, bounds: Bounds) {
  const x = ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 100;
  const y = ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat || 1)) * 100;

  return { x, y };
}

function unproject(x: number, y: number, bounds: Bounds): LatLng {
  return {
    lat: bounds.maxLat - (y / 100) * (bounds.maxLat - bounds.minLat),
    lng: bounds.minLng + (x / 100) * (bounds.maxLng - bounds.minLng)
  };
}

function lineFeature(points: LatLng[]) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: points.map((point) => [point.lng, point.lat])
    }
  };
}

function clearStrategyLayers(map: any) {
  const style = map.getStyle();
  const layers = style.layers ?? [];

  layers
    .filter((layer: { id: string }) => layer.id.startsWith("strategy-"))
    .forEach((layer: { id: string }) => {
      if (map.getLayer(layer.id)) {
        map.removeLayer(layer.id);
      }
    });

  Object.keys(style.sources ?? {})
    .filter((sourceId) => sourceId.startsWith("strategy-"))
    .forEach((sourceId) => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });
}

function addLineLayer(
  map: any,
  id: string,
  points: LatLng[],
  color: string,
  width: number,
  options?: { dashed?: boolean; opacity?: number }
) {
  if (points.length < 2) return;

  map.addSource(id, {
    type: "geojson",
    data: lineFeature(points)
  });
  map.addLayer({
    id,
    type: "line",
    source: id,
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint: {
      "line-color": color,
      "line-width": width,
      "line-opacity": options?.opacity ?? 0.95,
      ...(options?.dashed ? { "line-dasharray": [1.5, 1.5] } : {})
    }
  });
}

export function HoleMapClient({ initialPayload }: HoleMapClientProps) {
  const { course, hole, currentUser } = initialPayload;
  const currentUserId = currentUser?.id ?? 1;
  const [routes, setRoutes] = useState(initialPayload.routes);
  const [overlay, setOverlay] = useState<RouteOverlay>("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [sort, setSort] = useState<RouteSort>("top");
  const [drawing, setDrawing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([]);
  const [form, setForm] = useState<RouteFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const drawingRef = useRef(drawing);
  const finishDrawingRef = useRef<() => void>(() => undefined);
  const markerCleanupRef = useRef<(() => void) | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const topRoute = useMemo(
    () => sortRouteList(routes, "top")[0] ?? null,
    [routes]
  );

  const draftLine = useMemo(
    () => [hole.tee, ...draftPoints, hole.basket],
    [draftPoints, hole.basket, hole.tee]
  );

  const visibleRoutes = useMemo(() => {
    const filtered = routes.filter((route) => {
      if (difficulty !== "all" && route.difficulty !== difficulty) return false;
      if (overlay === "following") return route.isFollowedAuthor;
      if (overlay === "top") return route.id === topRoute?.id;
      return true;
    });

    return sortRouteList(filtered, sort);
  }, [difficulty, overlay, routes, sort, topRoute?.id]);

  const allMapPoints = useMemo(
    () => [
      hole.tee,
      hole.basket,
      ...visibleRoutes.flatMap((route) => route.polyline),
      ...draftLine
    ],
    [draftLine, hole.basket, hole.tee, visibleRoutes]
  );
  const fallbackBounds = useMemo(() => getBounds(allMapPoints), [allMapPoints]);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  function finishDrawing() {
    setDrawing(false);
    setIsFormOpen(true);
  }

  finishDrawingRef.current = finishDrawing;

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) {
      return;
    }

    let cancelled = false;

    void import("mapbox-gl").then((mapbox) => {
      if (cancelled || !mapContainerRef.current) return;

      mapbox.default.accessToken = mapboxToken;
      const map = new mapbox.default.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [
          (hole.tee.lng + hole.basket.lng) / 2,
          (hole.tee.lat + hole.basket.lat) / 2
        ],
        zoom: 17,
        attributionControl: false
      });

      map.doubleClickZoom.disable();
      map.addControl(new mapbox.default.NavigationControl({ showCompass: true }), "bottom-right");
      map.addControl(new mapbox.default.AttributionControl({ compact: true }), "bottom-left");

      const teeEl = document.createElement("div");
      teeEl.className = "map-marker map-marker-tee";
      teeEl.textContent = "T";
      const basketEl = document.createElement("div");
      basketEl.className = "map-marker map-marker-basket";
      basketEl.textContent = "B";

      const teeMarker = new mapbox.default.Marker({ element: teeEl })
        .setLngLat([hole.tee.lng, hole.tee.lat])
        .addTo(map);
      const basketMarker = new mapbox.default.Marker({ element: basketEl })
        .setLngLat([hole.basket.lng, hole.basket.lat])
        .addTo(map);

      markerCleanupRef.current = () => {
        teeMarker.remove();
        basketMarker.remove();
      };

      map.on("load", () => {
        const bounds = new mapbox.default.LngLatBounds(
          [hole.tee.lng, hole.tee.lat],
          [hole.basket.lng, hole.basket.lat]
        );
        map.fitBounds(bounds, { padding: 90, maxZoom: 18, duration: 0 });
        setMapReady(true);
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      markerCleanupRef.current?.();
      markerCleanupRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hole.basket, hole.tee, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const handleClick = (event: { lngLat: { lat: number; lng: number } }) => {
      if (!drawingRef.current) return;
      setDraftPoints((points) => [
        ...points,
        { lat: event.lngLat.lat, lng: event.lngLat.lng }
      ]);
    };

    const handleDoubleClick = (event: { originalEvent?: Event }) => {
      if (!drawingRef.current) return;
      event.originalEvent?.preventDefault();
      finishDrawingRef.current();
    };

    map.on("click", handleClick);
    map.on("dblclick", handleDoubleClick);

    return () => {
      map.off("click", handleClick);
      map.off("dblclick", handleDoubleClick);
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    clearStrategyLayers(map);
    addLineLayer(map, "strategy-baseline", [hole.tee, hole.basket], "#fffdf7", 3, {
      dashed: true,
      opacity: 0.8
    });

    visibleRoutes.forEach((route, index) => {
      addLineLayer(
        map,
        `strategy-route-${route.id}`,
        route.polyline,
        route.id === topRoute?.id ? "#ffd166" : routeColors[route.tag],
        route.id === topRoute?.id ? 7 : 4,
        { opacity: index === 0 ? 0.98 : 0.76 }
      );
    });

    if (isFormOpen || drawing) {
      addLineLayer(map, "strategy-draft", draftLine, "#ffffff", 5, { opacity: 0.92 });
    }
  }, [draftLine, drawing, hole.basket, hole.tee, isFormOpen, mapReady, topRoute?.id, visibleRoutes]);

  function beginDrawing() {
    setError(null);
    setDraftPoints([]);
    setForm(initialForm);
    setIsFormOpen(true);
    setDrawing(true);
  }

  function cancelDraft() {
    setDrawing(false);
    setDraftPoints([]);
    setIsFormOpen(false);
    setError(null);
  }

  async function vote(routeId: number, value: "up" | "down") {
    const response = await fetch(`/api/routes/${routeId}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-user-id": String(currentUserId)
      },
      body: JSON.stringify({ value })
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { route: StrategyRoute };
    setRoutes((current) =>
      current.map((route) => (route.id === payload.route.id ? payload.route : route))
    );
  }

  function saveRoute() {
    setError(null);
    setSaving(true);

    void (async () => {
      try {
        const response = await fetch(`/api/holes/${hole.id}/routes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": String(currentUserId)
          },
          body: JSON.stringify({
            ...form,
            polyline: draftLine
          })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Route could not be saved");
          return;
        }

        const payload = (await response.json()) as { route: StrategyRoute };
        setRoutes((current) => sortRouteList([payload.route, ...current], "top"));
        setDraftPoints([]);
        setForm(initialForm);
        setDrawing(false);
        setIsFormOpen(false);
      } catch {
        setError("Route could not be saved");
      } finally {
        setSaving(false);
      }
    })();
  }

  function addFallbackPoint(event: React.MouseEvent<HTMLDivElement>) {
    if (!drawing || event.detail > 1) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setDraftPoints((points) => [...points, unproject(x, y, fallbackBounds)]);
  }

  return (
    <main className="flex min-h-[calc(100vh-65px)] flex-col bg-ink lg:flex-row">
      <section className="relative min-h-[58vh] flex-1 overflow-hidden lg:min-h-0">
        <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#fffdf7]/95 px-4 text-sm font-bold text-ink shadow transition hover:bg-white"
            href={`/courses/${course.id}`}
          >
            <ArrowLeft size={16} aria-hidden />
            {course.name}
          </Link>
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-ink/75 px-4 text-sm font-bold text-white shadow backdrop-blur">
            <Flag size={16} aria-hidden />
            Hole {hole.holeNumber}
          </span>
        </div>

        {mapboxToken ? (
          <div className="absolute inset-0" ref={mapContainerRef} />
        ) : (
          <FallbackMap
            bounds={fallbackBounds}
            draftLine={isFormOpen || drawing ? draftLine : []}
            drawing={drawing}
            hole={hole}
            onClick={addFallbackPoint}
            onDoubleClick={finishDrawing}
            routes={visibleRoutes}
            topRouteId={topRoute?.id ?? null}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-ink/75 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <OverlayButton
              active={overlay === "all"}
              icon={<Eye size={16} aria-hidden />}
              label="Community"
              onClick={() => setOverlay("all")}
            />
            <OverlayButton
              active={overlay === "following"}
              icon={<Users size={16} aria-hidden />}
              label="Following"
              onClick={() => setOverlay("following")}
            />
            <OverlayButton
              active={overlay === "top"}
              icon={<Trophy size={16} aria-hidden />}
              label="Top"
              onClick={() => setOverlay("top")}
            />
          </div>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full bg-clay-500 px-5 text-sm font-black text-white shadow-panel transition hover:bg-clay-700"
            onClick={beginDrawing}
            type="button"
          >
            <Plus size={17} aria-hidden />
            Add Route
          </button>
        </div>
      </section>

      <aside className="max-h-[none] w-full overflow-y-auto bg-[#fffdf7] lg:max-h-[calc(100vh-65px)] lg:w-[430px]">
        <div className="border-b border-canopy-900/10 p-5">
          <p className="flex items-center gap-2 text-sm font-bold uppercase text-clay-700">
            <MapPin size={16} aria-hidden />
            {course.locationName}
          </p>
          <h1 className="mt-2 text-3xl font-black text-ink">
            Hole {hole.holeNumber}
            {hole.par ? <span className="text-ink/45"> · Par {hole.par}</span> : null}
          </h1>
          {hole.description ? (
            <p className="mt-3 text-sm leading-6 text-ink/65">{hole.description}</p>
          ) : null}
        </div>

        <div className="grid gap-4 border-b border-canopy-900/10 p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={16} aria-hidden />
                Sort
              </span>
              <select
                className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
                onChange={(event) => setSort(event.target.value as RouteSort)}
                value={sort}
              >
                <option value="top">Highest rated</option>
                <option value="newest">Newest</option>
                <option value="popular">Most popular</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink/70">
              Difficulty
              <select
                className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
                onChange={(event) =>
                  setDifficulty(event.target.value as Difficulty | "all")
                }
                value={difficulty}
              >
                <option value="all">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm font-bold">
            <div className="rounded-lg bg-canopy-50 p-3 text-canopy-700">
              <span className="block text-ink/55">Routes</span>
              <span className="mt-1 block text-2xl text-ink">{visibleRoutes.length}</span>
            </div>
            <div className="rounded-lg bg-clay-100 p-3 text-clay-700">
              <span className="block text-ink/55">Top score</span>
              <span className="mt-1 block text-2xl text-ink">
                {topRoute ? `${topRoute.score > 0 ? "+" : ""}${topRoute.score}` : "0"}
              </span>
            </div>
          </div>
        </div>

        {isFormOpen ? (
          <RouteForm
            draftPointCount={draftPoints.length}
            drawing={drawing}
            error={error}
            form={form}
            onCancel={cancelDraft}
            onChange={setForm}
            onFinish={finishDrawing}
            onSave={saveRoute}
            saving={saving}
          />
        ) : null}

        <div className="grid gap-3 p-5">
          {visibleRoutes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-canopy-900/20 bg-white p-5 text-sm font-semibold text-ink/60">
              No routes match the current view.
            </div>
          ) : (
            visibleRoutes.map((route) => (
              <RouteCard
                key={route.id}
                onVote={vote}
                route={route}
                top={route.id === topRoute?.id}
              />
            ))
          )}
        </div>
      </aside>
    </main>
  );
}

function OverlayButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black shadow transition",
        active
          ? "bg-[#fffdf7] text-ink"
          : "bg-ink/65 text-white backdrop-blur hover:bg-ink/85"
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function RouteForm({
  draftPointCount,
  drawing,
  error,
  form,
  onCancel,
  onChange,
  onFinish,
  onSave,
  saving
}: {
  draftPointCount: number;
  drawing: boolean;
  error: string | null;
  form: RouteFormState;
  onCancel: () => void;
  onChange: (form: RouteFormState) => void;
  onFinish: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="grid gap-4 border-b border-canopy-900/10 bg-canopy-50/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-ink">
          <RouteIcon size={18} aria-hidden />
          New Route
        </h2>
        <button
          aria-label="Cancel route"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm transition hover:bg-clay-100"
          onClick={onCancel}
          type="button"
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span
          className={clsx(
            "inline-flex h-8 items-center gap-2 rounded-full px-3",
            drawing ? "bg-water-100 text-water-700" : "bg-white text-ink/65"
          )}
        >
          {drawing ? <Target size={15} aria-hidden /> : <Check size={15} aria-hidden />}
          {drawing ? "Drawing active" : "Line ready"}
        </span>
        <span className="inline-flex h-8 items-center rounded-full bg-white px-3 text-ink/65">
          {draftPointCount} midpoints
        </span>
      </div>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Name
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="Safe Hyzer Line"
          value={form.name}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-2 text-sm font-bold text-ink/70">
          Difficulty
          <select
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
            onChange={(event) =>
              onChange({ ...form, difficulty: event.target.value as Difficulty })
            }
            value={form.difficulty}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-ink/70">
          Risk
          <select
            className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
            onChange={(event) =>
              onChange({ ...form, riskLevel: event.target.value as RiskLevel })
            }
            value={form.riskLevel}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Tag
        <select
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          onChange={(event) => onChange({ ...form, tag: event.target.value as RouteTag })}
          value={form.tag}
        >
          <option value="safe">Safe</option>
          <option value="aggressive">Aggressive</option>
          <option value="scramble">Scramble</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Disc
        <input
          className="h-11 rounded-lg border border-canopy-900/10 bg-white px-3 font-semibold outline-none"
          onChange={(event) =>
            onChange({ ...form, discSuggestion: event.target.value })
          }
          placeholder="Stable fairway driver"
          value={form.discSuggestion}
        />
      </label>

      <label className="grid gap-2 text-sm font-bold text-ink/70">
        Notes
        <textarea
          className="min-h-24 resize-none rounded-lg border border-canopy-900/10 bg-white p-3 font-semibold leading-6 outline-none"
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          placeholder="Landing zone, release angle, miss tendency"
          value={form.description}
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-clay-100 p-3 text-sm font-bold text-clay-700">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-ink shadow-sm transition hover:bg-water-100"
          disabled={!drawing}
          onClick={onFinish}
          type="button"
        >
          <Check size={16} aria-hidden />
          Finish
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white shadow-sm transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:bg-ink/35"
          disabled={saving || drawing}
          onClick={onSave}
          type="button"
        >
          <Save size={16} aria-hidden />
          Save
        </button>
      </div>
    </div>
  );
}

function RouteCard({
  onVote,
  route,
  top
}: {
  onVote: (routeId: number, value: "up" | "down") => void;
  route: StrategyRoute;
  top: boolean;
}) {
  return (
    <article
      className={clsx(
        "rounded-lg border bg-white p-4 shadow-sm",
        top ? "border-clay-300" : "border-canopy-900/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-ink">{route.name}</h3>
            {top ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-clay-100 px-2 py-1 text-xs font-black text-clay-700">
                <Trophy size={13} aria-hidden />
                Top
              </span>
            ) : null}
          </div>
          <Link
            className="mt-2 flex w-fit items-center gap-2 text-sm font-bold text-ink/65 transition hover:text-canopy-700"
            href={`/profiles/${route.author.id}`}
          >
            <Avatar
              name={route.author.username}
              size="sm"
              src={route.author.profileImageUrl}
            />
            @{route.author.username}
          </Link>
        </div>
        <div className="rounded-full bg-canopy-50 px-3 py-1 text-sm font-black text-canopy-700">
          {route.score > 0 ? "+" : ""}
          {route.score}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase">
        <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
          {route.difficulty}
        </span>
        <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
          {route.riskLevel} risk
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-white"
          style={{ backgroundColor: routeColors[route.tag] }}
        >
          {route.tag}
        </span>
      </div>

      {route.discSuggestion ? (
        <p className="mt-4 text-sm font-bold text-ink">Disc: {route.discSuggestion}</p>
      ) : null}
      {route.description ? (
        <p className="mt-2 text-sm leading-6 text-ink/65">{route.description}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-50 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
          onClick={() => onVote(route.id, "up")}
          type="button"
        >
          <ThumbsUp size={15} aria-hidden />
          {route.upvotes}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-clay-100 text-sm font-black text-clay-700 transition hover:bg-clay-300/45"
          onClick={() => onVote(route.id, "down")}
          type="button"
        >
          <ThumbsDown size={15} aria-hidden />
          {route.downvotes}
        </button>
      </div>
    </article>
  );
}

function FallbackMap({
  bounds,
  draftLine,
  drawing,
  hole,
  onClick,
  onDoubleClick,
  routes,
  topRouteId
}: {
  bounds: Bounds;
  draftLine: LatLng[];
  drawing: boolean;
  hole: HoleMapPayload["hole"];
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  routes: StrategyRoute[];
  topRouteId: number | null;
}) {
  const tee = project(hole.tee, bounds);
  const basket = project(hole.basket, bounds);

  return (
    <div
      className={clsx(
        "fallback-map field-grid absolute inset-0 cursor-crosshair select-none",
        !drawing && "cursor-default"
      )}
      onClick={onClick}
      onDoubleClick={() => {
        if (drawing) onDoubleClick();
      }}
      role="presentation"
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          stroke="rgba(255,253,247,0.78)"
          strokeDasharray="2 2"
          strokeLinecap="round"
          strokeWidth="0.6"
          x1={tee.x}
          x2={basket.x}
          y1={tee.y}
          y2={basket.y}
        />
        {routes.map((route) => (
          <polyline
            fill="none"
            key={route.id}
            points={route.polyline
              .map((point) => {
                const projected = project(point, bounds);
                return `${projected.x},${projected.y}`;
              })
              .join(" ")}
            stroke={route.id === topRouteId ? "#ffd166" : routeColors[route.tag]}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={route.id === topRouteId ? 1.8 : 1.1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {draftLine.length > 1 ? (
          <polyline
            fill="none"
            points={draftLine
              .map((point) => {
                const projected = project(point, bounds);
                return `${projected.x},${projected.y}`;
              })
              .join(" ")}
            stroke="#fffdf7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.35"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      <MapPoint label="T" point={tee} tone="tee" />
      <MapPoint label="B" point={basket} tone="basket" />
    </div>
  );
}

function MapPoint({
  label,
  point,
  tone
}: {
  label: string;
  point: { x: number; y: number };
  tone: "tee" | "basket";
}) {
  return (
    <span
      className={clsx(
        "absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-panel",
        tone === "tee" ? "bg-water-500" : "bg-clay-500"
      )}
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      {label}
    </span>
  );
}
