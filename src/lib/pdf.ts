// PDF generation using HTML rendering + html2canvas + jsPDF.
// This guarantees correct Arabic shaping and RTL because the browser renders the text natively.
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoUrl from "@/assets/logo.jpg";

interface PDFOptions {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  filename: string;
}

function buildHtml({ title, subtitle, bodyHtml }: PDFOptions): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed; top: -10000px; left: 0;
    width: 794px; padding: 40px;
    background: #ffffff; color: #111;
    font-family: "Cairo", "Segoe UI", Tahoma, Arial, sans-serif;
    direction: rtl; text-align: right;
    font-size: 14px; line-height: 1.8;
  `;
  wrapper.innerHTML = `
    <div style="text-align:center; font-size:22px; font-weight:700; color:#2d4a2d; margin-bottom:16px; font-family: 'Amiri', 'Scheherazade New', 'Traditional Arabic', 'Cairo', serif;">
      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; border-bottom: 3px solid #2d4a2d; padding-bottom: 16px; margin-bottom: 20px;">
      <img src="${logoUrl}" style="width:90px; height:90px; object-fit:contain;" crossorigin="anonymous" />
      <div style="text-align:center; flex:1;">
        <div style="font-size:20px; font-weight:bold; color:#2d4a2d;"><div style="font-size:20px; font-weight:bold; color:#2d4a2d;">اللواء 35 مشاة</div></div>
        <div style="font-size:13px; color:#666; margin-top:4px;">وَمَا رَمَيْتَ إِذْ رَمَيْتَ وَلَكِنَّ اللَّهَ رَمَى</div>
      </div>
      <div style="width:90px;"></div>
    </div>
    <h2 style="text-align:center; color:#2d4a2d; margin: 8px 0 4px;">${title}</h2>
    ${subtitle ? `<div style="text-align:center; color:#666; margin-bottom:16px;">${subtitle}</div>` : ""}
    <div>${bodyHtml}</div>
    <div style="margin-top:32px; padding-top:12px; border-top:1px solid #ccc; text-align:center; color:#888; font-size:12px;">
      تم الإنشاء: ${new Date().toLocaleString("ar-EG")}
    </div>
  `;
  return wrapper;
}

async function loadAsDataURL(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

// Persistent font cache using IndexedDB so fonts survive page reloads offline
const memoryFontCache: Record<string, string> = {};

async function getIDBFontCache(): Promise<Record<string, string>> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("soqour-font-cache", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("fonts", { keyPath: "path" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("fonts", "readonly");
    const store = tx.objectStore("fonts");
    const all = await new Promise<any[]>((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    const out: Record<string, string> = {};
    for (const item of all) {
      out[item.path] = item.dataUrl;
    }
    return out;
  } catch {
    return {};
  }
}

async function saveIDBFont(path: string, dataUrl: string) {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("soqour-font-cache", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("fonts", { keyPath: "path" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("fonts", "readwrite");
    tx.objectStore("fonts").put({ path, dataUrl });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    db.close();
  } catch {
    // Ignore storage errors
  }
}

async function getFontDataURL(path: string): Promise<string> {
  // Check memory cache first
  if (memoryFontCache[path]) return memoryFontCache[path];

  // Try IndexedDB persistent cache
  const idbCache = await getIDBFontCache();
  if (idbCache[path]) {
    memoryFontCache[path] = idbCache[path];
    return idbCache[path];
  }

  // Fetch from network/SW cache
  try {
    const dataUrl = await loadAsDataURL(path);
    if (dataUrl && dataUrl.startsWith("data:")) {
      memoryFontCache[path] = dataUrl;
      await saveIDBFont(path, dataUrl);
    }
    return dataUrl;
  } catch {
    return path;
  }
}

// Pre-cache fonts proactively (call on app startup)
export async function preCacheFonts() {
  const paths = [
    "/fonts/cairo-400-arabic.woff2",
    "/fonts/cairo-700-arabic.woff2",
    "/fonts/amiri-400-arabic.woff2",
    "/fonts/amiri-700-arabic.woff2",
  ];
  await Promise.allSettled(paths.map((p) => getFontDataURL(p)));
}

export async function exportPDF(opts: PDFOptions) {
  // Render inside a sandboxed iframe so the project's CSS (which uses oklch()
  // color tokens) cannot leak into html2canvas — html2canvas cannot parse oklch.
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed; top:-10000px; left:0; width:794px; height:10px; border:0;";
  document.body.appendChild(iframe);

  // Pre-load fonts as data URLs for offline support
  const [cairo400, cairo700, amiri400, amiri700] = await Promise.all([
    getFontDataURL("/fonts/cairo-400-arabic.woff2"),
    getFontDataURL("/fonts/cairo-700-arabic.woff2"),
    getFontDataURL("/fonts/amiri-400-arabic.woff2"),
    getFontDataURL("/fonts/amiri-700-arabic.woff2"),
  ]);

  try {
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <style>
        @font-face { font-family:"Cairo"; font-weight:400; src:url("${cairo400}") format("woff2"); }
        @font-face { font-family:"Cairo"; font-weight:700; src:url("${cairo700}") format("woff2"); }
        @font-face { font-family:"Amiri"; font-weight:400; src:url("${amiri400}") format("woff2"); }
        @font-face { font-family:"Amiri"; font-weight:700; src:url("${amiri700}") format("woff2"); }
        *,*::before,*::after{box-sizing:border-box;}
        html,body{margin:0;padding:0;background:#ffffff;color:#111;font-family:"Cairo","Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;}
      </style>
    </head><body></body></html>`);
    doc.close();

    const wrapper = buildHtml(opts);
    wrapper.style.position = "static";
    wrapper.style.top = "auto";

    // Ensure logo is embedded as data URL so it loads inside the iframe
    const logoDataUrl = await loadAsDataURL(logoUrl);
    const img = wrapper.querySelector("img");
    if (img) img.src = logoDataUrl;

    doc.body.appendChild(wrapper);

    // Wait for fonts inside the iframe + generous settle delay for offline
    if ((doc as any).fonts?.ready) {
      try {
        await Promise.race([
          (doc as any).fonts.ready,
          new Promise((r) => setTimeout(r, 3000)), // timeout after 3s
        ]);
      } catch {}
    }

    // Wait for ALL <img> elements inside the wrapper to finish loading.
    // With up to 12 attached images, html2canvas may otherwise capture
    // empty frames before the data: URLs decode.
    const imgs = Array.from(wrapper.querySelectorAll("img")) as HTMLImageElement[];
    await Promise.all(
      imgs.map(
        (im) =>
          new Promise<void>((resolve) => {
            if (im.complete && im.naturalWidth > 0) return resolve();
            im.addEventListener("load", () => resolve(), { once: true });
            im.addEventListener("error", () => resolve(), { once: true });
            // Hard timeout so a single broken image cannot block export.
            setTimeout(resolve, 5000);
          })
      )
    );

    // Extra settle time for font/image rendering
    await new Promise((r) => setTimeout(r, 500));

    // Resize iframe to fit content for accurate capture
    const contentHeight = wrapper.scrollHeight + 40;
    iframe.style.height = `${contentHeight}px`;

    // Wait for layout to settle after resize
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 794,
      windowHeight: contentHeight,
      // Force the iframe's window/document for correct rendering context
      ...(iframe.contentWindow ? { windowWidth: 794, windowHeight: contentHeight } : {}),
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(opts.filename);
  } catch (err) {
    console.error("PDF export failed:", err);
    throw err;
  } finally {
    document.body.removeChild(iframe);
  }
}

export function htmlEscape(s: any): string {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function htmlTable(headers: string[], rows: any[][]): string {
  return `
    <table style="width:100%; border-collapse:collapse; margin:8px 0;">
      <thead>
        <tr>
          ${headers.map((h) => `<th style="border:1px solid #2d4a2d; background:#2d4a2d; color:#fff; padding:8px; text-align:right;">${htmlEscape(h)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `<tr style="background:${i % 2 ? "#f5f7f5" : "#fff"};">
            ${r.map((c) => `<td style="border:1px solid #cfd8cf; padding:8px; text-align:right; vertical-align:top;">${htmlEscape(c)}</td>`).join("")}
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function htmlKV(pairs: [string, any][]): string {
  return `
    <table style="width:100%; border-collapse:collapse; margin:8px 0;">
      <tbody>
        ${pairs
          .map(
            ([k, v]) => `<tr>
          <td style="border:1px solid #cfd8cf; background:#eef2ee; padding:8px; width:35%; font-weight:bold;">${htmlEscape(k)}</td>
          <td style="border:1px solid #cfd8cf; padding:8px;">${htmlEscape(v)}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}
