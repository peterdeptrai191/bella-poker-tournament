// All monetary values are integer milli-coins (1 coin = 1000). Also used by the server.
export const RULE_VERSION=2;
export const TIERS=[{name:'Thường',color:'#b4c5ca',weight:50,min:1000,max:3000,xp:6},{name:'Không thường',color:'#9dd5a8',weight:30,min:4000,max:6000,xp:10},{name:'Hiếm',color:'#79beed',weight:15,min:7000,max:10000,xp:18},{name:'Sử thi',color:'#c4a1ec',weight:4,min:11000,max:15000,xp:40},{name:'Huyền thoại',color:'#edd089',weight:1,min:16000,max:20000,xp:100}];
const names=[
 ['Hồ Sen Bella','Nước ngọt · Sen nở, nước lặng',1,0,0,'rô đồng|diếc|mè trắng|trôi|chép thường|trê vàng;sặc rằn|rô phi đỏ|chép gương|lóc đồng;thát lát cườm|trắm đen|chép koi;chình bông;Chép Hoàng Kim Bella'],
 ['Sông Hoàng Hôn','Dòng chảy · Theo ánh chiều',3,2000,0,'thiểu|lòng tong|linh ống|mè vinh|bống cát|chạch rằn;trê trắng|lăng vàng|hú|chốt;chiên|bông lau|mè hoa;hô;Lăng Vương Giả'],
 ['Đầm Rừng Ngọc','Rừng ngập nước · Sương mờ',6,5000,0,'sặc bướm|sặc trân châu|lia thia đồng|bảy màu|mún|kiếm;tai tượng|hường|he|lóc bông;rồng ngân long|rồng kim long|rồng huyết long;hải tượng;Long Ngư Ngọc Lục Bảo'],
 ['Suối Mây Trắng','Núi cao · Nước trong, đá cuội',10,10000,0,'suối bạc|niên|mát|bống suối|chạch đá|chép suối;hồi vân|hồi nâu|tầm Siberia|tầm Nga;hồi vàng|hồi brook|tầm sao;tầm trắng;Bạch Ngư Vân Sơn'],
 ['Vịnh San Hô','Biển ấm · Khám phá rạn san hô',15,20000,0,'cơm|trích|nục|đối|dìa|đục;chim vây vàng|hồng|mó|bè;mú nghệ|bò hòm|bướm đồng;Napoleon;Nữ Hoàng San Hô'],
 ['Biển Bão Xa','Biển khơi · Những đợt sóng lớn',21,35000,0,'bạc má|thu đao|sòng|chuồn|hố|cam;ngừ sọc dưa|ngừ vây vàng|thu vua|mahi-mahi;cờ kiếm|cờ buồm|ngừ vây xanh;cờ xanh khổng lồ;Hải Vương Lôi Bão'],
 ['Vực Băng Cực Quang','Băng tuyết · Ánh sáng phương Bắc',28,60000,0,'tuyết Đại Tây Dương|haddock|pollock|capelin|trích Bắc Cực|than;hồi Bắc Cực|hồi hồ|bơn Greenland|sói biển;bơn Đại Tây Dương|hồi Chinook|quân mắt vàng;mập Greenland;Băng Long Cực Quang'],
 ['Hồ Tinh Tú','Giả tưởng · Một trời sao riêng',36,100000,0,'Đom Đóm|Lá Ngọc|Giọt Sương|Đuôi Sao|Vảy Trăng|Mực Tím;Cánh Bướm|Pha Lê|Nguyệt Quang|San Hô Lam;Phượng Hỏa|Kỳ Lân Biển|Rồng Thiên Thanh;Tinh Linh Ngân Hà;Bella Thiên Long']
];
export const LAKES=names.map(([name,tag,level,unlock,cost],id)=>({id,name,tag,level,unlock,cost:0}));
export const FISH=names.flatMap((row,lake)=>row[5].split(';').flatMap((group,tier)=>group.split('|').map((n,index)=>({id:`${lake}-${tier}-${index}`,name:tier===4?n:'Cá '+n,lake,tier,price:TIERS[tier].min+((index+Math.round((TIERS[tier].max-TIERS[tier].min)/1000*lake/7))%((TIERS[tier].max-TIERS[tier].min)/1000+1))*1000,minKg:[.05,.2,.5,1,3][tier]*(lake+1),maxKg:[1.5,5,25,80,150][tier]*(1+lake*.3),behavior:(index+lake+tier)%6}))));
export const GEAR={
 rod:[['Cần Tre',0,1,0],['Cần Gỗ Dẻo',3000,3,8],['Cần Carbon',8000,6,16],['Cần Hợp Kim',18000,10,25],['Cần San Hô',35000,15,35],['Cần Hải Vương',65000,21,46],['Cần Băng Tinh',110000,28,58],['Cần Tinh Tú',180000,36,72]],
 reel:[['Máy cơ bản',0,1,0],['Máy Đồng',2000,3,5],['Máy Bạc',6000,6,10],['Máy Vàng',15000,10,16],['Máy Bạch Kim',30000,15,23],['Máy Đại Dương',55000,21,31],['Máy Cực Quang',90000,28,40],['Máy Tinh Tú',140000,36,50]],
 line:[['Nylon cơ bản',0,1,1500],['Nylon tốt',2000,3,1700],['Dây bện',6000,6,1900],['Fluorocarbon',14000,10,2100],['Dây lõi hợp kim',28000,15,2350],['Dây Tinh Tú',55000,28,2600]],
 hook:[['Lưỡi tiêu chuẩn',0,1,4000],['Lưỡi thép',2000,3,4500],['Lưỡi cong',6000,6,5000],['Lưỡi khóa',14000,10,5500],['Lưỡi Hải Vương',28000,21,6000]],
 float:[['Phao gỗ',0,1,1500],['Phao sơn',1000,3,1650],['Phao phản quang',3000,6,1800],['Phao cảm biến',8000,10,2000],['Phao Tinh Tú',18000,28,2200]],
 bag:[['Túi 20 ô',0,1,20],['Túi 40 ô',2000,1,40],['Túi 80 ô',5000,3,80],['Túi 120 ô',10000,6,120],['Túi 200 ô',20000,10,200]]
};
export const GEAR_NAMES={rod:'Cần câu',reel:'Máy câu',line:'Dây câu',hook:'Lưỡi câu',float:'Phao',bag:'Túi cá'};
export const BAITS=[{id:'normal',name:'Mồi thường',extra:0},{id:'plants',name:'Mồi thực vật',extra:0},{id:'insects',name:'Mồi côn trùng',extra:0},{id:'meat',name:'Mồi thịt',extra:0},{id:'target',name:'Mồi định danh',extra:0}];
export const coin=n=>(n/1000).toLocaleString('vi-VN',{minimumFractionDigits:n%1000===0?0:3,maximumFractionDigits:3});
export const levelFor=xp=>{let l=1;while(l<60&&xp>=Math.round(60*l**1.65))l++;return l;};
export const nextXP=level=>Math.round(60*level**1.65);
export function tierFor(roll){let n=0;return TIERS.findIndex(t=>{n+=t.weight;return roll<n;});}
