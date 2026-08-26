import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && user) {
    return <Navigate to="/" />;
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="space-y-1.5 text-center">
          <p className="text-xs font-medium tracking-wide text-primary">
            るーちゃんアーカイブ
          </p>
          <h1 className="font-display text-xl font-semibold tracking-wide">
            ID連携してコメント
          </h1>
          <p className="text-xs leading-relaxed text-muted">
            Google または X でログインすると、各投稿にコメント・ツリー返信ができます。
          </p>
        </div>

        {authEnabled ? (
          <div className="space-y-2.5">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setError(null);
                  setBusy(p.providerId);
                  void signIn(p.providerId, {
                    callbackURL:
                      typeof window !== "undefined"
                        ? `${window.location.origin}/`
                        : "/",
                    errorCallbackURL:
                      typeof window !== "undefined"
                        ? `${window.location.origin}/login`
                        : "/login",
                  })
                    .catch((err: unknown) => {
                      setError(
                        err instanceof Error ? err.message : "ログインに失敗しました",
                      );
                    })
                    .finally(() => setBusy(null));
                }}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-fg transition hover:border-primary/40 hover:bg-surface-hover disabled:opacity-60"
              >
                {busy === p.providerId ? "接続中…" : `${p.label} で続ける`}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted">
            サインインは無効化されています（開発モード）。
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <Link
          to="/"
          className="block text-center text-xs text-muted transition hover:text-primary"
        >
          アーカイブに戻る
        </Link>
      </div>
    </main>
  );
}
