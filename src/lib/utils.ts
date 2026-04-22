import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format "HH:MM" (24h) into Arabic 12-hour with صباحاً/مساءً
export function formatTimeAr(t?: string): string {
  if (!t) return "";
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = h >= 12 ? "مساءً" : "صباحاً";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${suffix}`;
}
