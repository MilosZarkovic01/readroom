"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import type { ActivityItem } from "@/components/ActivityCard";
import { PeopleRow } from "@/components/PeopleRow";

export function FriendsTabs({
  feed,
  people,
  query,
  highlightId,
}: {
  feed: ActivityItem[];
  people: { id: string; name: string | null; email: string; following: boolean }[];
  query: string;
  highlightId?: string;
}) {
  const [tab, setTab] = useState<"activity" | "people">(query ? "people" : "activity");

  return (
    <div className="font-sans">
      <div className="flex gap-6 border-b border-beige font-sans">
        {(
          [
            ["activity", "Activity"],
            ["people", "People"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px pb-2 text-sm ${
              tab === id ? "border-b-2 border-espresso font-medium text-espresso" : "text-warm-gray"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "activity" ? (
        feed.length === 0 ? (
          <p className="pt-10 text-center font-sans text-sm text-warm-gray">
            Follow readers, or keep an eye on comments and replies on your own posts.
          </p>
        ) : (
          <div>
            {feed.map((item) => (
              <ActivityCard key={item.id} item={item} highlight={item.id === highlightId} />
            ))}
          </div>
        )
      ) : (
        <div>
          <form action="/friends" method="get" className="mt-4">
            <input
              name="q"
              defaultValue={query}
              placeholder="Find readers by name or email"
              className="w-full rounded-full border border-beige bg-cream px-4 py-2.5 font-sans text-sm outline-none"
            />
          </form>
          {people.length === 0 ? (
            <p className="pt-10 text-center font-sans text-sm text-warm-gray">
              {query ? "No readers match that search." : "No people to recommend yet."}
            </p>
          ) : (
            <div className="mt-2 divide-y divide-beige">
              {people.map((person) => (
                <PeopleRow key={person.id} user={person} following={person.following} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
