export const CHARACTERS = [
 {id:'firefighter',name:'Lính cứu hỏa',color:'#ef5350',tag:'Đỏ · Can đảm'},
 {id:'doctor',name:'Bác sĩ',color:'#40c9ff',tag:'Xanh dương · Bình tĩnh'},
 {id:'engineer',name:'Kỹ sư',color:'#ffd54f',tag:'Vàng · Sáng tạo'},
 {id:'chef',name:'Đầu bếp',color:'#ff9642',tag:'Cam · Nhiệt huyết'},
 {id:'gardener',name:'Nhà vườn',color:'#6bd58a',tag:'Xanh lá · Kiên nhẫn'},
 {id:'dj',name:'DJ âm nhạc',color:'#b88aff',tag:'Tím · Cá tính'},
 {id:'bella-mu',name:'Quỷ đỏ',color:'#ef343d',tag:'MU · Quỷ đỏ',locked:true},
 {id:'bella-chelsea',name:'Chần đè',color:'#32b9ff',tag:'Chelsea · Xanh dương',locked:true},
 {id:'bella-lakers',name:'Lê bống',color:'#ffcf44',tag:'Lakers · Vàng tím',locked:true},
 {id:'bella-portugal-7',name:'Goat CR7',color:'#ed394b',tag:'Bồ Đào Nha · Số 7',locked:true},
 {id:'bella-tennis',name:'Djokovic',color:'#b5ec3b',tag:'Tennis · Xanh lá',locked:true},
 {id:'bella-tech',name:'Steve Dóp',color:'#badfff',tag:'Công nghệ · Bạc xanh',locked:true}
];
export const characterById = id => CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
