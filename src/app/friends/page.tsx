import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { FriendsTabs } from "@/components/FriendsTabs";
import { getFriendsFeed } from "@/lib/feed";
import { getPeopleSuggestions } from "@/lib/people-recommendations";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; post?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { q, post } = await searchParams;
  const query = q?.trim() ?? "";

  const [feed, people] = await Promise.all([
    getFriendsFeed(session.user.id),
    getPeopleSuggestions(session.user.id, query),
  ]);

  return (
    <AppShell>
      <div className="mb-4 lg:mx-auto lg:mb-6 lg:flex lg:w-full lg:max-w-3xl lg:items-center lg:gap-6">
        <h1 className="font-sans text-[32px] font-medium text-espresso lg:shrink-0">Friends</h1>
        <form action="/friends" method="get" className="hidden lg:block lg:min-w-0 lg:flex-1">
          <input
            name="q"
            defaultValue={query}
            placeholder="Find readers by name or email"
            className="w-full rounded-full border border-beige bg-cream px-4 py-2.5 font-sans text-sm outline-none"
          />
        </form>
      </div>
      <FriendsTabs feed={feed} query={query} highlightId={post} people={people} />
    </AppShell>
  );
}
