import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  addComment,
  deleteComment,
  listComments,
  type CommentRow,
} from "@/server/comments";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { NicknameEditor } from "@/components/nickname-editor";
import { MessageCircle, Reply, Trash2, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TreeNode = CommentRow & { children: TreeNode[] };

function buildTree(rows: CommentRow[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const r of rows) map.set(r.id, { ...r, children: [] });
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CommentSection({ entryId }: { entryId: string }) {
  const { user, isPending } = useCurrentUserState();
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("あなた");

  const reload = useCallback(async () => {
    setError(null);
    try {
      const data = await listComments({ data: entryId });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "コメントの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    setLoading(true);
    setRows([]);
    setReplyTo(null);
    setDraft("");
    void reload();
  }, [entryId, reload]);

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user?.displayName]);

  const tree = useMemo(() => buildTree(rows), [rows]);

  const submit = async () => {
    if (!user || submitting) return;
    const body = draft.trim();
    if (!body) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await addComment({
        data: {
          entryId,
          body,
          parentId: replyTo?.id ?? null,
        },
      });
      setRows((prev) => [...prev, created]);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "投稿に失敗しました";
      if (msg === "Unauthorized") {
        setError("ログインが必要です");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!user || deletingId) return;
    if (!window.confirm("このコメントを削除しますか？（返信もまとめて消えます）")) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await deleteComment({ data: { id } });
      const toDrop = new Set<string>();
      const byParent = new Map<string | null, string[]>();
      for (const r of rows) {
        const key = r.parentId;
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key)!.push(r.id);
      }
      const walk = (cid: string) => {
        toDrop.add(cid);
        for (const child of byParent.get(cid) ?? []) walk(child);
      };
      walk(id);
      setRows((prev) => prev.filter((r) => !toDrop.has(r.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-5 border-t border-border/80 pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="inline-flex items-center gap-1.5 font-display text-sm font-semibold tracking-wide">
          <MessageCircle className="h-4 w-4 text-primary" />
          コメント
          <span className="text-xs font-normal text-muted">({rows.length})</span>
        </h4>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          読み込み中…
        </p>
      ) : tree.length === 0 ? (
        <p className="text-xs text-muted">まだコメントはありません。最初の一言をどうぞ。</p>
      ) : (
        <ul className="space-y-3">
          {tree.map((node) => (
            <CommentNode
              key={node.id}
              node={node}
              depth={0}
              currentUserId={user?.id ?? null}
              deletingId={deletingId}
              onReply={(c) => {
                setReplyTo(c);
              }}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      <div className="mt-4 space-y-2">
        {isPending ? (
          <div className="h-20 animate-pulse rounded-xl bg-surface/60" />
        ) : user ? (
          <>
            <NicknameEditor
              compact
              onChanged={(_nick, display) => setDisplayName(display)}
            />
            {replyTo && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-[11px] text-primary">
                <span className="truncate">
                  @{replyTo.authorName} へ返信
                </span>
                <button
                  type="button"
                  className="shrink-0 underline-offset-2 hover:underline"
                  onClick={() => setReplyTo(null)}
                >
                  キャンセル
                </button>
              </div>
            )}
            <div className="flex items-start gap-2">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="mt-1 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/30">
                  {displayName.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={
                    replyTo
                      ? `${replyTo.authorName} さんへ返信…`
                      : "この配信・スクショへのメモや感想を…"
                  }
                  className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-faint">
                    {draft.length}/2000 · {displayName}
                  </span>
                  <button
                    type="button"
                    disabled={submitting || !draft.trim()}
                    onClick={() => void submit()}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/25 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {replyTo ? "返信する" : "投稿する"}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface/40 px-3 py-4 text-center">
            <p className="text-xs text-muted">
              コメント・返信には ID 連携（Google / X）が必要です
            </p>
            <Link
              to="/login"
              className="mt-2 inline-flex min-h-10 items-center rounded-full border border-primary/40 bg-primary/15 px-4 text-xs font-medium text-primary hover:bg-primary/25"
            >
              ログインする
            </Link>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-[11px] text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function CommentNode({
  node,
  depth,
  currentUserId,
  deletingId,
  onReply,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  currentUserId: string | null;
  deletingId: string | null;
  onReply: (c: CommentRow) => void;
  onDelete: (id: string) => void;
}) {
  const isOwn = currentUserId != null && node.userId === currentUserId;
  return (
    <li className={cn(depth > 0 && "ml-3 border-l border-border/70 pl-3 sm:ml-4 sm:pl-4")}>
      <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2.5">
        <div className="flex items-start gap-2">
          {node.authorImage ? (
            <img
              src={node.authorImage}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg-elevated text-[10px] font-semibold text-muted ring-1 ring-border">
              {node.authorName.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-xs font-semibold text-fg">{node.authorName}</span>
              <span className="text-[10px] text-faint">{formatWhen(node.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-muted">
              {node.body}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onReply(node)}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted transition hover:bg-surface-hover hover:text-primary"
              >
                <Reply className="h-3 w-3" />
                返信
              </button>
              {isOwn && (
                <button
                  type="button"
                  disabled={deletingId === node.id}
                  onClick={() => onDelete(node.id)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  削除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="mt-2 space-y-2">
          {node.children.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              deletingId={deletingId}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
