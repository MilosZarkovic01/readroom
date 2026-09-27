import { PeopleRow } from "@/components/PeopleRow";

export function FollowList({
  users,
  empty,
}: {
  users: { id: string; name: string | null; email: string; following: boolean; isSelf: boolean }[];
  empty: string;
}) {
  if (users.length === 0) {
    return <p className="pt-10 text-center font-sans text-sm text-warm-gray">{empty}</p>;
  }

  return (
    <div className="divide-y divide-beige font-sans xl:grid xl:grid-cols-2 xl:gap-x-10 xl:divide-y-0">
      {users.map((user) => (
        <PeopleRow key={user.id} user={user} following={user.following} showFollow={!user.isSelf} />
      ))}
    </div>
  );
}
