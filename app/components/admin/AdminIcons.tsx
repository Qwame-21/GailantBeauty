import type { SVGProps } from "react";

export type AdminIconName = "bag" | "bell" | "check" | "truck" | "card" | "star" | "warning" | "search" | "chevron" | "eye" | "eyeOff" | "whatsapp" | "sparkle";

export function AdminIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AdminIconName }) {
  const common = { viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props };
  if (name === "bag") return <svg {...common}><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
  if (name === "bell") return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if (name === "check") return <svg {...common} strokeWidth={2}><path d="m5 12 4 4L19 6"/></svg>;
  if (name === "truck") return <svg {...common}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  if (name === "card") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 10h18M7 15h4"/></svg>;
  if (name === "star") return <svg {...common} fill="currentColor" stroke="none"><path d="m12 2.5 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.31l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.5Z"/></svg>;
  if (name === "warning") return <svg {...common}><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.5h.01"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
  if (name === "chevron") return <svg {...common}><path d="m7 9 5 5 5-5"/></svg>;
  if (name === "eye") return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
  if (name === "eyeOff") return <svg {...common}><path d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.2 3M6.5 6.5C3.6 8.4 2 12 2 12s3.5 6 10 6c1.2 0 2.3-.2 3.3-.6"/></svg>;
  if (name === "whatsapp") return <svg {...common}><path d="M20 11.7A8 8 0 0 1 8.2 18.8L4 20l1.2-4.1A8 8 0 1 1 20 11.7Z"/><path d="M8.5 8.2c.5 3.2 2.2 5 5.4 6.1l1.3-1.3"/></svg>;
  return <svg {...common}><path d="M12 2l1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z"/></svg>;
}
