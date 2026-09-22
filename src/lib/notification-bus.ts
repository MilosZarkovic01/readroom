export type LiveNotification = {
  id: string;
  type: string;
  href: string;
  message: string;
  actorName: string;
  headline: string;
  bookTitle: string | null;
  quote: string | null;
  createdAt: string;
};

type Listener = (payload: LiveNotification) => void;

const globalForBus = globalThis as typeof globalThis & {
  __readroomNotify?: Map<string, Set<Listener>>;
};

function listeners() {
  if (!globalForBus.__readroomNotify) {
    globalForBus.__readroomNotify = new Map();
  }
  return globalForBus.__readroomNotify;
}

export function subscribeNotifications(userId: string, listener: Listener) {
  const map = listeners();
  const set = map.get(userId) ?? new Set<Listener>();
  set.add(listener);
  map.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) map.delete(userId);
  };
}

export function publishNotification(userId: string, payload: LiveNotification) {
  const set = listeners().get(userId);
  if (!set) return;
  for (const listener of set) listener(payload);
}
