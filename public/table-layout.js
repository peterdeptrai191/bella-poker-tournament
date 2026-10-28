// Clockwise from the local player's bottom seat: left rail, far end, right rail.
const layouts={
 1:[[50,42]],2:[[24,45],[76,45]],3:[[20,48],[50,34],[80,48]],
 4:[[16,54],[29,35],[71,35],[84,54]],
 5:[[13,59],[22,40],[50,29],[78,40],[87,59]],
 6:[[11,62],[15,45],[30,30],[70,30],[85,45],[89,62]],
 7:[[11,64],[13,48],[25,34],[50,25],[75,34],[87,48],[89,64]],
 8:[[11,66],[12,52],[18,39],[30,27],[70,27],[82,39],[88,52],[89,66]]
};
export function circularSeats(players,me){
 const count=players.length,opponents=players.filter(p=>p.id!==me.id).sort((a,b)=>((a.seat-me.seat+count)%count)-((b.seat-me.seat+count)%count));
 const rows=layouts[opponents.length]||[],first=Math.min(...rows.map(p=>p[1])),last=Math.max(...rows.map(p=>p[1]));
 return opponents.map((p,i)=>({...p,x:rows[i][0],y:rows[i][1],first,last,progress:last===first?0:(rows[i][1]-first)/(last-first),portrait:p.seat%8}));
}
export function turnFraction(room,now){
 if(room?.status!=='running'||!room.hand?.turn||room.hand.stage==='complete')return 0;
 const duration=(room.config.actionSeconds||25)*1000;
 return Math.max(0,Math.min(1,(room.hand.deadline-now)/duration));
}
