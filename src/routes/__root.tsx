import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth/provider";

const APP_NAME = "るーちゃんアーカイブ";
const APP_DESCRIPTION =
  "@Miru620_fandead の一日一回るーちゃんツイートから集めた潤羽るしあ関連スクショ・配信記録アーカイブ。ID連携コメント対応。";
const host =
  (import.meta.env.VITE_PUBLIC_HOSTNAME as string | undefined) ||
  "russia.vtuder.online";
const ogImage = `https://${host}/og.jpg`;
const ogUrl = `https://${host}/`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: `${APP_NAME} — Miru620 メディア回収` },
      { name: "description", content: APP_DESCRIPTION },
      { name: "theme-color", content: "#0a0f0e" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "ja_JP" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: `${APP_NAME} — Miru620 メディア回収` },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:url", content: ogUrl },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:type", content: "image/jpeg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${APP_NAME} — Miru620 メディア回収` },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Shippori+Mincho:wght@500;600;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="bg-mesh min-h-dvh antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
