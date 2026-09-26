import { prisma } from "@/lib/prisma";
import { scorePeopleCandidate } from "@/lib/people-score";
import { parseSubjects } from "@/lib/subjects";

const LIMIT = 40;
const CANDIDATE_CAP = 80;
const RECENT_MS = 14 * 24 * 60 * 60 * 1000;

export type PeopleSuggestion = {
  id: string;
  name: string | null;
  email: string;
  following: boolean;
};

type ScoredPerson = PeopleSuggestion & { score: number };

export async function getPeopleSuggestions(
  viewerId: string,
  query = "",
): Promise<PeopleSuggestion[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = following.map((row) => row.followingId);
  const followingSet = new Set(followingIds);

  if (query) {
    const users = await prisma.user.findMany({
      where: {
        id: { not: viewerId },
        OR: [{ name: { contains: query } }, { email: { contains: query } }],
      },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    });
    return users.map((user) => ({
      ...user,
      following: followingSet.has(user.id),
    }));
  }

  const exclude = [viewerId, ...followingIds];
  const myEntries = await prisma.libraryEntry.findMany({
    where: { userId: viewerId },
    select: {
      bookId: true,
      rating: true,
      status: true,
      updatedAt: true,
      book: { select: { subjects: true } },
    },
  });
  const myBookIds = [...new Set(myEntries.map((entry) => entry.bookId))];
  const myRatings = new Map(
    myEntries
      .filter((entry) => entry.rating != null)
      .map((entry) => [entry.bookId, entry.rating as number]),
  );
  const mySubjects = new Set(
    myEntries.flatMap((entry) => parseSubjects(entry.book.subjects).map((subject) => subject.toLowerCase())),
  );

  const [circleFollows, followsViewer, fof, sharedEntries, comments, likes, recentEntries] =
    await Promise.all([
      prisma.follow.findMany({
        where: {
          OR: [
            { followerId: viewerId },
            { followingId: viewerId },
          ],
        },
        select: { followerId: true, followingId: true },
      }),
      prisma.follow.findMany({
        where: { followingId: viewerId, followerId: { notIn: exclude } },
        select: { followerId: true },
      }),
      prisma.follow.findMany({
        where: {
          followerId: { in: followingIds.length ? followingIds : ["__none__"] },
          followingId: { notIn: exclude },
        },
        select: { followingId: true },
      }),
      myBookIds.length
        ? prisma.libraryEntry.findMany({
            where: { bookId: { in: myBookIds }, userId: { notIn: exclude } },
            select: { userId: true, bookId: true, rating: true },
          })
        : Promise.resolve([]),
      myBookIds.length
        ? prisma.activityComment.findMany({
            where: { userId: { notIn: exclude }, entry: { bookId: { in: myBookIds } } },
            select: { userId: true },
          })
        : Promise.resolve([]),
      myBookIds.length
        ? prisma.activityLike.findMany({
            where: { userId: { notIn: exclude }, entry: { bookId: { in: myBookIds } } },
            select: { userId: true },
          })
        : Promise.resolve([]),
      prisma.libraryEntry.findMany({
        where: { userId: { notIn: exclude } },
        orderBy: { updatedAt: "desc" },
        take: 200,
        select: { userId: true },
      }),
    ]);

  const circle = new Set<string>();
  for (const row of circleFollows) {
    if (row.followerId !== viewerId) circle.add(row.followerId);
    if (row.followingId !== viewerId) circle.add(row.followingId);
  }

  const candidateIds = new Set<string>();
  for (const row of followsViewer) candidateIds.add(row.followerId);
  for (const row of fof) candidateIds.add(row.followingId);
  for (const row of sharedEntries) candidateIds.add(row.userId);
  for (const row of comments) candidateIds.add(row.userId);
  for (const row of likes) candidateIds.add(row.userId);
  for (const row of recentEntries) candidateIds.add(row.userId);

  const ids = [...candidateIds].filter((id) => id !== viewerId && !followingSet.has(id)).slice(0, CANDIDATE_CAP);
  if (!ids.length) return [];

  const [users, theirFollows, theirEntries] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    }),
    prisma.follow.findMany({
      where: {
        OR: [
          { followerId: { in: ids }, followingId: { in: [viewerId, ...circle] } },
          ...([...circle].length
            ? [{ followingId: { in: ids }, followerId: { in: [...circle] } }]
            : []),
        ],
      },
      select: { followerId: true, followingId: true },
    }),
    prisma.libraryEntry.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        bookId: true,
        rating: true,
        status: true,
        updatedAt: true,
        book: { select: { subjects: true } },
      },
    }),
  ]);

  const followsViewerSet = new Set(followsViewer.map((row) => row.followerId));
  const fofSet = new Set(fof.map((row) => row.followingId));
  const interactionCounts = new Map<string, number>();
  for (const row of [...comments, ...likes]) {
    interactionCounts.set(row.userId, (interactionCounts.get(row.userId) ?? 0) + 1);
  }

  const mutual = new Map<string, Set<string>>();
  for (const row of theirFollows) {
    const other = ids.includes(row.followerId) ? row.followerId : row.followingId;
    const connection = other === row.followerId ? row.followingId : row.followerId;
    if (!circle.has(connection) && connection !== viewerId) continue;
    if (!mutual.has(other)) mutual.set(other, new Set());
    if (connection !== other) mutual.get(other)!.add(connection);
  }

  const entriesByUser = new Map<string, typeof theirEntries>();
  for (const entry of theirEntries) {
    const list = entriesByUser.get(entry.userId) ?? [];
    list.push(entry);
    entriesByUser.set(entry.userId, list);
  }

  const ranked: ScoredPerson[] = users.map((user) => {
    const entries = entriesByUser.get(user.id) ?? [];
    const shared = entries.filter((entry) => myRatings.has(entry.bookId) || myBookIds.includes(entry.bookId));
    const closeRatings = shared.filter((entry) => {
      const mine = myRatings.get(entry.bookId);
      return mine != null && entry.rating != null && Math.abs(mine - entry.rating) <= 1;
    }).length;
    const subjects = new Set(
      entries.flatMap((entry) => parseSubjects(entry.book.subjects).map((subject) => subject.toLowerCase())),
    );
    let sharedSubjects = 0;
    for (const subject of subjects) {
      if (mySubjects.has(subject)) sharedSubjects += 1;
    }
    const latest = entries.reduce((max, entry) => (entry.updatedAt > max ? entry.updatedAt : max), new Date(0));

    return {
      ...user,
      following: false,
      score: scorePeopleCandidate({
        mutualConnections: mutual.get(user.id)?.size ?? 0,
        followsViewer: followsViewerSet.has(user.id),
        friendOfFriend: fofSet.has(user.id),
        sharedBooks: shared.length,
        closeRatings,
        sharedSubjects,
        sharedInteractions: interactionCounts.get(user.id) ?? 0,
        readingActivity: entries.filter((entry) => entry.status === "READ" || entry.status === "READING").length,
        recentlyActive: latest.getTime() > Date.now() - RECENT_MS,
      }),
    };
  });

  ranked.sort((left, right) => right.score - left.score || left.email.localeCompare(right.email));
  const seen = new Set<string>();
  return ranked
    .filter((person) => {
      if (seen.has(person.id)) return false;
      seen.add(person.id);
      return true;
    })
    .slice(0, LIMIT)
    .map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      following: person.following,
    }));
}
