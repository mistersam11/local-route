"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Disc3,
  Flag,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trophy
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type {
  BestLine,
  Difficulty,
  HoleCommentCard,
  HoleSocialPayload,
  LineTag,
  RiskLevel
} from "@/lib/types";

const lineColors: Record<LineTag, string> = {
  safe: "#1f9d92",
  aggressive: "#a85d31",
  scramble: "#6f7f3f"
};

type LineForm = {
  name: string;
  description: string;
  difficulty: Difficulty;
  riskLevel: RiskLevel;
  tag: LineTag;
  discSuggestion: string;
};

const emptyLineForm: LineForm = {
  name: "",
  description: "",
  difficulty: "intermediate",
  riskLevel: "medium",
  tag: "safe",
  discSuggestion: ""
};

export function HoleSocialClient({ initialPayload }: { initialPayload: HoleSocialPayload }) {
  const { course, hole, currentUser } = initialPayload;
  const currentUserId = currentUser?.id ?? 1;
  const [comments, setComments] = useState(initialPayload.comments);
  const [lines, setLines] = useState(initialPayload.lines);
  const [commentBody, setCommentBody] = useState("");
  const [commentPhotoUrl, setCommentPhotoUrl] = useState("");
  const [lineForm, setLineForm] = useState<LineForm>(emptyLineForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function attachCommentPhoto(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCommentPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const bestLine = useMemo(
    () => [...lines].sort((first, second) => second.score - first.score)[0] ?? null,
    [lines]
  );

  function postComment() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/holes/${hole.id}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": String(currentUserId)
          },
          body: JSON.stringify({ body: commentBody, photoUrl: commentPhotoUrl })
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Comment could not be saved");
          return;
        }

        const payload = (await response.json()) as { comment: HoleCommentCard };
        setComments((current) => [payload.comment, ...current]);
        setCommentBody("");
        setCommentPhotoUrl("");
      } finally {
        setSaving(false);
      }
    })();
  }

  function postLine() {
    setSaving(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/holes/${hole.id}/lines`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-demo-user-id": String(currentUserId)
          },
          body: JSON.stringify(lineForm)
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          setError(payload.error ?? "Line could not be saved");
          return;
        }

        const payload = (await response.json()) as { line: BestLine };
        setLines((current) =>
          [payload.line, ...current].sort((first, second) => second.score - first.score)
        );
        setLineForm(emptyLineForm);
      } finally {
        setSaving(false);
      }
    })();
  }

  async function vote(lineId: number, value: "up" | "down") {
    const response = await fetch(`/api/lines/${lineId}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-demo-user-id": String(currentUserId)
      },
      body: JSON.stringify({ value })
    });

    if (!response.ok) return;

    const payload = (await response.json()) as { line: BestLine };
    setLines((current) =>
      current
        .map((line) => (line.id === payload.line.id ? payload.line : line))
        .sort((first, second) => second.score - first.score)
    );
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-10">
      <section className="grid gap-6">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-canopy-50"
          href={`/courses/${course.id}`}
        >
          <ArrowLeft size={16} aria-hidden />
          {course.name}
        </Link>

        <div className="overflow-hidden rounded-lg bg-[#fffdf7] shadow-panel">
          <div className="relative min-h-[340px] bg-ink">
            {hole.teePhotoUrl ? (
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                src={hole.teePhotoUrl}
              />
            ) : (
              <div className="fallback-map field-grid absolute inset-0" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-7">
              <p className="flex items-center gap-2 text-sm font-bold uppercase text-white/75">
                <Flag size={16} aria-hidden />
                Hole {hole.holeNumber}
              </p>
              <h1 className="mt-2 text-4xl font-black sm:text-6xl">
                {course.name}
              </h1>
              <p className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-white/80">
                <span>Par {hole.par ?? "-"}</span>
                {hole.distanceFeet ? <span>{hole.distanceFeet} ft</span> : null}
                <span>{course.locationName}</span>
              </p>
            </div>
          </div>
          {hole.description ? (
            <p className="p-5 text-base font-semibold leading-7 text-ink/70 sm:p-7">
              {hole.description}
            </p>
          ) : null}
        </div>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-ink">Comments</h2>
            <span className="rounded-full bg-water-100 px-3 py-1 text-sm font-bold text-water-700">
              {comments.length}
            </span>
          </div>
          <div className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
            <textarea
              className="min-h-28 resize-none rounded-lg border border-canopy-900/10 p-3 font-semibold leading-6 outline-none"
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Add a note about the tee view, landing zone, footing, wind, or pin position..."
              value={commentBody}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-canopy-900/10 px-3 text-sm font-semibold text-ink/60 transition hover:bg-canopy-50">
              <Camera size={16} aria-hidden />
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) => attachCommentPhoto(event.target.files?.[0])}
                type="file"
              />
              {commentPhotoUrl ? "Photo attached" : "Attach a photo"}
            </label>
            {error ? <p className="text-sm font-bold text-clay-700">{error}</p> : null}
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
              disabled={saving}
              onClick={postComment}
              type="button"
            >
              <Send size={16} aria-hidden />
              Post comment
            </button>
          </div>
          {comments.map((comment) => (
            <CommentCard comment={comment} key={comment.id} />
          ))}
        </section>
      </section>

      <aside className="grid h-fit gap-5">
        {bestLine ? (
          <div className="rounded-lg border border-clay-300 bg-[#fffdf7] p-5 shadow-panel">
            <p className="flex items-center gap-2 text-sm font-black uppercase text-clay-700">
              <Trophy size={16} aria-hidden />
              Best Line
            </p>
            <LineCard line={bestLine} onVote={vote} top />
          </div>
        ) : null}

        <div className="grid gap-3 rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-black text-ink">Suggest a line</h2>
          <input
            className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
            onChange={(event) => setLineForm({ ...lineForm, name: event.target.value })}
            placeholder="Safe hyzer, turnover gap, layup zone..."
            value={lineForm.name}
          />
          <textarea
            className="min-h-24 resize-none rounded-lg border border-canopy-900/10 p-3 font-semibold leading-6 outline-none"
            onChange={(event) =>
              setLineForm({ ...lineForm, description: event.target.value })
            }
            placeholder="Describe the shape and miss."
            value={lineForm.description}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
              onChange={(event) =>
                setLineForm({ ...lineForm, difficulty: event.target.value as Difficulty })
              }
              value={lineForm.difficulty}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <select
              className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
              onChange={(event) =>
                setLineForm({ ...lineForm, riskLevel: event.target.value as RiskLevel })
              }
              value={lineForm.riskLevel}
            >
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
            </select>
          </div>
          <select
            className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
            onChange={(event) =>
              setLineForm({ ...lineForm, tag: event.target.value as LineTag })
            }
            value={lineForm.tag}
          >
            <option value="safe">Safe</option>
            <option value="aggressive">Aggressive</option>
            <option value="scramble">Scramble</option>
          </select>
          <input
            className="h-11 rounded-lg border border-canopy-900/10 px-3 font-semibold outline-none"
            onChange={(event) =>
              setLineForm({ ...lineForm, discSuggestion: event.target.value })
            }
            placeholder="Disc suggestion"
            value={lineForm.discSuggestion}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white transition hover:bg-canopy-700 disabled:bg-ink/35"
            disabled={saving}
            onClick={postLine}
            type="button"
          >
            <Disc3 size={16} aria-hidden />
            Add line
          </button>
        </div>

        <div className="grid gap-3">
          <h2 className="text-2xl font-black text-ink">All Lines</h2>
          {lines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              onVote={vote}
              top={line.id === bestLine?.id}
            />
          ))}
        </div>
      </aside>
    </main>
  );
}

