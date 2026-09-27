import { BadgeIcon, badgeTileClass } from "@/components/BadgeIcon";
import type { UnlockedBadge } from "@/lib/unlock-badges";

function formatUnlocked(date: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function BadgeSection({ badges }: { badges: UnlockedBadge[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-medium">Badges</h2>
      {badges.length === 0 ? (
        <p className="mt-3 text-sm text-warm-gray">No badges yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {badges.map((badge, index) => (
            <li
              key={badge.key}
              className="badge-in flex items-start gap-3 rounded-2xl border border-beige bg-ivory px-3 py-3"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${badgeTileClass(badge.group)}`}
              >
                <span className="badge-icon-in inline-flex">
                  <BadgeIcon badgeKey={badge.key} />
                </span>
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-medium text-espresso">{badge.name}</p>
                <p className="mt-0.5 text-sm text-warm-gray">{badge.description}</p>
                <p className="mt-1 text-xs text-walnut">Unlocked {formatUnlocked(badge.unlockedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
