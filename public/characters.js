export const CHARACTERS = [
 {id:'firefighter',name:'Lính cứu hỏa',color:'#ef5350',tag:'Đỏ · Can đảm'},
 {id:'doctor',name:'Bác sĩ',color:'#40c9ff',tag:'Xanh dương · Bình tĩnh'},
 {id:'engineer',name:'Kỹ sư',color:'#ffd54f',tag:'Vàng · Sáng tạo'},
 {id:'chef',name:'Đầu bếp',color:'#ff9642',tag:'Cam · Nhiệt huyết'},
 {id:'gardener',name:'Nhà vườn',color:'#6bd58a',tag:'Xanh lá · Kiên nhẫn'},
 {id:'dj',name:'DJ âm nhạc',color:'#b88aff',tag:'Tím · Cá tính'}
];
export const characterById = id => CHARACTERS.find(c=>c.id===id)||CHARACTERS[0];
