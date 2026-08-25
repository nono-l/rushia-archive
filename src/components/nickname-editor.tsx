import { useEffect, useState } from "react";
import { getMyProfile, setNickname } from "@/server/profile";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** compact inline (comment form) vs fuller card */
  compact?: boolean;
  className?: string;
  onChanged?: (nickname: string | null, displayName: string) => void;
};

export function NicknameEditor({ compact, className, onChanged }: Props) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nickname, setNick] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getMyProfile()
      .then((p) => {
        if (cancelled) return;
        setNick(p.nickname);
        setAccountName(p.accountName);
        setDraft(p.nickname ?? "");
        const display = p.nickname || p.accountName || "あなた";
        onChanged?.(p.nickname, display);
      })
      .catch(() => {
        /* not signed in or transient */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per mount
  }, []);

  const display = nickname || accountName || "あなた";

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await setNickname({ data: { nickname: draft } });
      setNick(res.nickname);
      setEditing(false);
      const next = res.nickname || accountName || "あなた";
      onChanged?.(res.nickname, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-[11px] text-faint",
          className,
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        ニックネーム読込中…
      </div>
    );
  }

  if (!editing) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <p className={cn("text-[11px] text-muted", compact && "text-[10px]")}>
          表示名:{" "}
          <span className="font-semibold text-fg">{display}</span>
          {nickname ? (
            <span className="ml-1 text-faint">（このアプリ専用）</span>
          ) : (
            <span className="ml-1 text-faint">（連携アカウント名）</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(nickname ?? "");
            setEditing(true);
            setError(null);
          }}
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] text-primary transition hover:bg-primary/10"
        >
          <Pencil className="h-3 w-3" />
          ニックネーム
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-xl border border-primary/25 bg-primary/5 p-2.5",
        className,
      )}
    >
      <label className="block text-[11px] font-medium text-primary">
        このアプリ専用ニックネーム
      </label>
      <p className="text-[10px] leading-relaxed text-faint">
        Google / X の本名は出さず、ここだけの表示名にできます。空にすると連携名に戻ります。
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={accountName ? `例: るー民A（今は ${accountName}）` : "ニックネーム"}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-faint focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
            if (e.key === "Escape") {
              setEditing(false);
              setError(null);
            }
          }}
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 text-xs font-medium text-primary hover:bg-primary/25 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          保存
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs text-muted hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
          取消
        </button>
      </div>
      <p className="text-[10px] text-faint">{draft.trim().length}/24</p>
      {error && (
        <p className="text-[11px] text-danger">{error}</p>
      )}
    </div>
  );
}
