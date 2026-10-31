import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
test('finished tournaments show the champion celebration once, then standings with stay / leave',()=>{
 const app=read('app.js'),champ=read('champion.js');
 assert.match(app,/import \{celebrateChampion,championShown\} from '\.\/champion\.js'/);
 assert.match(app,/room\.status!=='finished'\|\|page!=='room'\|\|championShown\(room\)/);
 assert.match(app,/onLeave:\(\)=>\{delete sessions\[code\];save\(\)/);
 assert.match(champ,/class="cr7-list ch-stay">Ở lại phòng/);
 assert.match(champ,/class="cr7-gold ch-leave">Thoát phòng/);
 assert.match(read('index.html'),/href="champion\.css"/);
});
