"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import type { PeopleSuggestion } from "@/lib/people-recommendations";
import { displayName } from "@/lib/social";

const PREVIEW_COUNT = 5;

export function PeopleSuggestions({ people }: { people: PeopleSuggestion[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? people : people.slice(0, PREVIEW_COUNT);

  return (
    <section className="rounded-2xl border border-beige bg-cream/60 py-2">
      <h2 className="px-4 pb-1 pt-2 text-base font-medium text-espresso">Suggested for you</h2>
      {people.length === 0 ? (
        <p className="px-4 pb-3 pt-1 text-sm text-warm-gray">No people to recommend yet.</p>
      ) : (
        <ul className={expanded ? "max-h-[calc(100vh-16rem)] overflow-y-auto" : undefined}>
          {visible.map((person) => {
            const name = displayName(person);
            return (
              <li key={person.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/u/${person.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-espresso">{name}</span>
                    <span className="block truncate text-xs text-warm-gray">{person.email}</span>
                  </span>
                </Link>
                <FollowButton userId={person.id} initialFollowing={person.following} size="sm" />
              </li>
            );
          })}
        </ul>
      )}
      {people.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mx-4 mt-1 mb-1 text-sm font-medium text-terracotta"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </section>
  );
}
