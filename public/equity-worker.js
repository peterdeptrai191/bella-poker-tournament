import {estimateEquity} from './poker-insights.js';
self.onmessage=({data})=>{
 try{self.postMessage({key:data.key,...estimateEquity(data.input)});}
 catch{self.postMessage({key:data.key,error:true});}
};
