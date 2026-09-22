import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { displayName } from "@/lib/social";

export function PeopleRow({
  user,
  following,
  showFollow = true,
}: {
  user: { id: string; name: string | null; email: string };
  following: boolean;
  showFollow?: boolean;
}) {
  const name = displayName(user);
  return (
    <div className="flex items-center gap-3 py-3 font-sans">
      <Link href={`/u/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{name}</span>
          <span className="block truncate text-xs text-warm-gray">{user.email}</span>
        </span>
      </Link>
      {showFollow ? <FollowButton userId={user.id} initialFollowing={following} /> : null}
    </div>
  );
}