function CommentCard({ comment }: { comment: HoleCommentCard }) {
  return (
    <article className="rounded-lg border border-canopy-900/10 bg-[#fffdf7] p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <Avatar
          name={comment.author.username}
          size="sm"
          src={comment.author.profileImageUrl}
        />
        <Link className="font-black hover:text-canopy-700" href={`/profiles/${comment.author.id}`}>
          @{comment.author.username}
        </Link>
      </div>
      <p className="text-sm font-semibold leading-6 text-ink/70">{comment.body}</p>
      {comment.photoUrl ? (
        <img
          alt=""
          className="mt-4 max-h-96 w-full rounded-lg object-cover"
          src={comment.photoUrl}
        />
      ) : null}
    </article>
  );
}

function LineCard({
  line,
  onVote,
  top
}: {
  line: BestLine;
  onVote: (lineId: number, value: "up" | "down") => void;
  top?: boolean;
}) {
  return (
    <article className="rounded-lg border border-canopy-900/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-ink">{line.name}</h3>
          <Link
            className="mt-2 flex w-fit items-center gap-2 text-sm font-bold text-ink/65 transition hover:text-canopy-700"
            href={`/profiles/${line.author.id}`}
          >
            <Avatar name={line.author.username} size="sm" src={line.author.profileImageUrl} />
            @{line.author.username}
          </Link>
        </div>
        <span className="rounded-full bg-canopy-50 px-3 py-1 text-sm font-black text-canopy-700">
          {line.score > 0 ? "+" : ""}
          {line.score}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase">
        {top ? (
          <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">best</span>
        ) : null}
        <span className="rounded-full bg-water-100 px-2.5 py-1 text-water-700">
          {line.difficulty}
        </span>
        <span className="rounded-full bg-clay-100 px-2.5 py-1 text-clay-700">
          {line.riskLevel} risk
        </span>
        <span className="rounded-full px-2.5 py-1 text-white" style={{ backgroundColor: lineColors[line.tag] }}>
          {line.tag}
        </span>
      </div>
      {line.discSuggestion ? (
        <p className="mt-4 text-sm font-bold text-ink">Disc: {line.discSuggestion}</p>
      ) : null}
      {line.description ? (
        <p className="mt-2 text-sm font-semibold leading-6 text-ink/65">{line.description}</p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canopy-50 text-sm font-black text-canopy-700 transition hover:bg-canopy-100"
          onClick={() => onVote(line.id, "up")}
          type="button"
        >
          <ThumbsUp size={15} aria-hidden />
          {line.upvotes}
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-clay-100 text-sm font-black text-clay-700 transition hover:bg-clay-300/45"
          onClick={() => onVote(line.id, "down")}
          type="button"
        >
          <ThumbsDown size={15} aria-hidden />
          {line.downvotes}
        </button>
      </div>
    </article>
  );
}
