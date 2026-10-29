import {DEFAULT_CHARACTER} from '../public/characters.js';
import {DEFAULT_CHIP_SKIN} from '../public/chip-skin-catalog.js';
export function assetSnapshot(a){return {coins:a.coins,characters:[...(a.ownedSkins||[DEFAULT_CHARACTER])],cards:[...(a.ownedCardSkins||['classic'])],chips:[...(a.ownedChipSkins||[DEFAULT_CHIP_SKIN])],equippedCharacter:a.equippedSkin||DEFAULT_CHARACTER,equippedCards:a.equippedCardSkin||'classic',equippedChips:a.equippedChipSkin||DEFAULT_CHIP_SKIN};}
export function resetAssets(a,grantSkins=[]){
 a.revokedGrantSkins=[...new Set([...(a.revokedGrantSkins||[]),...(a.ownedSkins||[]).filter(id=>id!==DEFAULT_CHARACTER),...grantSkins])];
 a.coins=0;a.ownedSkins=[DEFAULT_CHARACTER];a.equippedSkin=DEFAULT_CHARACTER;a.ownedCardSkins=['classic'];a.equippedCardSkin='classic';a.ownedChipSkins=[DEFAULT_CHIP_SKIN];a.equippedChipSkin=DEFAULT_CHIP_SKIN;a.assetsResetAt=Date.now();
}
export function revokeAsset(a,kind,id){
 const field=kind==='character'?'ownedSkins':kind==='cards'?'ownedCardSkins':'ownedChipSkins';
 const fallback=kind==='character'?DEFAULT_CHARACTER:kind==='cards'?'classic':DEFAULT_CHIP_SKIN;
 a[field]=(a[field]||[fallback]).filter(s=>s!==id);
 if(kind==='character'){a.revokedGrantSkins=[...new Set([...(a.revokedGrantSkins||[]),id])];if(a.equippedSkin===id)a.equippedSkin=DEFAULT_CHARACTER;}
 if(kind==='cards'&&a.equippedCardSkin===id)a.equippedCardSkin='classic';
 if(kind==='chips'&&a.equippedChipSkin===id)a.equippedChipSkin=DEFAULT_CHIP_SKIN;
}
