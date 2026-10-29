export type Mode = 'live' | 'demo';
export type FollowStatus = 'new' | 'pending' | 'contacted' | 'interested' | 'closed';
export type TaskStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'stopped' | 'error';
export type EventKind = 'chat' | 'member' | 'gift' | 'like' | 'follow' | 'share' | 'badge';
export interface Task {
  id: string; host: string; mode: Mode; status: TaskStatus; roomId: string | null;
  error: string | null; createdAt: string; startedAt: string | null;
  viewerCount: number | null; eventCount: number; audienceCount: number;
}
export interface Audience {
  key: string; userId: string | null; handle: string | null; nickname: string;
  avatar: string | null; anonymous: boolean; gifterLevel: number | null;
  levelObservedAt: string | null; fanLevel: number | null; fanRoom: string | null;
  firstSeen: string; lastSeen: string; comments: number; gifts: number; likes: number;
  roomCount: number; latestComment: string | null; status: FollowStatus; note: string;
}
export interface StoredEvent {
  id: number; taskId: string; host: string; kind: EventKind; userKey: string | null;
  nickname: string | null; content: string; receivedAt: string;
  gifterLevel: number | null; fanLevel: number | null; raw?: unknown;
}
export interface Summary {
  audience: number; knownLevels: number; highLevel: number; events: number;
  giftUsers: number; activeTasks: number;
}
export interface AudienceQuery {
  mode: Mode; taskId?: string; search?: string; minLevel?: number; maxLevel?: number;
  levelState?: 'known' | 'unknown'; minFanLevel?: number; status?: FollowStatus;
  giftersOnly?: boolean; sort?: 'recent' | 'level' | 'gifts'; page?: number; pageSize?: number;
}
export interface NormalizedEvent {
  eventId: string; kind: EventKind; userKey: string | null; userId: string | null;
  handle: string | null; nickname: string | null; avatar: string | null; anonymous: boolean;
  gifterLevel: number | null; fanLevel: number | null; content: string;
  giftCount: number; giftId: string | null; streakId: string | null; likeCount: number;
  receivedAt: string; raw: string;
}
