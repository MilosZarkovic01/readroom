import Link from "next/link";

export function ProfileStats({
  userId,
  followerCount,
  followingCount,
  readCount,
}: {
  userId: string;
  followerCount: number;
  followingCount: number;
  readCount: number;
}) {
  return (
    <div className="mt-8 grid grid-cols-3 gap-2 text-center font-sans">
      <Link href={`/u/${userId}/followers`} className="rounded-2xl px-1 py-1">
        <p className="text-2xl font-medium tabular-nums">{followerCount}</p>
        <p className="text-xs text-warm-gray">followers</p>
      </Link>
      <Link href={`/u/${userId}/following`} className="rounded-2xl px-1 py-1">
        <p className="text-2xl font-medium tabular-nums">{followingCount}</p>
        <p className="text-xs text-warm-gray">following</p>
      </Link>
      <div>
        <p className="text-2xl font-medium tabular-nums">{readCount}</p>
        <p className="text-xs text-warm-gray">read</p>
      </div>
    </div>
  );
}
