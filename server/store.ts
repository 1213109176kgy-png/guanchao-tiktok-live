import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Audience, AudienceQuery, FollowStatus, Mode, NormalizedEvent, StoredEvent, Summary, Task } from '../shared/types.ts';
import { csvCell } from './normalize.ts';

type Row = Record<string, any>;
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,host TEXT NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'idle',
        roomId TEXT,error TEXT,createdAt TEXT NOT NULL,startedAt TEXT,viewerCount INTEGER,
        UNIQUE(host,mode));
      CREATE TABLE IF NOT EXISTS users (
        mode TEXT NOT NULL,key TEXT NOT NULL,userId TEXT,handle TEXT,nickname TEXT NOT NULL,avatar TEXT,
        gifterLevel INTEGER,levelObservedAt TEXT,firstSeen TEXT NOT NULL,lastSeen TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',note TEXT NOT NULL DEFAULT '',PRIMARY KEY(mode,key));
      CREATE TABLE IF NOT EXISTS members (
        taskId TEXT NOT NULL REFERENCES tasks(id),userKey TEXT NOT NULL,fanLevel INTEGER,fanObservedAt TEXT,
        firstSeen TEXT NOT NULL,lastSeen TEXT NOT NULL,comments INTEGER NOT NULL DEFAULT 0,
        gifts INTEGER NOT NULL DEFAULT 0,likes INTEGER NOT NULL DEFAULT 0,latestComment TEXT,
        PRIMARY KEY(taskId,userKey));
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,taskId TEXT NOT NULL REFERENCES tasks(id),eventId TEXT NOT NULL,
        userKey TEXT,nickname TEXT,kind TEXT NOT NULL,content TEXT NOT NULL,receivedAt TEXT NOT NULL,
        gifterLevel INTEGER,fanLevel INTEGER,raw TEXT NOT NULL,UNIQUE(taskId,eventId));
      CREATE INDEX IF NOT EXISTS events_task_time ON events(taskId,id DESC);
      CREATE INDEX IF NOT EXISTS events_user ON events(userKey,id DESC);
      CREATE TABLE IF NOT EXISTS streaks (taskId TEXT NOT NULL,streakKey TEXT NOT NULL,total INTEGER NOT NULL,
        PRIMARY KEY(taskId,streakKey));`);
    this.db.exec("UPDATE tasks SET status='stopped',viewerCount=NULL WHERE status IN ('connecting','live','reconnecting')");
  }
  createTask(host: string, mode: Mode): Task {
    this.db.prepare('INSERT OR IGNORE INTO tasks(id,host,mode,createdAt) VALUES(?,?,?,?)')
      .run(randomUUID(), host, mode, new Date().toISOString());
    return this.tasks(mode).find(t => t.host === host)!;
  }
  tasks(mode: Mode): Task[] {
    return this.db.prepare(`SELECT t.*,(SELECT COUNT(*) FROM events e WHERE e.taskId=t.id) eventCount,
      (SELECT COUNT(*) FROM members m WHERE m.taskId=t.id) audienceCount FROM tasks t WHERE mode=? ORDER BY createdAt DESC`).all(mode) as unknown as Task[];
  }
  task(id: string): Task | undefined {
    return this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id) as unknown as Task | undefined;
  }
  updateTask(id: string, values: Partial<Pick<Task, 'status' | 'roomId' | 'error' | 'startedAt' | 'viewerCount'>>) {
    const entries = Object.entries(values).filter(([k]) => ['status','roomId','error','startedAt','viewerCount'].includes(k));
    if (entries.length) this.db.prepare(`UPDATE tasks SET ${entries.map(([k]) => `${k}=?`).join(',')} WHERE id=?`).run(...entries.map(([, v]) => v ?? null), id);
  }
  ingest(taskId: string, event: NormalizedEvent): boolean {
    const task = this.task(taskId);
    if (!task) throw new Error('任务不存在');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare(`INSERT OR IGNORE INTO events(taskId,eventId,userKey,nickname,kind,content,receivedAt,gifterLevel,fanLevel,raw)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).run(taskId,event.eventId,event.userKey,event.nickname,event.kind,event.content,event.receivedAt,event.gifterLevel,event.fanLevel,event.raw);
      if (!result.changes) { this.db.exec('COMMIT'); return false; }
      if (event.userKey) {
        const p = event;
        // Numeric IDs and handle-only identities are intentionally not merged by nickname.
        this.db.prepare(`INSERT INTO users(mode,key,userId,handle,nickname,avatar,gifterLevel,levelObservedAt,firstSeen,lastSeen)
          VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(mode,key) DO UPDATE SET
          userId=COALESCE(excluded.userId,users.userId),handle=COALESCE(excluded.handle,users.handle),
          nickname=CASE WHEN ? IS NOT NULL THEN excluded.nickname ELSE users.nickname END,
          avatar=COALESCE(excluded.avatar,users.avatar),gifterLevel=COALESCE(excluded.gifterLevel,users.gifterLevel),
          levelObservedAt=COALESCE(excluded.levelObservedAt,users.levelObservedAt),lastSeen=excluded.lastSeen`)
          .run(task.mode,p.userKey,p.userId,p.handle,p.nickname ?? p.handle ?? '未提供昵称',p.avatar,p.gifterLevel,
            p.gifterLevel === null ? null : p.receivedAt,p.receivedAt,p.receivedAt,p.nickname);
        let gifts = p.giftCount;
        if (p.streakId && p.giftId) {
          const key = `${p.userKey}:${p.giftId}:${p.streakId}`;
          const prev = this.db.prepare('SELECT total FROM streaks WHERE taskId=? AND streakKey=?').get(taskId,key) as Row | undefined;
          gifts = Math.max(0,p.giftCount - (prev?.total ?? 0));
          this.db.prepare('INSERT INTO streaks VALUES(?,?,?) ON CONFLICT(taskId,streakKey) DO UPDATE SET total=MAX(total,excluded.total)').run(taskId,key,p.giftCount);
        }
        this.db.prepare(`INSERT INTO members(taskId,userKey,fanLevel,fanObservedAt,firstSeen,lastSeen,comments,gifts,likes,latestComment)
          VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(taskId,userKey) DO UPDATE SET
          fanLevel=COALESCE(excluded.fanLevel,members.fanLevel),fanObservedAt=COALESCE(excluded.fanObservedAt,members.fanObservedAt),
          lastSeen=excluded.lastSeen,comments=members.comments+excluded.comments,gifts=members.gifts+excluded.gifts,
          likes=members.likes+excluded.likes,latestComment=COALESCE(excluded.latestComment,members.latestComment)`)
          .run(taskId,p.userKey,p.fanLevel,p.fanLevel === null ? null : p.receivedAt,p.receivedAt,p.receivedAt,
            p.kind === 'chat' ? 1 : 0,gifts,p.likeCount,p.kind === 'chat' ? p.content : null);
      }
      this.db.exec('COMMIT'); return true;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  private query(q: AudienceQuery) {
    const args: SQLInputValue[] = [q.mode];
    const conditions = ['t.mode=?'];
    if (q.taskId) { conditions.push('m.taskId=?'); args.push(q.taskId); }
    const cte = `WITH filtered AS (SELECT m.*,t.host FROM members m JOIN tasks t ON t.id=m.taskId WHERE ${conditions.join(' AND ')}),
      stats AS (SELECT userKey,MIN(firstSeen) firstSeen,MAX(lastSeen) lastSeen,SUM(comments) comments,SUM(gifts) gifts,
      SUM(likes) likes,COUNT(*) roomCount FROM filtered GROUP BY userKey),
      latest AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY userKey ORDER BY lastSeen DESC,taskId) rn FROM filtered),
      rows AS (SELECT u.key,u.userId,u.handle,u.nickname,u.avatar,u.gifterLevel,u.levelObservedAt,0 anonymous,
        s.firstSeen,s.lastSeen,s.comments,s.gifts,s.likes,s.roomCount,l.fanLevel,l.host fanRoom,l.latestComment,u.status,u.note
        FROM stats s JOIN users u ON u.key=s.userKey AND u.mode=? JOIN latest l ON l.userKey=s.userKey AND l.rn=1)`;
    args.push(q.mode);
    const filters: string[] = [];
    if (q.search) { filters.push("(nickname LIKE ? ESCAPE '!' OR handle LIKE ? ESCAPE '!' OR userId LIKE ? ESCAPE '!')"); const s='%'+q.search.replace(/[!%_]/g,'!$&')+'%'; args.push(s,s,s); }
    if (q.minLevel !== undefined) { filters.push('gifterLevel>=?'); args.push(q.minLevel); }
    if (q.maxLevel !== undefined) { filters.push('gifterLevel<=?'); args.push(q.maxLevel); }
    if (q.minFanLevel !== undefined) { filters.push('fanLevel>=?'); args.push(q.minFanLevel); }
    if (q.levelState === 'known') filters.push('gifterLevel IS NOT NULL');
    if (q.levelState === 'unknown') filters.push('gifterLevel IS NULL');
    if (q.status) { filters.push('status=?'); args.push(q.status); }
    if (q.giftersOnly) filters.push('gifts>0');
    return { cte, where: filters.length ? ' WHERE '+filters.join(' AND ') : '', args };
  }
  audience(q: AudienceQuery): { rows: Audience[]; total: number } {
    const { cte, where, args } = this.query(q);
    const total = (this.db.prepare(cte+' SELECT COUNT(*) n FROM rows'+where).get(...args) as Row).n;
    const order = q.sort === 'level' ? 'gifterLevel DESC,lastSeen DESC' : q.sort === 'gifts' ? 'gifts DESC,lastSeen DESC' : 'lastSeen DESC,key';
    const size = Math.min(Math.max(q.pageSize ?? 20,1),1000), page = Math.max(q.page ?? 1,1);
    const rows = this.db.prepare(cte+` SELECT * FROM rows${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args,size,(page-1)*size) as unknown as Audience[];
    return { rows, total };
  }
  summary(mode: Mode, taskId?: string): Summary {
    const {cte,args} = this.query({mode,taskId});
    const result = this.db.prepare(cte+` SELECT COUNT(*) audience,COUNT(gifterLevel) knownLevels,
      COALESCE(SUM(gifterLevel>=20),0) highLevel,COALESCE(SUM(gifts>0),0) giftUsers FROM rows`).get(...args) as Row;
    const filter = taskId ? ' AND taskId=?' : '';
    const events = (this.db.prepare(`SELECT COUNT(*) n FROM events WHERE taskId IN (SELECT id FROM tasks WHERE mode=?)${filter}`).get(...(taskId?[mode,taskId]:[mode])) as Row).n;
    const activeTasks = this.tasks(mode).filter(t=>['connecting','live','reconnecting'].includes(t.status)).length;
    return { ...result, events, activeTasks } as Summary;
  }
  follow(mode: Mode, key: string, status: FollowStatus, note: string) {
    const result = this.db.prepare('UPDATE users SET status=?,note=? WHERE mode=? AND key=?').run(status,note,mode,key);
    if (!result.changes) throw new Error('观众不存在');
  }
  events(mode: Mode, taskId?: string, userKey?: string, raw = false): StoredEvent[] {
    const args: SQLInputValue[]=[mode]; const where=['t.mode=?'];
    if(taskId) {where.push('e.taskId=?');args.push(taskId);}
    if(userKey) {where.push('e.userKey=?');args.push(userKey);}
    const rows=this.db.prepare(`SELECT e.id,e.taskId,t.host,e.kind,e.userKey,e.nickname,e.content,e.receivedAt,e.gifterLevel,e.fanLevel${raw?',e.raw':''}
      FROM events e JOIN tasks t ON t.id=e.taskId WHERE ${where.join(' AND ')} ORDER BY e.id DESC LIMIT 80`).all(...args) as Row[];
    return rows.map(r => raw ? {...r,raw:JSON.parse(r.raw)} : r) as StoredEvent[];
  }
  detail(mode: Mode, key: string) {
    const user=this.db.prepare('SELECT * FROM users WHERE mode=? AND key=?').get(mode,key);
    if(!user) return null;
    const rooms=this.db.prepare(`SELECT m.*,t.host FROM members m JOIN tasks t ON t.id=m.taskId WHERE t.mode=? AND m.userKey=? ORDER BY lastSeen DESC`).all(mode,key);
    return {user,rooms,events:this.events(mode,undefined,key,true)};
  }
  *csv(q: AudienceQuery): Generator<string> {
    yield '\uFEFF'+['用户ID','TikTok账号','昵称','送礼等级（最近观测）','送礼等级观测时间','粉丝团等级（最近房间）','粉丝团来源主播','首次出现','最近出现','评论数','礼物数量','点赞数','直播间数','跟进状态','备注','数据模式'].map(csvCell).join(',')+'\r\n';
    const {cte,where,args}=this.query(q);
    for(const item of this.db.prepare(cte+' SELECT * FROM rows'+where+' ORDER BY lastSeen DESC').iterate(...args)) {
      const r=item as Row;
      yield [r.userId?"'"+r.userId:null,r.handle,r.nickname,r.gifterLevel,r.levelObservedAt,r.fanLevel,r.fanRoom,r.firstSeen,r.lastSeen,r.comments,r.gifts,r.likes,r.roomCount,
        ({new:'未跟进',pending:'待联系',contacted:'已联系',interested:'有意向',closed:'已结束'} as Row)[r.status],r.note,q.mode==='demo'?'演示':'真实'].map(csvCell).join(',')+'\r\n';
    }
  }
  close() { this.db.close(); }
}
