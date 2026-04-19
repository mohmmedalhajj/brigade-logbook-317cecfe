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
      { title: "صقور اللواء الأول مغاوير" },
      { name: "description", content: "تطبيق إدارة العمليات العسكرية - صقور اللواء الأول مغاوير" },
      { name: "theme-color", content: "#1a3a1a" },
      { property: "og:title", content: "صقور اللواء الأول مغاوير" },
      { name: "twitter:title", content: "صقور اللواء الأول مغاوير" },
      { property: "og:description", content: "تطبيق إدارة العمليات العسكرية - صقور اللواء الأول مغاوير" },
      { name: "twitter:description", content: "تطبيق إدارة العمليات العسكرية - صقور اللواء الأول مغاوير" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0e2ee46-a3fc-4964-b98a-5ed9dc07cea1/id-preview-76aa8f6f--ea3d5436-db6f-44a2-b585-de0d66f82238.lovable.app-1776636621865.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f0e2ee46-a3fc-4964-b98a-5ed9dc07cea1/id-preview-76aa8f6f--ea3d5436-db6f-44a2-b585-de0d66f82238.lovable.app-1776636621865.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "icon", href: "/logo.jpg" },
      { rel: "apple-touch-icon", href: "/logo.jpg" },
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
    const isPreview =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com") ||
      window.location.hostname.includes("lovable.app");
    let isIframe = false;
    try { isIframe = window.self !== window.top; } catch { isIframe = true; }
    if (isPreview || isIframe) {
      navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return <Outlet />;
}
