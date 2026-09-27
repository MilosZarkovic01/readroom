import type { CSSProperties } from "react";

const PIECES = [
  { left: "4%", delay: "0ms", duration: "1.15s", color: "var(--dusty-peach)", wide: true, x: "-22px", spin: "48deg" },
  { left: "10%", delay: "55ms", duration: "1.24s", color: "var(--walnut)", wide: false, x: "-16px", spin: "-40deg" },
  { left: "16%", delay: "140ms", duration: "1.1s", color: "var(--beige)", wide: false, x: "-14px", spin: "28deg" },
  { left: "22%", delay: "40ms", duration: "1.28s", color: "var(--sage)", wide: false, x: "-8px", spin: "-36deg" },
  { left: "28%", delay: "95ms", duration: "1.2s", color: "var(--terracotta)", wide: true, x: "-6px", spin: "54deg" },
  { left: "34%", delay: "175ms", duration: "1.16s", color: "var(--dusty-peach)", wide: false, x: "2px", spin: "-24deg" },
  { left: "36%", delay: "80ms", duration: "1.2s", color: "var(--beige)", wide: true, x: "4px", spin: "62deg" },
  { left: "42%", delay: "30ms", duration: "1.3s", color: "var(--sage)", wide: true, x: "-2px", spin: "-58deg" },
  { left: "48%", delay: "120ms", duration: "1.18s", color: "var(--walnut)", wide: false, x: "6px", spin: "34deg" },
  { left: "50%", delay: "20ms", duration: "1.32s", color: "var(--terracotta)", wide: false, x: "0px", spin: "-52deg" },
  { left: "56%", delay: "150ms", duration: "1.22s", color: "var(--dusty-peach)", wide: true, x: "8px", spin: "44deg" },
  { left: "62%", delay: "70ms", duration: "1.18s", color: "var(--walnut)", wide: true, x: "10px", spin: "38deg" },
  { left: "66%", delay: "200ms", duration: "1.12s", color: "var(--beige)", wide: false, x: "14px", spin: "-48deg" },
  { left: "72%", delay: "90ms", duration: "1.26s", color: "var(--sage)", wide: true, x: "12px", spin: "26deg" },
  { left: "74%", delay: "110ms", duration: "1.26s", color: "var(--dusty-peach)", wide: false, x: "16px", spin: "-44deg" },
  { left: "80%", delay: "160ms", duration: "1.14s", color: "var(--terracotta)", wide: true, x: "18px", spin: "-30deg" },
  { left: "86%", delay: "45ms", duration: "1.2s", color: "var(--beige)", wide: false, x: "20px", spin: "50deg" },
  { left: "88%", delay: "50ms", duration: "1.22s", color: "var(--sage)", wide: true, x: "22px", spin: "56deg" },
  { left: "94%", delay: "130ms", duration: "1.18s", color: "var(--walnut)", wide: false, x: "24px", spin: "-32deg" },
  { left: "12%", delay: "220ms", duration: "1.08s", color: "var(--terracotta)", wide: true, x: "-20px", spin: "20deg" },
  { left: "58%", delay: "185ms", duration: "1.14s", color: "var(--dusty-peach)", wide: false, x: "9px", spin: "-62deg" },
] as const;

export function BadgeConfetti({ burstKey }: { burstKey: string }) {
  return (
    <span key={burstKey} className="badge-confetti pointer-events-none absolute inset-x-[-12px] -top-4 h-32" aria-hidden>
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className={`badge-confetti-piece absolute top-0 rounded-[1px] ${piece.wide ? "h-1.5 w-2.5" : "h-1.5 w-1.5 rounded-full"}`}
          style={
            {
              left: piece.left,
              background: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              "--x": piece.x,
              "--spin": piece.spin,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
