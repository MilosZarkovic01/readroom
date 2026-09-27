import type { ReactNode } from "react";
import type { BadgeKey } from "@/lib/badges";

function Mark({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-6 w-6"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function BadgeIcon({ badgeKey, className }: { badgeKey: BadgeKey; className?: string }) {
  switch (badgeKey) {
    case "first_chapter":
      return (
        <Mark className={className}>
          <path d="M7 5h8.5A2.5 2.5 0 0 1 18 7.5V19H8.5A1.5 1.5 0 0 1 7 17.5V5Z" strokeLinejoin="round" />
          <path d="M7 5A2 2 0 0 0 5 7v10.5" strokeLinecap="round" />
        </Mark>
      );
    case "getting_started":
      return (
        <Mark className={className}>
          <path d="M6 18V7l5 2 5-2v11l-5 2-5-2Z" strokeLinejoin="round" />
          <path d="M11 9v11" />
        </Mark>
      );
    case "well_read":
      return (
        <Mark className={className}>
          <path d="M5 7h4v11H5zM10.5 5h4v13h-4zM16 8h3.5v10H16z" strokeLinejoin="round" />
        </Mark>
      );
    case "bookworm":
      return (
        <Mark className={className}>
          <path d="M5 16c2-4 5-6 7-6s5 2 7 6" strokeLinecap="round" />
          <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
        </Mark>
      );
    case "avid_reader":
      return (
        <Mark className={className}>
          <path d="M12 5 14 9.5 19 10l-3.5 3 1 4.8L12 15.6 7.5 17.8l1-4.8L5 10l5-.5L12 5Z" strokeLinejoin="round" />
        </Mark>
      );
    case "bibliophile":
      return (
        <Mark className={className}>
          <path d="M12 4.5 14.2 9l4.8.5-3.6 3.2 1.1 4.8L12 15.3 7.5 17.5l1.1-4.8L5 9.5 9.8 9 12 4.5Z" strokeLinejoin="round" />
          <path d="M12 11v4" strokeLinecap="round" />
        </Mark>
      );
    case "first_impression":
      return (
        <Mark className={className}>
          <path d="m12 4.8 1.6 3.6 4 .4-3 2.7.9 3.9L12 13.6 8.5 15.4l.9-3.9-3-2.7 4-.4L12 4.8Z" strokeLinejoin="round" />
        </Mark>
      );
    case "first_review":
      return (
        <Mark className={className}>
          <path d="M6 6h12v9H10l-4 3V6Z" strokeLinejoin="round" />
          <path d="M9 10h6M9 13h3.5" strokeLinecap="round" />
        </Mark>
      );
    case "reviewer":
      return (
        <Mark className={className}>
          <path d="M7 5h10v12l-5-2.2L7 17V5Z" strokeLinejoin="round" />
          <path d="M10 9h4" strokeLinecap="round" />
        </Mark>
      );
    case "critic":
      return (
        <Mark className={className}>
          <circle cx="10" cy="10" r="4.2" />
          <path d="m13.2 13.2 5 5" strokeLinecap="round" />
        </Mark>
      );
    case "literary_voice":
      return (
        <Mark className={className}>
          <path d="M8 16c0-3 2-5 4-5s4 2 4 5" strokeLinecap="round" />
          <path d="M8 16H6.5A2.5 2.5 0 0 1 4 13.5V12h4v4ZM16 16h1.5A2.5 2.5 0 0 0 20 13.5V12h-4v4Z" strokeLinejoin="round" />
        </Mark>
      );
    case "book_critic":
      return (
        <Mark className={className}>
          <path d="M5 7h14v11H5z" strokeLinejoin="round" />
          <path d="M8 10h8M8 13h5" strokeLinecap="round" />
        </Mark>
      );
    case "thoughtful_reader":
      return (
        <Mark className={className}>
          <circle cx="12" cy="9" r="3.2" />
          <path d="M7 18c1-2.4 2.8-3.6 5-3.6s4 1.2 5 3.6" strokeLinecap="round" />
        </Mark>
      );
    case "the_collector":
      return (
        <Mark className={className}>
          <path d="M6 18V8l6-3 6 3v10H6Z" strokeLinejoin="round" />
          <path d="M12 5v13" />
        </Mark>
      );
    case "long_journey":
      return (
        <Mark className={className}>
          <path d="M5 17h14M7 17 10 8h4l3 9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 12h4" strokeLinecap="round" />
        </Mark>
      );
    case "dedicated_reviewer":
      return (
        <Mark className={className}>
          <path d="M7 4.5h10v15l-5-2.4-5 2.4v-15Z" strokeLinejoin="round" />
          <path d="M10 9h4M10 12h2.5" strokeLinecap="round" />
        </Mark>
      );
    case "book_marathon":
      return (
        <Mark className={className}>
          <circle cx="12" cy="12" r="7.2" />
          <path d="M12 8.2V12l2.6 1.6" strokeLinecap="round" />
        </Mark>
      );
    case "page_turner":
      return (
        <Mark className={className}>
          <path d="M7 6h7.5A2.5 2.5 0 0 1 17 8.5V18H8.2A1.2 1.2 0 0 1 7 16.8V6Z" strokeLinejoin="round" />
          <path d="M17 8.5h1.2A1.3 1.3 0 0 1 19.5 9.8V16" strokeLinecap="round" />
        </Mark>
      );
  }
}

export function badgeTileClass(group: "reading" | "review" | "special") {
  if (group === "reading") return "bg-sage/15 text-walnut";
  if (group === "review") return "bg-dusty-peach/35 text-deep-brown";
  return "bg-beige text-espresso";
}
