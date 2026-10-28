// Clockwise from the local bottom seat, along the left rail and back down the right.
const layouts={
 1:{columns:1,rows:1,slots:[[50,0]]},
 2:{columns:2,rows:1,slots:[[22,0],[78,0]]},
 3:{columns:1,rows:2,slots:[[14,1],[50,0],[86,1]]},
 4:{columns:2,rows:2,slots:[[14,1],[26,0],[74,0],[86,1]]},
 5:{columns:3,rows:2,slots:[[14,1],[18,0],[50,0],[82,0],[86,1]]},
 6:{columns:2,rows:3,slots:[[14,2],[14,1],[26,0],[74,0],[86,1],[86,2]]},
 7:{columns:3,rows:3,slots:[[14,2],[14,1],[18,0],[50,0],[82,0],[86,1],[86,2]]},
 8:{columns:4,rows:3,slots:[[14,2],[14,1],[13,0],[38,0],[62,0],[87,0],[86,1],[86,2]]}
};
export function circularSeats(players,me){
 const count=players.length,opponents=players.filter(p=>p.id!==me.id).sort((a,b)=>((a.seat-me.seat+count)%count)-((b.seat-me.seat+count)%count));
 const layout=layouts[opponents.length];if(!layout)return [];
 return opponents.map((p,i)=>({...p,x:layout.slots[i][0],y:30+layout.slots[i][1]*16,progress:layout.rows===1?0:layout.slots[i][1]/(layout.rows-1),rows:layout.rows,columns:layout.columns,portrait:p.seat%8}));
}
// Runtime geometry is shared with collision regression tests. The top row always
// finishes above the board; lower rows stay on the outer rails beside it.
export function seatMetrics({width,top,bottom,boardTop,boardLeft=width*.25,boardRight=width*.75,opponents}){
 const {rows,columns}=layouts[opponents];const gap=12;
 const cellWidth=Math.min(100,width*.28-12,(width-32)/columns-10);
 const cellHeight=Math.min(132,(bottom-top-(rows-1)*gap)/rows,boardTop-18-top);
 const railWidth=Math.min(cellWidth,2*(Math.min(boardLeft-width*.14,width*.86-boardRight)-8));
 return {top,bottom,cellWidth,railWidth,cellHeight,portrait:Math.max(16,Math.min(cellWidth,cellHeight-50)),rows,columns};
}
export function seatBox(seat,metrics,width){
 const {cellHeight,top,bottom}=metrics,cellWidth=seat.progress>0?metrics.railWidth:metrics.cellWidth;
 return {left:width*seat.x/100-cellWidth/2,top:top+(bottom-top-cellHeight)*seat.progress,width:cellWidth,height:cellHeight};
}
export function turnFraction(room,now){
 if(room?.status!=='running'||!room.hand?.turn||room.hand.stage==='complete')return 0;
 const duration=(room.config.actionSeconds||25)*1000;
 return Math.max(0,Math.min(1,(room.hand.deadline-now)/duration));
}
