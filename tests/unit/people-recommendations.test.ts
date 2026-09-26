import { expect, test } from "vitest";
import { scorePeopleCandidate } from "../../src/lib/people-score";

test("ranks stronger overlap above activity-only users", () => {
  const relevant = scorePeopleCandidate({
    mutualConnections: 3,
    followsViewer: true,
    friendOfFriend: true,
    sharedBooks: 4,
    closeRatings: 3,
    sharedSubjects: 2,
    sharedInteractions: 2,
    readingActivity: 2,
    recentlyActive: true,
  });
  const activeOnly = scorePeopleCandidate({
    mutualConnections: 0,
    followsViewer: false,
    friendOfFriend: false,
    sharedBooks: 0,
    closeRatings: 0,
    sharedSubjects: 0,
    sharedInteractions: 0,
    readingActivity: 6,
    recentlyActive: true,
  });
  expect(relevant).toBeGreaterThan(activeOnly);
});

test("does not treat popularity-style activity as enough to beat mutual ties", () => {
  const mutual = scorePeopleCandidate({
    mutualConnections: 2,
    followsViewer: false,
    friendOfFriend: true,
    sharedBooks: 0,
    closeRatings: 0,
    sharedSubjects: 0,
    sharedInteractions: 0,
    readingActivity: 0,
    recentlyActive: false,
  });
  const busyStranger = scorePeopleCandidate({
    mutualConnections: 0,
    followsViewer: false,
    friendOfFriend: false,
    sharedBooks: 0,
    closeRatings: 0,
    sharedSubjects: 0,
    sharedInteractions: 0,
    readingActivity: 6,
    recentlyActive: true,
  });
  expect(mutual).toBeGreaterThan(busyStranger);
});
