export function scorePeopleCandidate(input: {
  mutualConnections: number;
  followsViewer: boolean;
  friendOfFriend: boolean;
  sharedBooks: number;
  closeRatings: number;
  sharedSubjects: number;
  sharedInteractions: number;
  readingActivity: number;
  recentlyActive: boolean;
}): number {
  return (
    Math.min(input.mutualConnections, 8) * 20 +
    (input.followsViewer ? 14 : 0) +
    (input.friendOfFriend ? 8 : 0) +
    Math.min(input.sharedBooks, 12) * 7 +
    Math.min(input.closeRatings, 8) * 4 +
    Math.min(input.sharedSubjects, 8) * 3 +
    Math.min(input.sharedInteractions, 8) * 5 +
    Math.min(input.readingActivity, 6) +
    (input.recentlyActive ? 3 : 0)
  );
}
