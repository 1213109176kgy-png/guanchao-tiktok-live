// Runs only inside the isolated TikTok webContents. Reads public page metadata,
// never cookies, localStorage, passwords, tokens, or private application APIs.
export function probeTikTokPage(){
  const url=location.href;
  let host:string|null=null,roomId:string|null=null,roomStatus:number|null=null;
  const records:Record<string,any>[]=[];
  for(const id of ['SIGI_STATE','__UNIVERSAL_DATA_FOR_REHYDRATION__']){
    const source=document.getElementById(id)?.textContent;if(!source||source.length>12_000_000)continue;
    try{const data=JSON.parse(source),scope=data.__DEFAULT_SCOPE__??{};
      for(const value of [data.LiveRoom?.liveRoomUserInfo,data.LiveRoom?.liveRoomInfo,scope['webcast.app-context']?.liveRoomUserInfo,scope['webcast.app-context']?.roomInfo,scope['webcast.room-info'],scope['webcast.room']]){
        if(value&&typeof value==='object')records.push(value);
      }
    }catch{}
  }
  for(const record of records){
    const room=record.liveRoom??record.roomInfo??record.room??record;
    const user=record.user??room.owner??room.ownerInfo??{};
    const value=room.id_str??room.id??room.roomId??user.roomId;
    if(value&&String(value)!=='0')roomId=String(value);
    const status=Number(room.status??room.roomStatus);if(status>0&&status<10)roomStatus=status;
    const handle=user.uniqueId??user.displayId??user.unique_id;if(typeof handle==='string')host=handle;
  }
  const playerRoot=document.querySelector('[data-e2e="live-room"], [data-e2e="live-player"], [data-e2e="live-room-container"]');
  if(!host&&playerRoot){
    const candidates=[...playerRoot.querySelectorAll<HTMLAnchorElement>('a[href]')].filter(a=>a.getBoundingClientRect().width>0).map(a=>{try{return new URL(a.href).pathname.match(/^\/@([\w.]{2,24})\/live\/?$/)?.[1];}catch{return undefined;}}).filter(Boolean);
    const unique=[...new Set(candidates)];if(unique.length===1)host=unique[0]!;
  }
  const videos=[...document.querySelectorAll('video')].filter(v=>{const r=v.getBoundingClientRect();return r.width>100&&r.height>100;});
  const livePlayer=videos.some(v=>v.readyState>=2&&!v.ended);
  const liveChat=Boolean(document.querySelector('[data-e2e="live-chat"], [data-e2e="chat-room"], [data-e2e="live-chat-room"], [data-e2e="chat-message"]'));
  const offlineElement=document.querySelector('[data-e2e="live-ended"], [data-e2e="live-offline"], [data-e2e="live-room-ended"]');
  return {url,host,roomId,roomStatus,livePlayer,liveChat,offline:Boolean(offlineElement)};
}
