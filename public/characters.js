export const DEFAULT_CHARACTER='farmer';
export const CHARACTERS = [
 {id:'firefighter',name:'Lính cứu hỏa',color:'#ef5350',tag:'Đỏ · Can đảm',price:1},
 {id:'doctor',name:'Bác sĩ',color:'#40c9ff',tag:'Xanh dương · Bình tĩnh',price:1},
 {id:'engineer',name:'Kỹ sư',color:'#ffd54f',tag:'Vàng · Sáng tạo',price:1},
 {id:'chef',name:'Đầu bếp',color:'#ff9642',tag:'Cam · Nhiệt huyết',price:1},
 {id:'gardener',name:'Nhà vườn',color:'#6bd58a',tag:'Xanh lá · Kiên nhẫn',price:1},
 {id:'dj',name:'DJ âm nhạc',color:'#b88aff',tag:'Tím · Cá tính',price:1},
 {id:'bella-mu',name:'Quỷ đỏ',color:'#ef343d',tag:'MU · Quỷ đỏ',locked:true,price:6},
 {id:'bella-chelsea',name:'Chần đè',color:'#32b9ff',tag:'Chelsea · Xanh dương',locked:true,price:5},
 {id:'bella-lakers',name:'Lê bống',color:'#ffcf44',tag:'Lakers · Vàng tím',locked:true,price:5},
 {id:'bella-portugal-7',name:'Goat CR7',color:'#ed394b',tag:'Bồ Đào Nha · Số 7',locked:true,price:5},
 {id:'bella-tennis',name:'Djokovic',color:'#b5ec3b',tag:'Tennis · Xanh lá',locked:true,price:4},
 {id:'bella-tech',name:'Steve Dóp',color:'#badfff',tag:'Công nghệ · Bạc xanh',locked:true,price:4},
 {id:'farmer',name:'Bella nông dân',color:'#d7a852',tag:'Nông dân · Miễn phí',price:0}
];
export const characterById = id => CHARACTERS.find(c=>c.id===id)||CHARACTERS.find(c=>c.id===DEFAULT_CHARACTER);
