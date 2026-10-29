export const HUMAN_TOUR_REWARDS=Object.freeze({2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9});
export function tournamentReward(players=[]){
 const entrants=players.length,mode=players.some(p=>p.isBot)?'bot':'human';
 return {version:2,entrants,mode,amount:entrants>=2&&entrants<=9?(mode==='bot'?1:HUMAN_TOUR_REWARDS[entrants]):0};
}
