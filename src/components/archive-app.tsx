import { useMemo, useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ARCHIVE,
  META,
  allTags,
  allYears,
  tweetUrl,
  mediaFallback,
  type ArchiveEntry,
} from "@/data/archive";
import {
  CalendarDays,
  Download,
  ExternalLink,
  Filter,
  HardDrive,
  Heart,
  Image as ImageIcon,
  Search,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Link2,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { CommentSection } from "@/components/comment-section";

type SortKey = "stream-desc" | "stream-asc" | "posted-desc" | "likes-desc";

const YEARS = allYears();
const TAGS = allTags();

function ButterflyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 8c0-3.5 2.5-6 4.5-6 1.2 0 2 .8 2.2 2-.2 2.8-2.7 5-4.5 6.5" />
      <path d="M12 8c0-3.5-2.5-6-4.5-6-1.2 0-2 .8-2.2 2 .2 2.8 2.7 5 4.5 6.5" />
      <path d="M12 11c0 2.8 2.2 6.5 3.8 8.2.7.8 1.7 1.3 2.7 1 .9-.2 1.5-1.1 1.4-2.1-.3-2.8-3-5.2-5-6.1" />
      <path d="M12 11c0 2.8-2.2 6.5-3.8 8.2-.7.8-1.7 1.3-2.7 1-.9-.2-1.5-1.1-1.4-2.1.3-2.8 3-5.2 5-6.1" />
      <path d="M12 7v13" />
    </svg>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${y}/${Number(m)}/${Number(d)}`;
}

function matchQuery(entry: ArchiveEntry, q: string) {
  if (!q) return true;
  const hay = [
    entry.title,
    entry.note,
    entry.streamDate ?? "",
    entry.postedAt,
    ...entry.tags,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function SmartImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={(e) => {
        const el = e.currentTarget;
        const fb = mediaFallback(src);
        if (el.src !== fb && !el.dataset.fallback) {
          el.dataset.fallback = "1";
          el.src = fb;
        } else {
          el.style.opacity = "0.25";
        }
      }}
    />
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full bg-surface/80 ring-1 ring-border" />
    );
  }
  if (user) {
    return (
      <div className="max-w-[11rem] truncate sm:max-w-none [&_button]:text-xs [&_span]:text-xs">
        <UserButton />
      </div>
    );
  }
  return (
    <Link
      to="/login"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/25 sm:px-3"
    >
      <LogIn className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">ID連携</span>
      <span className="sm:hidden">ログイン</span>
    </Link>
  );
}

export function ArchiveApp() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number | "all">("all");
  const [tag, setTag] = useState<string | "all">("all");
  const [specialOnly, setSpecialOnly] = useState(false);
  const [kind, setKind] = useState<"all" | "daily" | "memory">("all");
  const [sort, setSort] = useState<SortKey>("stream-desc");
  const [active, setActive] = useState<ArchiveEntry | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  const filtered = useMemo(() => {
    let list = ARCHIVE.filter((e) => {
      if (year !== "all" && e.year !== year) return false;
      if (tag !== "all" && !e.tags.includes(tag)) return false;
      if (specialOnly && !e.special) return false;
      if (kind === "daily" && e.kind === "memory") return false;
      if (kind === "memory" && e.kind !== "memory") return false;
      if (!matchQuery(e, query)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === "likes-desc") return b.likes - a.likes;
      if (sort === "posted-desc") return b.postedAt.localeCompare(a.postedAt);
      const ad = a.streamDate ?? "0000-00-00";
      const bd = b.streamDate ?? "0000-00-00";
      if (sort === "stream-asc") return ad.localeCompare(bd);
      return bd.localeCompare(ad);
    });
    return list;
  }, [query, year, tag, specialOnly, kind, sort]);

  const stats = useMemo(() => {
    const mediaCount = ARCHIVE.reduce((n, e) => n + e.media.length, 0);
    const daily = ARCHIVE.filter((e) => e.kind !== "memory").length;
    const memory = ARCHIVE.filter((e) => e.kind === "memory").length;
    const specials = ARCHIVE.filter((e) => e.special).length;
    return { entries: ARCHIVE.length, media: mediaCount, daily, memory, specials };
  }, []);

  const openEntry = useCallback((entry: ArchiveEntry) => {
    setActive(entry);
    setMediaIndex(0);
  }, []);

  const closeEntry = useCallback(() => setActive(null), []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEntry();
      if (e.key === "ArrowRight" && active.media.length > 1) {
        setMediaIndex((i) => (i + 1) % active.media.length);
      }
      if (e.key === "ArrowLeft" && active.media.length > 1) {
        setMediaIndex((i) => (i - 1 + active.media.length) % active.media.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeEntry]);

  return (
    <div className="min-h-dvh text-fg">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
              <ButterflyIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold tracking-wide text-fg sm:text-base">
                るーちゃんアーカイブ
              </p>
              <p className="truncate text-[11px] text-muted sm:text-xs">
                from @{META.source.handle} · 画像ローカル保存済
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/rushia-archive.json"
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-primary sm:px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </a>
            <a
              href="/rushia-archive.md"
              download
              className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-primary sm:inline-flex sm:px-3"
            >
              <Download className="h-3.5 w-3.5" />
              <span>MD</span>
            </a>
            <a
              href={META.source.url}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-primary/40 hover:text-primary sm:inline-flex sm:px-3"
            >
              <span>元アカウント</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <AuthSlot />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <section className="animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card/80 px-5 py-7 sm:px-8 sm:py-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative">
            <p className="mb-2 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              <HardDrive className="h-3 w-3" />
              補完済 · 画像{stats.media}枚ミラー · {META.collectedAt}
            </p>
            <h1 className="font-display text-balance text-2xl font-semibold leading-snug tracking-wide text-fg sm:text-3xl">
              潤羽るしあ — 貴重スクショ＆配信記録
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">
              @{META.source.handle} の「{META.series}」＋特別投稿を整理。
              <strong className="font-medium text-fg">
                5/29以降のシリーズはほぼ網羅
              </strong>
              。画像はすべてローカル保存済みです。各投稿に ID 連携コメントもできます。
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="収録投稿" value={stats.entries} />
              <Stat label="画像（ミラー）" value={stats.media} />
              <Stat label="シリーズ枠" value={stats.daily} />
              <Stat label="思い出枠" value={stats.memory} />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold tracking-wide">
              マイルストーン
            </h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {META.milestones.map((m) => (
              <div
                key={m.date}
                className="min-w-[9.5rem] shrink-0 rounded-xl border border-border bg-surface/70 px-3.5 py-3"
              >
                <p className="text-[11px] font-medium text-primary">{m.date}</p>
                <p className="mt-1 text-xs leading-snug text-fg">{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="タイトル・メモ・タグで検索…"
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-fg outline-none transition placeholder:text-faint focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-fg outline-none focus:border-primary/50"
              >
                <option value="stream-desc">配信日 新しい順</option>
                <option value="stream-asc">配信日 古い順</option>
                <option value="posted-desc">投稿日 新しい順</option>
                <option value="likes-desc">いいね多い順</option>
              </select>
              <button
                type="button"
                onClick={() => setSpecialOnly((v) => !v)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition",
                  specialOnly
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-border bg-surface text-muted hover:text-fg",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                特別枠
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-faint">種別</span>
            {(
              [
                ["all", "すべて"],
                ["daily", "シリーズ"],
                ["memory", "思い出"],
              ] as const
            ).map(([k, label]) => (
              <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
                {label}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] text-faint">
              <Filter className="h-3 w-3" />
              年
            </span>
            <Chip active={year === "all"} onClick={() => setYear("all")}>
              すべて
            </Chip>
            {YEARS.map((y) => (
              <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                {y}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] text-faint">
              <Filter className="h-3 w-3" />
              タグ
            </span>
            <Chip active={tag === "all"} onClick={() => setTag("all")}>
              すべて
            </Chip>
            {TAGS.map((t) => (
              <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
                {t}
              </Chip>
            ))}
          </div>

          <p className="text-xs text-muted">
            表示中 <span className="font-semibold text-fg">{filtered.length}</span> /{" "}
            {ARCHIVE.length} 件
          </p>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry, i) => (
            <article
              key={entry.id}
              className="animate-fade-up group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/35 hover:shadow-[0_0_0_1px_var(--color-glow)]"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <button
                type="button"
                onClick={() => openEntry(entry)}
                className="relative aspect-video w-full overflow-hidden bg-bg-elevated text-left"
              >
                <SmartImg
                  src={entry.media[0]}
                  alt={entry.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 via-bg/40 to-transparent p-3 pt-10">
                  <p className="text-[11px] font-medium text-primary">
                    {entry.streamDate
                      ? `配信 ${formatDate(entry.streamDate)}`
                      : `投稿 ${formatDate(entry.postedAt)}`}
                  </p>
                </div>
                {entry.special && (
                  <span className="absolute right-2 top-2 rounded-full border border-accent/40 bg-bg/70 px-2 py-0.5 text-[10px] font-semibold text-accent backdrop-blur">
                    特別
                  </span>
                )}
                {entry.kind === "memory" && (
                  <span className="absolute left-2 top-2 rounded-full border border-primary/30 bg-bg/70 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur">
                    思い出
                  </span>
                )}
                {entry.media.length > 1 && (
                  <span className="absolute bottom-10 right-2 inline-flex items-center gap-1 rounded-full border border-border bg-bg/70 px-2 py-0.5 text-[10px] text-fg backdrop-blur">
                    <ImageIcon className="h-3 w-3" />
                    {entry.media.length}
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <h3 className="font-display text-[15px] font-semibold leading-snug tracking-wide">
                  {entry.title}
                </h3>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                  {entry.note}
                </p>
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  {entry.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-muted ring-1 ring-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-2.5 text-[11px] text-faint">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3 w-3 text-accent-dim" />
                    {entry.likes}
                  </span>
                  <a
                    href={tweetUrl(entry.tweetId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-8 items-center gap-1 text-muted transition hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    元ポスト
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>

        {filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
            <p className="text-sm text-muted">該当する投稿がありません</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setYear("all");
                setTag("all");
                setSpecialOnly(false);
                setKind("all");
              }}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              フィルタをリセット
            </button>
          </div>
        )}

        <section className="mt-12 space-y-4 rounded-2xl border border-border bg-surface/50 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold tracking-wide">
              回収・補完について
            </h2>
          </div>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted sm:text-[13px]">
            {META.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
          {META.gaps.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg">未検出ギャップ</p>
              <ul className="space-y-1 text-[11px] leading-relaxed text-faint sm:text-xs">
                {META.gaps.map((g) => (
                  <li key={g} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-faint" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="flex items-start gap-2 text-[11px] text-faint">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            画像・投稿の著作権は各権利者に帰属します。個人的なアーカイブ閲覧用途です。
          </p>
        </section>
      </main>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeEntry}
        >
          <div
            className="flex max-h-[min(94dvh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex max-h-[42dvh] items-center justify-center bg-bg-elevated sm:max-h-[46dvh]">
              <SmartImg
                src={active.media[mediaIndex]}
                alt={`${active.title} ${mediaIndex + 1}`}
                className="max-h-[42dvh] w-full object-contain sm:max-h-[46dvh]"
              />
              {active.media.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="前の画像"
                    onClick={() =>
                      setMediaIndex(
                        (i) =>
                          (i - 1 + active.media.length) % active.media.length,
                      )
                    }
                    className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg/70 text-fg backdrop-blur transition hover:bg-surface"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="次の画像"
                    onClick={() =>
                      setMediaIndex((i) => (i + 1) % active.media.length)
                    }
                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg/70 text-fg backdrop-blur transition hover:bg-surface"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-bg/75 px-2.5 py-0.5 text-[11px] text-muted backdrop-blur">
                    {mediaIndex + 1} / {active.media.length}
                  </span>
                </>
              )}
              <button
                type="button"
                aria-label="閉じる"
                onClick={closeEntry}
                className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg/75 text-fg backdrop-blur hover:bg-surface"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <p className="text-[11px] font-medium text-primary">
                {active.streamDate
                  ? `配信 ${formatDate(active.streamDate)}`
                  : "配信日不明"}
                <span className="mx-1.5 text-faint">·</span>
                投稿 {formatDate(active.postedAt)}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold tracking-wide">
                {active.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {active.note}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {active.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted ring-1 ring-border"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Heart className="h-3.5 w-3.5 text-accent-dim" />
                  {active.likes} likes
                </span>
                <a
                  href={tweetUrl(active.tweetId)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3.5 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"
                >
                  元ポストを開く
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <CommentSection entryId={active.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg/40 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-fg">
        {value}
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-8 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "bg-primary text-bg"
          : "bg-surface text-muted ring-1 ring-border hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
