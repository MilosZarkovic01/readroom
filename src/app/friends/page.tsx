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
      <h1 className="mb-4 font-sans text-[32px] font-medium text-espresso">Friends</h1>
      <FriendsTabs feed={feed} query={query} highlightId={post} people={people} />
    </AppShell>
  );
}
