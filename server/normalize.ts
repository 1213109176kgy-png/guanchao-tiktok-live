import { createHash } from 'node:crypto';
import type { EventKind, NormalizedEvent } from '../shared/types.ts';

type Obj = Record<string, any>;
const object = (v: unknown): Obj => v && typeof v === 'object' ? v as Obj : {};
const string = (v: unknown): string | null => {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') return Number.isSafeInteger(v) ? String(v) : null;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};
export function level(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
}
export const json = (v: unknown) => JSON.stringify(v, (_, value) => typeof value === 'bigint' ? value.toString() : value);
const evidenceJson = (v: unknown) => JSON.stringify(v, (key, value) => {
  if (/^(?:signature|token|accessToken|access_token|cookie|cookies|sessionid|authorization|apiKey|api_key)$/i.test(key)) return '[已隐藏]';
  return typeof value === 'bigint' ? value.toString() : value;
});
export function parseHost(value: unknown): string {
  if (typeof value !== 'string') throw new Error('请输入 TikTok 主播账号或直播链接');
  let host = value.trim();
  if (/^https?:\/\//i.test(host)) {
    const url = new URL(host);
    if (!['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(url.hostname)) throw new Error('请使用 tiktok.com 的主播主页或直播链接');
    host = url.pathname.match(/^\/@([^/]+)(?:\/live)?\/?$/)?.[1] ?? '';
  }
  host = host.replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_][a-z0-9_.]{1,23}$/.test(host)) throw new Error('账号应为 2–24 位字母、数字、下划线或点，不支持短链接');
  return host;
}
function imageUrl(v: unknown): string | null {
  if (typeof v === 'string') return /^https:\/\//i.test(v) ? v : null;
  const img = object(v);
  const candidates = img.urlList ?? img.url_list ?? img.urls ?? [];
  return Array.isArray(candidates) ? candidates.find((x) => typeof x === 'string' && /^https:\/\//i.test(x)) ?? null : null;
}
// Only explicitly typed fields / known badge categories are read. Other numbers in a
// badge (category, priority, rank, image URL) must never be guessed to be a level.
export function extractLevels(user: Obj): { gifterLevel: number | null; fanLevel: number | null } {
  const firstLevel=(...values:unknown[])=>values.map(level).find(v=>v!==null)??null;
  let gifterLevel = firstLevel(user.payGrade?.level,user.pay_grade?.level,user.payGrade,user.gifterLevel);
  let fanLevel = firstLevel(user.fansClub?.data?.level,user.fansClubInfo?.fansLevel,user.fansClub?.level,user.fans_club?.data?.level,user.fanClubLevel);
  const badges = user.badgeList ?? user.badge_list ?? user.badges ?? [];
  if (Array.isArray(badges)) for (const value of badges) {
    const badge = object(value);
    const priv = object(badge.privilegeLogExtra ?? badge.privilege_log_extra ?? badge.privilege);
    const type = Number(badge.sceneType ?? badge.badgeSceneType ?? badge.badge_scene_type);
    const category = Number(badge.priorityType ?? badge.badgeType ?? badge.badge_type ?? badge.category);
    // Installed v3 schema: BadgePriorityType.PLATFORM=20, BadgeSceneType.USER_GRADE=8.
    const candidate = level(priv.level ?? priv.levelString ?? priv.level_string);
    if (category === 20 && type === 8 && candidate !== null) gifterLevel ??= candidate;
    if (type === 10 && candidate !== null) fanLevel ??= candidate;
  }
  return { gifterLevel, fanLevel };
}
export function normalizeEvent(kind: EventKind, input: unknown, now = new Date().toISOString()): NormalizedEvent {
  const data = object(input), user = object(data.user), common = object(data.common ?? data.baseMessage);
  const anonymous = Boolean(user.isAnonymous || user.enigmaInfo?.isEnigmaMaskOn || user.enigma_info?.is_enigma_mask_on);
  const evidence = anonymous ? {...data,user:{...user,id:undefined,userId:undefined,user_id:undefined,secUid:undefined,sec_uid:undefined,
    displayId:undefined,uniqueId:undefined,unique_id:undefined}} : data;
  const raw = evidenceJson(evidence);
  const messageId = string(common.msgId ?? common.msg_id ?? data.msgId ?? data.messageId);
  let eventId = messageId && messageId !== '0' ? `${kind}:${messageId}` : `${kind}:hash:${createHash('sha256').update(raw).digest('hex')}`;
  const userId = anonymous ? null : string(user.id ?? user.userId ?? user.user_id);
  const handleValue = string(user.displayId ?? user.uniqueId ?? user.unique_id);
  const handle = !anonymous && handleValue && /^[\w.]{2,24}$/.test(handleValue) ? handleValue : null;
  const userKey = anonymous ? null : userId && userId !== '0' ? `id:${userId}` : handle ? `handle:${handle.toLowerCase()}` : null;
  const { gifterLevel, fanLevel } = anonymous ? { gifterLevel: null, fanLevel: null } : extractLevels(user);
  const gift = object(data.gift ?? data.extendedGiftInfo), giftId = string(data.giftId ?? gift.id ?? gift.giftId);
  const count = Number(data.repeatCount ?? data.repeat_count ?? 1);
  const streak = string(data.groupId ?? data.group_id ?? data.comboId);
  if(kind === 'gift' && streak && streak !== '0') eventId += `:${streak}:${count}:${data.repeatEnd ?? data.repeat_end ?? ''}`;
  return {
    eventId, kind, userKey, userId: userId === '0' ? null : userId, handle,
    nickname: string(user.nickname ?? user.nickName), avatar: imageUrl(user.avatarThumb ?? user.avatarMedium ?? user.profilePictureUrl),
    anonymous, gifterLevel, fanLevel,
    content: kind === 'chat' ? String(data.content ?? data.comment ?? '').slice(0, 4000)
      : kind === 'gift' ? String(gift.name ?? data.giftName ?? `礼物 ${giftId ?? ''}`).slice(0, 500)
      : ({ member: '进入直播间', like: '点赞', follow: '关注主播', share: '分享直播间', badge: '徽章更新' } as Record<string,string>)[kind] ?? '',
    giftCount: kind === 'gift' && Number.isSafeInteger(count) && count > 0 ? Math.min(count, 1e6) : 0,
    giftId, streakId: kind === 'gift' && streak && streak !== '0' ? streak : null,
    likeCount: kind === 'like' ? Math.max(0, Math.min(Number(data.count ?? data.likeCount ?? 1) || 0, 1e6)) : 0,
    receivedAt: now, raw,
  };
}
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[\s]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
