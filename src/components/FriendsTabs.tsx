"use client";

import Link from "next/link";
import { useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import type { ActivityItem } from "@/components/ActivityCard";
import { FollowList } from "@/components/FollowList";
import { IconSearch } from "@/components/Icons";
import { PeopleRow } from "@/components/PeopleRow";
import { PeopleSuggestions } from "@/components/PeopleSuggestions";
import type { PeopleSuggestion } from "@/lib/people-recommendations";

function ReaderSearch({ query }: { query: string }) {
  return (
    <form action="/friends" method="get" className="relative">
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray" />
      <input
        name="q"
        defaultValue={query}
        placeholder="Find readers by name or email"
        className="w-full rounded-full border border-beige bg-cream py-2.5 pl-10 pr-4 font-sans text-sm outline-none focus:border-dusty-peach"
      />
    </form>
  );
}

export function FriendsTabs({
  feed,
  people,
  query,
  highlightId,
}: {
  feed: ActivityItem[];
  people: PeopleSuggestion[];
  query: string;
  highlightId?: string;
}) {
  const [tab, setTab] = useState<"activity" | "people">(query ? "people" : "activity");

  return (
    <div className="font-sans lg:mx-auto lg:grid lg:w-full lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-10 xl:gap-12">
      <div className="min-w-0">
        <h1 className="mb-4 text-[32px] font-medium text-espresso lg:mb-6">Friends</h1>
        <div className="flex gap-6 border-b border-beige lg:hidden">
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

        {query ? (
          <section className="hidden lg:block">
            <div className="flex items-baseline justify-between gap-4 border-b border-beige pb-3">
              <h2 className="min-w-0 truncate text-base font-medium text-espresso">
                Readers matching “{query}”
              </h2>
              <Link href="/friends" className="shrink-0 text-sm font-medium text-terracotta">
                Clear search
              </Link>
            </div>
            <FollowList
              users={people.map((person) => ({ ...person, isSelf: false }))}
              empty="No readers match that search."
            />
          </section>
        ) : null}

        <div className={`${tab === "activity" ? "" : "hidden"} ${query ? "lg:hidden" : "lg:block"}`}>
          {feed.length === 0 ? (
            <p className="pt-10 text-center text-sm text-warm-gray">
              Follow readers, or keep an eye on comments and replies on your own posts.
            </p>
          ) : (
            <div>
              {feed.map((item) => (
                <ActivityCard key={item.id} item={item} highlight={item.id === highlightId} />
              ))}
            </div>
          )}
        </div>

        <div className={tab === "people" ? "lg:hidden" : "hidden"}>
          <div className="mt-4">
            <ReaderSearch query={query} />
          </div>
          {people.length === 0 ? (
            <p className="pt-10 text-center text-sm text-warm-gray">
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
      </div>

      <aside className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4 lg:pt-2">
        <ReaderSearch query={query} />
        {query ? null : <PeopleSuggestions people={people} />}
      </aside>
    </div>
  );
}
