import test from 'node:test';import assert from 'node:assert/strict';
import {equityInputs,estimateEquity,bestFive,winningSelection,showdownHighlights} from '../public/poker-insights.js';
const cards=s=>s.split(' ').map(c=>({rank:'23456789TJQKA'.indexOf(c[0])+2,suit:c[1]}));
const randomSeed=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const room=()=>({status:'running',me:'me',players:[{id:'me',inHand:true,folded:false,hole:cards('Ah Kc')},{id:'other',inHand:true,folded:false,hole:cards('As Ad')}],hand:{stage:'flop',board:cards('Ad 7s 2h'),winners:[],pots:[]}});

test('equity input excludes opponent cards, deck and betting state and counts only live opponents',()=>{
 const a=room();a.hand.deck=cards('2c 3c 4c');const input=equityInputs(a);const b=structuredClone(a);b.players[1].hole=cards('2c 3c');b.hand.deck=cards('As Ac');b.players[1].stack=999999;
 assert.deepEqual(equityInputs(b),input);assert.deepEqual(Object.keys(input).sort(),['board','hole','opponents']);
 assert.equal(input.opponents,1);assert.equal(JSON.stringify(input).includes('As'),false);
 input.hole[0].rank=2;assert.equal(a.players[0].hole[0].rank,14);
 b.players[1].folded=true;assert.equal(equityInputs(b).opponents,0);
 b.players[0].folded=true;assert.equal(equityInputs(b),null);
});

test('equity accounts for shared pots without reading any hidden hand',()=>{
 const nuts={hole:cards('Ah Kh'),board:cards('Qh Jh Th'),opponents:8};
 assert.equal(estimateEquity(nuts,{samples:40,random:randomSeed(1)}).equity,100);
 const shared={hole:cards('2c 3d'),board:cards('Ah Kh Qh Jh Th'),opponents:3};
 assert.equal(estimateEquity(shared,{samples:40,random:randomSeed(2)}).equity,25);
 assert.equal(estimateEquity({...nuts,opponents:0}).equity,100);
 assert.throws(()=>estimateEquity({hole:cards('Ah Ah'),board:[],opponents:1}),/Invalid/);
});

test('preflop Monte Carlo has sensible ranking and finishes with bounded percentages',()=>{
 const aa=estimateEquity({hole:cards('As Ah'),board:[],opponents:1},{samples:700,random:randomSeed(9)});
 const weak=estimateEquity({hole:cards('7c 2d'),board:[],opponents:1},{samples:700,random:randomSeed(9)});
 assert.ok(aa.equity>75&&aa.equity<95);assert.ok(weak.equity>=0&&weak.equity<55);assert.ok(aa.equity>weak.equity);assert.equal(aa.samples,700);
});

test('best five returns exact contributing cards for a straight, flush and board-only hand',()=>{
 const straight=bestFive(cards('Ah Kc Qd Js Tc 2h 3c'));assert.equal(straight.name,'Sảnh');assert.deepEqual(straight.indices,[0,1,2,3,4]);
 const flush=bestFive(cards('Ah 2h Kh 9h 7h 4c 3d'));assert.equal(flush.name,'Thùng');assert.deepEqual(flush.indices,[0,1,2,3,4]);
 const boardOnly=bestFive(cards('2c 3d Ah Kh Qh Jh Th'));assert.deepEqual(boardOnly.indices,[2,3,4,5,6]);
 const wheel=bestFive(cards('As 2c 3h 4s 5d 9c Kh'));assert.equal(wheel.name,'Sảnh');assert.deepEqual(wheel.indices,[0,1,2,3,4]);
});

test('winning highlights require an actual showdown payout, including side-pot and tie winners',()=>{
 const a=room();a.hand={stage:'complete',showdown:true,board:cards('Qd Js Tc 2h 3c'),winners:[{id:'me',amount:200,hand:'Sảnh'}],pots:[]};
 const selection=winningSelection(a);assert.deepEqual(selection.hole,[0,1]);assert.deepEqual(selection.board,[0,1,2]);assert.equal(selection.cards.length,5);assert.equal(selection.name,'Sảnh');
 a.hand.pots=[{winners:['other'],amount:1000},{winners:['me','third'],amount:400}];assert.equal(winningSelection(a).shared,true);
 a.hand.winners=[{id:'me',amount:500,hand:'Hoàn phần cược dư'}];assert.equal(winningSelection(a),null);
 a.hand.winners=[{id:'other',amount:200,hand:'Sảnh'}];assert.equal(winningSelection(a),null);
 a.hand.winners=[{id:'me',amount:200,hand:'Đối thủ bỏ bài'}];a.hand.showdown=false;assert.equal(winningSelection(a),null);
});

test('board-only wins highlight community cards without inventing a match in the local hand',()=>{
 const a=room();a.players[0].hole=cards('2c 3d');a.hand={stage:'complete',showdown:true,board:cards('Ah Kh Qh Jh Th'),winners:[{id:'me',amount:100,hand:'Thùng phá sảnh'}],pots:[]};
 const selection=winningSelection(a);assert.deepEqual(selection.hole,[]);assert.deepEqual(selection.board,[0,1,2,3,4]);
 a.players[0].folded=true;assert.equal(winningSelection(a),null);
});


test('table highlights winners visible to a losing player and resets next hand',()=>{
 const a=room();a.players[0].hole=cards('2c 3d');a.players[1].hole=cards('Ah Kc');
 a.hand={stage:'complete',showdown:true,board:cards('Qd Js Tc 7h 8c'),winners:[{id:'other',amount:200,hand:'Sảnh'}],pots:[]};
 assert.equal(winningSelection(a),null);
 assert.deepEqual(showdownHighlights(a),{players:{me:[],other:[0,1]},board:[0,1,2]});
 a.hand.winners.push({id:'me',amount:10,hand:'Hoàn phần cược dư'});assert.deepEqual(showdownHighlights(a).players.me,[]);
 a.hand.stage='preflop';assert.equal(showdownHighlights(a),null);
});
