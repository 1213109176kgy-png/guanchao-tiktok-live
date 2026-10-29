import type { EventKind } from '../shared/types.ts';
export const demoProfiles = [
  ['Mia Chen',32,16],['Alex · 摄影日记',26,8],['Sofia',null,3],['Leo Wang',41,22],
  ['Emily✨',18,6],['Oliver',null,null],['Luna / 生活碎片',23,12],['Noah',9,2],
  ['Ava',36,18],['Ethan',15,4],['Isabella',null,null],['Lucas',28,11],
  ['Amelia',22,7],['Mason',5,null],['Harper',45,26],['James',null,1],
  ['Charlotte',17,9],['Benjamin',31,14],['Evelyn',12,5],['Henry',null,null],
  ['Aria',25,13],['Jack',8,3],['Ella',39,20],['Daniel',null,4],
  ['Grace',20,10],['William',14,6],['Chloe',33,17],['Michael',null,null],
  ['Nora',6,2],['David',27,12],['Zoe',16,7],['Samuel',null,3],
] as const;
const comments=['这个产品可以寄到新加坡吗？','Can you show the details?','第一次来，主播好 👋','请问还有其他颜色吗？','Love this!','这个怎么下单？','可以再演示一下吗','What is the shipping time?'];
export function demoPayload(i: number, sequence: number, kind: EventKind, run: string) {
  const p=demoProfiles[i % demoProfiles.length];
  return {
    common:{msgId:`demo-${run}-${sequence}`},
    user:{id:`90000000000000${String(i).padStart(3,'0')}`,displayId:`demo_viewer_${String(i+1).padStart(2,'0')}`,nickname:p[0],
      badgeList: p[1] ? [{priorityType:20,sceneType:8,privilegeLogExtra:{level:String(p[1])}}] : [],
      fansClub: p[2] ? {data:{level:p[2]}} : undefined},
    content:comments[i % comments.length],
    gift:kind==='gift'?{id:'5655',name:'Rose'}:undefined,
    giftId:kind==='gift'?'5655':undefined,repeatCount:kind==='gift'?(i%5+1):undefined,
    count:kind==='like'?i%12+1:undefined,
  };
}
