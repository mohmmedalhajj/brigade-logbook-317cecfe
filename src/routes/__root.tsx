import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">الصفحة غير موجودة</h2>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "اللواء 35 مشاة" },
      { name: "description", content: "تطبيق إدارة العمليات العسكرية - اللواء 35 مشاة" },
      { name: "theme-color", content: "#1a3a1a" },
      { property: "og:title", content: "اللواء 35 مشاة" },
      { name: "twitter:title", content: "اللواء 35 مشاة" },
      { property: "og:description", content: "تطبيق إدارة العمليات العسكرية - اللواء 35 مشاة" },
      { name: "twitter:description", content: "تطبيق إدارة العمليات العسكرية - اللواء 35 مشاة" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0e2ee46-a3fc-4964-b98a-5ed9dc07cea1/id-preview-76aa8f6f--ea3d5436-db6f-44a2-b585-de0d66f82238.lovable.app-1776636621865.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0e2ee46-a3fc-4964-b98a-5ed9dc07cea1/id-preview-76aa8f6f--ea3d5436-db6f-44a2-b585-de0d66f82238.lovable.app-1776636621865.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    const isEditorPreview =
      host.includes("id-preview--") || host.includes("lovableproject.com");
    let isIframe = false;
    try { isIframe = window.self !== window.top; } catch { isIframe = true; }
    if (isEditorPreview || isIframe) {
      navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Preload all route JS chunks so they are cached by the SW for offline use.
    // We do this by fetching each route HTML in the background which triggers
    // the browser to discover and cache the associated JS/CSS assets.
    const routePaths = ["/", "/login", "/missions", "/missions/new", "/allocations", "/custody", "/stats", "/settings"];
    requestIdleCallback?.(() => {
      for (const p of routePaths) {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = p;
        document.head.appendChild(link);
      }
    }) ?? setTimeout(() => {
      for (const p of routePaths) {
        fetch(p, { cache: "force-cache" }).catch(() => {});
      }
    }, 3000);

    // Pre-cache font files as data URLs for offline PDF generation
    const fontPaths = [
      "/fonts/cairo-400-arabic.woff2",
      "/fonts/cairo-700-arabic.woff2",
      "/fonts/amiri-400-arabic.woff2",
      "/fonts/amiri-700-arabic.woff2",
    ];
    for (const fp of fontPaths) {
      fetch(fp, { cache: "force-cache" }).catch(() => {});
    }
  }, []);
  return <Outlet />;
}
