(this["webpackJsonpvolca-sampler"]=this["webpackJsonpvolca-sampler"]||[]).push([[0],{13:function(L,Y,S){},21:function(L,Y,S){"use strict";S.r(Y);var f=S(0),i=S.n(f),he=S(6),ye=S.n(he),Aa=S(13),Se=Object.defineProperty,we=Object.defineProperties,ge=Object.getOwnPropertyDescriptors,Q=Object.getOwnPropertySymbols,Ie=Object.prototype.hasOwnProperty,Ce=Object.prototype.propertyIsEnumerable,Z=(e,a,t)=>a in e?Se(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,Ne=(e,a)=>{for(var t in a||(a={}))Ie.call(a,t)&&Z(e,t,a[t]);if(Q)for(var t of Q(a))Ce.call(a,t)&&Z(e,t,a[t]);return e},Fe=(e,a)=>we(e,ge(a));{const e=`
.sampleList {
  height: 100%;
  overflow: auto;
}

.sampleListItem {
  padding: 0.5rem;
  border: 1px solid grey;
  cursor: pointer;
}

.sampleListItem:not:nth-child(1) {
  margin-top: 1rem;
}
  `,a=document.createElement("style");a.innerHTML=e,document.body.appendChild(a)}const T=["sampleList","sampleListItem"].reduce((e,a)=>Fe(Ne({},e),{[a]:a}),{});function Pe({samples:e,selectedSampleId:a,readonly:t,onNewSample:r,onSampleSelect:l}){return i.a.createElement("div",{className:T.sampleList},i.a.createElement("div",{"data-disabled":t,className:T.sampleListItem,onClick:()=>!t&&r()},"New Sample"),[...e].map(([o,s])=>i.a.createElement("div",{key:o,className:T.sampleListItem,style:{backgroundColor:o===a?"#f3f3f3":void 0},"data-disabled":t,onClick:()=>!t&&l(o)},i.a.createElement("div",null,s.metadata.name),i.a.createElement("div",null,"Updated ",new Date(s.metadata.dateModified).toLocaleString()))))}var Ee=Pe,De=S(7),Oe=S.n(De),He=S(1),R=S.n(He),q=S(23),ee=S(3),Be=Object.defineProperty,Ae=Object.defineProperties,Re=Object.getOwnPropertyDescriptors,ae=Object.getOwnPropertySymbols,Me=Object.prototype.hasOwnProperty,ke=Object.prototype.propertyIsEnumerable,_=(e,a,t)=>a in e?Be(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,B=(e,a)=>{for(var t in a||(a={}))Me.call(a,t)&&_(e,t,a[t]);if(ae)for(var t of ae(a))ke.call(a,t)&&_(e,t,a[t]);return e},te=(e,a)=>Ae(e,Re(a)),M=(e,a,t)=>(_(e,typeof a!="symbol"?a+"":a,t),t),D=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});const V=R.a.createInstance({name:"wav_data",driver:R.a.INDEXEDDB}),k=R.a.createInstance({name:"sample_metadata",driver:R.a.INDEXEDDB});function je(e){return D(this,null,function*(){const a=Object(q.a)();return yield V.setItem(a,e),a})}const re="0.1.0",A=class{constructor({name:e,sourceFileId:a,id:t=Object(q.a)(),slotNumber:r=0,dateSampled:l=Date.now(),dateModified:o=l,useCompression:s=!1,qualityBitDepth:c=16,normalize:n=!1,clip:d=[0,0]}){this.id=t,this.metadata={name:e,sourceFileId:a,slotNumber:r,dateSampled:l,dateModified:o,useCompression:s,qualityBitDepth:c,normalize:n,clip:d,metadataVersion:re}}duplicate(){const e=new A.Mutable(te(B({},this.metadata),{name:`${this.metadata.name} (copy)`,dateModified:Date.now()}));return e.persist(),e}static cacheSourceFileData(e,a){this.sourceFileData.set(e,a),this.recentlyCachedSourceFileIds=[e,...this.recentlyCachedSourceFileIds.filter(r=>r!==e)];const t=this.recentlyCachedSourceFileIds.slice(this.MAX_CACHED);for(const r of t)this.sourceFileData.delete(r);this.recentlyCachedSourceFileIds=this.recentlyCachedSourceFileIds.slice(0,this.MAX_CACHED)}static getSourceFileData(e){return D(this,null,function*(){{const t=this.sourceFileData.get(e);if(t)return t}if(e.includes(".")){const t=yield(yield fetch(e)).arrayBuffer(),r=new Uint8Array(t);return this.cacheSourceFileData(e,r),r}const a=yield V.getItem(e);return a?a instanceof Uint8Array?(this.cacheSourceFileData(e,a),a):Promise.reject("Source data is of unexpected type"):Promise.reject("Missing source data")})}static getAllFromStorage(){return D(this,null,function*(){const e=new Map;yield k.iterate((r,l)=>{r&&r.metadataVersion===re?e.set(l,r):console.warn(`Found metadata "${r.name||l} with unhandled version ${r.metadataVersion}"; ignoring.`)});const a=(yield V.keys()).concat(ee.map(({sourceFileId:r})=>r));return[...e].map(([r,l])=>{const{sourceFileId:o}=l;return a.includes(o)?new A.Mutable(B({id:r},l)):(console.warn(`Found metadata "${l.name||r}" with missing data "${o}; ignoring.`),null)}).filter(Boolean).sort((r,l)=>l.metadata.dateModified-r.metadata.dateModified)})}};let C=A;M(C,"Mutable",class extends A{constructor(e){super(e);setTimeout(()=>D(this,null,function*(){(yield k.keys()).includes(this.id)||console.warn(`Expected sample metadata container ${this.id} to be persisted`)}))}persist(){return D(this,null,function*(){yield k.setItem(this.id,this.metadata)})}update(e){const{id:a,metadata:t}=this,r=te(B(B({},t),e),{dateModified:Date.now()}),l=new A.Mutable(B({id:a},r));return l.persist(),l}remove(){return D(this,null,function*(){yield k.removeItem(this.id)})}}),M(C,"sourceFileData",new Map),M(C,"recentlyCachedSourceFileIds",[]),M(C,"MAX_CACHED",10);const xe=new Map(ee.map(e=>[e.id,new C(e)])),O=31250;var le=Math.pow,W=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});function Le(e){return W(this,null,function*(){if(e.sampleRate===O)return e;const a=O/e.sampleRate,t=new OfflineAudioContext(e.numberOfChannels,e.length*a,O),r=t.createBufferSource();return r.buffer=e,r.connect(t.destination),r.start(),yield t.startRendering()})}function ne(e,a){const t=4,r=a[0]*t,l=e.length-a[0]-a[1];return new Float32Array(e.buffer,r,l)}function oe(e,a){const t=e.length-a[0]-a[1],r=new Float32Array(t),l=Array(e.numberOfChannels).fill().map((o,s)=>ne(e.getChannelData(s),a));for(let o=0;o<t;o++){let s=0;for(let c=0;c<l.length;c++)s+=l[c][o];s/=l.length,r[o]=s}return r}function K(e){let a=0;for(const t of e){const r=Math.abs(t);r>a&&(a=r)}return a}function Te(e,a){if(a!==1)for(let t=0;t<e.length;t++)e[t]*=a}function _e(e,a=1){const t=a/K(e);Te(e,t)}function Ve(e,a){const t=le(2,a-1);for(let r=0;r<e.length;r++)e[r]=Math.round(e[r]*t)/t}function We(e){const a=new Int16Array(e.length),t=le(2,15);for(let r=0;r<e.length;r++)a[r]=e[r]===1?t-1:t*e[r];return a}let ce;function Ke(){return ce=ce||new AudioContext({sampleRate:O})}function se(e){return W(this,null,function*(){const a=new Uint8Array(e);return yield new Promise((r,l)=>{Ke().decodeAudioData(a.buffer,r,l)})})}function z(e){return W(this,null,function*(){const{qualityBitDepth:a,normalize:t,clip:r}=e.metadata;if(a<8||a>16||!Number.isInteger(a))throw new Error(`Expected bit depth between 8 and 16. Received: ${a}`);const l=yield Le(yield se(yield C.getSourceFileData(e.metadata.sourceFileId))),o=r.map(u=>Math.round(u*l.sampleRate)),s=l.numberOfChannels===1?ne(l.getChannelData(0),o):oe(l,o);t&&_e(s,t),a<16&&Ve(s,a);const c=We(s),n=c.length*2,d=Oe()({channels:1,sampleRate:l.sampleRate,bitDepth:16,dataLength:n}),b=new Uint8Array(d.length+n);return b.set(d),b.set(new Uint8Array(c.buffer),d.length),{data:b,sampleRate:16}})}var ze=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});function Ue(e,a){const t=new Float32Array(Math.floor(e.length/a)),r=new Float32Array(Math.floor(e.length/a));for(let l=0;l<t.length;l++){const o=new Float32Array(e.buffer,l*a*4,a);let s=0,c=0;for(const n of o)n>s&&(s=n),n<c&&(c=n);t[l]=s,r[l]=c}return{positive:t,negative:r}}function $e({sample:e,onSetClip:a,onSetNormalize:t}){const[r,l]=Object(f.useState)(new Float32Array);Object(f.useEffect)(()=>{let u=!1;return(()=>ze(this,null,function*(){if(u)return;const p=yield C.getSourceFileData(e.metadata.sourceFileId);if(u)return;const N=yield se(p);if(u)return;const m=oe(N,[0,0]);l(m)}))(),()=>{u=!0}},[e.metadata.sourceFileId]);const o=Object(f.useRef)(null),s=6,c=Object(f.useMemo)(()=>{const u=o.current&&o.current.offsetWidth;if(!u||!r.length)return{positive:new Float32Array,negative:new Float32Array};const p=Math.floor(s*r.length/u);return Ue(r,p)},[r]),n=Object(f.useMemo)(()=>Math.max(K(c.negative),K(c.positive)),[c]),b=(e.metadata.normalize||n)/n;return i.a.createElement("div",{className:"waveform",style:{width:"100%",height:"100%",position:"relative",overflow:"hidden"},ref:o},i.a.createElement("div",{className:"positive",style:{width:"100%",height:"67%",display:"flex",alignItems:"flex-end"}},i.a.createElement("div",{className:"scaled",style:{width:"100%",height:`${100*b}%`,willChange:"height",display:"flex",alignItems:"flex-end"}},[].map.call(c.positive,(u,p)=>i.a.createElement("div",{key:p,className:"bar",style:{width:s,height:`${100*u}%`,paddingRight:1}},i.a.createElement("div",{className:"bar_inner",style:{backgroundColor:"red",height:"100%"}}))))),i.a.createElement("div",{className:"negative",style:{width:"100%",height:"33%",display:"flex",alignItems:"flex-start"}},i.a.createElement("div",{className:"scaled",style:{width:"100%",height:`${100*b}%`,willChange:"height",display:"flex",alignItems:"flex-start"}},[].map.call(c.negative,(u,p)=>i.a.createElement("div",{key:p,className:"bar",style:{width:s,height:`${100*-u}%`,paddingRight:1}},i.a.createElement("div",{className:"bar_inner",style:{backgroundColor:"darkred",height:"100%"}}))))),i.a.createElement("input",{style:{position:"absolute",top:0,left:0},type:"range",value:e.metadata.normalize||void 0,min:.1,max:1,step:.01,onChange:u=>t(Number(u.target.value))}))}var Ge=$e,Je=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});let de;function Xe(){return Je(this,null,function*(){if(typeof window.CREATE_SYRO_BINDINGS!="function")return Promise.reject("Expected CREATE_SYRO_BINDINGS global function to exist");const e=yield window.CREATE_SYRO_BINDINGS();return de=de||new Promise((a,t)=>{let r;try{r={prepareSampleBufferFromWavData:e.cwrap("prepareSampleBufferFromWavData","number",["array","number","number","number"]),prepareSampleBufferFrom16BitPcmData:e.cwrap("prepareSampleBufferFrom16BitPcmData","number",["array","number","number","number","number"]),startSampleBufferFrom16BitPcmData:e.cwrap("startSampleBufferFrom16BitPcmData","number",["array","number","number","number","number"]),iterateSampleBuffer:e.cwrap("iterateSampleBuffer",null,["number"]),getSampleBufferPointer:e.cwrap("getSampleBufferPointer","number",[]),getSampleBufferSize:e.cwrap("getSampleBufferSize","number",[]),getSampleBufferProgress:e.cwrap("getSampleBufferProgress","number",[]),freeSampleBuffer:e.cwrap("freeSampleBuffer",null,[]),heap8Buffer(){return e.HEAP8.buffer}}}catch(l){t(l);return}a(r)})})}var Ye=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});function Qe(e,a){return Ye(this,null,function*(){const{startSampleBufferFrom16BitPcmData:t,iterateSampleBuffer:r,getSampleBufferPointer:l,getSampleBufferSize:o,getSampleBufferProgress:s,freeSampleBuffer:c,heap8Buffer:n}=yield Xe(),{data:d,sampleRate:b}=yield z(e),u=d.slice(44);if(t(u,u.length,b,e.metadata.slotNumber,e.metadata.qualityBitDepth,e.metadata.useCompression?1:0))return Promise.reject("Failed to prepare sample buffer");const N=l(),m=o(),v=new Uint8Array(n(),N,m);a(s()/m),yield new Promise((w,x)=>{const P=10;let y=P*2,F=1e5;requestAnimationFrame(E);function E(){if(s()>=m){w();return}const H=P/y,g=Math.max(Math.round(F*H),1),I=performance.now();try{r(g)}catch(X){x(X);return}y=performance.now()-I,y===0&&(y=.5),F=g,a(s()/m),requestAnimationFrame(E)}});const h=new Uint8Array(v);return c(),h})}var Ze=Object.defineProperty,qe=Object.defineProperties,ea=Object.getOwnPropertyDescriptors,ie=Object.getOwnPropertySymbols,aa=Object.prototype.hasOwnProperty,ta=Object.prototype.propertyIsEnumerable,me=(e,a,t)=>a in e?Ze(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,ra=(e,a)=>{for(var t in a||(a={}))aa.call(a,t)&&me(e,t,a[t]);if(ie)for(var t of ie(a))ta.call(a,t)&&me(e,t,a[t]);return e},la=(e,a)=>qe(e,ea(a)),U=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});{const e=`
.sampleDetail {
  padding-left: 2rem;
}
  `,a=document.createElement("style");a.innerHTML=e,document.body.appendChild(a)}const na=["sampleDetail"].reduce((e,a)=>la(ra({},e),{[a]:a}),{});function ue(e){const a=new Blob([e],{type:"audio/x-wav"}),t=document.createElement("audio");t.src=URL.createObjectURL(a),t.play(),t.onended=()=>{URL.revokeObjectURL(t.src)}}function oa({sample:e,onSampleUpdate:a,onSampleDuplicate:t,onSampleDelete:r}){return e?i.a.createElement("div",{className:na.sampleDetail},i.a.createElement("h3",null,e.metadata.name),i.a.createElement("button",{type:"button",onClick:()=>t(e.id)},"Duplicate"),i.a.createElement("button",{type:"button",onClick:()=>{window.confirm(`Are you sure you want to delete ${e.metadata.name}?`)&&r(e.id)}},"Remove"),i.a.createElement("h4",null,"Last edited: ",new Date(e.metadata.dateModified).toLocaleString()),i.a.createElement("h4",null,"Sampled: ",new Date(e.metadata.dateSampled).toLocaleString()),i.a.createElement("label",null,i.a.createElement("h4",null,"Clip start"),i.a.createElement("input",{type:"number",value:e.metadata.clip[0],step:.1,min:0,onChange:l=>{const o=Number(l.target.value);a(e.id,{clip:[o,e.metadata.clip[1]]})}})),i.a.createElement("label",null,i.a.createElement("h4",null,"Clip end"),i.a.createElement("input",{type:"number",value:e.metadata.clip[1],step:.1,min:0,onChange:l=>{const o=Number(l.target.value);a(e.id,{clip:[e.metadata.clip[0],o]})}})),i.a.createElement("div",{style:{height:200,backgroundColor:"#f3f3f3",maxWidth:400}},i.a.createElement(Ge,{onSetClip:()=>null,onSetNormalize:l=>a(e.id,{normalize:l}),sample:e}),i.a.createElement("button",{type:"button",disabled:e.metadata.normalize===1,onClick:()=>a(e.id,{normalize:1})},"Normalize"),i.a.createElement("button",{type:"button",disabled:!e.metadata.normalize,onClick:()=>a(e.id,{normalize:!1})},"Original level"),i.a.createElement("button",{type:"button",onClick:()=>U(this,null,function*(){const{data:l}=yield z(e);ue(l)})},"regular play"),i.a.createElement("button",{type:"button",onClick:()=>U(this,null,function*(){const{data:l}=yield z(e),o=new Blob([l],{type:"audio/x-wav"}),s=URL.createObjectURL(o),c=document.createElement("a");c.href=s,c.download=`${e.metadata.name}.wav`,c.style.display="none",document.body.appendChild(c),c.click(),c.remove(),URL.revokeObjectURL(s)})},"download")),i.a.createElement("h4",null,"Quality bit depth: ",e.metadata.qualityBitDepth),i.a.createElement("input",{type:"range",value:e.metadata.qualityBitDepth,step:1,min:8,max:16,onChange:l=>{const o=Number(l.target.value);a(e.id,{qualityBitDepth:o})}}),i.a.createElement("label",null,i.a.createElement("h4",null,"Slot number"),i.a.createElement("input",{type:"number",value:e.metadata.slotNumber,step:1,min:0,max:99,onChange:l=>{const o=Number(l.target.value);a(e.id,{slotNumber:o})}})),i.a.createElement("button",{type:"button",onClick:()=>U(this,null,function*(){try{const l=yield Qe(e,console.log);ue(l)}catch(l){console.error(l)}})},"transfer to volca sample")):null}var ca=oa,sa=S(8),j=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});let pe;function $(){return pe=pe||new AudioContext(navigator.mediaDevices.getSupportedConstraints().sampleRate?{sampleRate:O}:{})}function da(){return j(this,null,function*(){const a=(yield navigator.mediaDevices.enumerateDevices()).filter(r=>r.kind==="audioinput"),t=[];for(const r of a){const l=yield navigator.mediaDevices.getUserMedia({audio:{deviceId:r.deviceId,channelCount:2},video:!1}),o=(yield navigator.mediaDevices.enumerateDevices()).find(({deviceId:c})=>r.deviceId===c).label,s=l.getAudioTracks().length;for(const c of l.getTracks())c.stop();t.push({device:{deviceId:r.deviceId,label:o},channelsAvailable:s})}return t})}let G;function ia(e){return j(this,arguments,function*({onData:a,onFinish:t}){const r=$();G=G||r.audioWorklet.addModule("/recorderWorkletProcessor.js"),yield G;const l=new AudioWorkletNode(r,"recorder-worklet",{parameterData:{bufferSize:1024}});l.port.onmessage=s=>{if(s.data.eventType==="data"){const c=s.data.audioChannels;a(c)}s.data.eventType==="stop"&&t()};const o=l.parameters.get("isRecording");return o.setValueAtTime(1,r.currentTime),{recorderNode:l,stop(){o.setValueAtTime(0,r.currentTime)}}})}function ma({channelCount:e,onData:a,onFinish:t}){const l=$().createScriptProcessor(1024,e,e);let o=!1;return l.onaudioprocess=s=>{const c=Array(e).fill().map((n,d)=>s.inputBuffer.getChannelData(d));a(c),o&&t()},{recorderNode:l,stop(){o=!0}}}function ua(e){return j(this,null,function*(){return typeof AudioWorkletNode=="undefined"?ma(e):yield ia(e)})}function pa(e){return j(this,arguments,function*({deviceId:a,channelCount:t,onStart:r}){const l=yield navigator.mediaDevices.getUserMedia({audio:{deviceId:a,channelCount:t,sampleRate:O,echoCancellation:!1,autoGainControl:!1,noiseSuppression:!1},video:!1}),o=$(),s=o.createMediaStreamSource(l),{recorderNode:c,stop:n}=yield ua({channelCount:t,onData:N,onFinish:x});s.connect(c),c.connect(o.destination),r();const b=10*o.sampleRate;let u=0;const p=Array(t).fill([]);function N(P){let y=0;for(let F=0;F<t;F++){const E=P[F],H=E.length,g=E.slice(0,Math.min(H,b-u));for(let I=0;I<g.length;I++)g[I]>1?g[I]=1:g[I]<-1&&(g[I]=-1);y||(y=g.length),p[F].push(g)}u+=y,u>=b&&(x(),n())}let m,v;const h=new Promise((P,y)=>{m=P,v=y});let w=!1;function x(){if(w)return;try{const y=p.map(E=>{const H=new Float32Array(E.reduce((I,X)=>I+X.length,0));let g=0;for(const I of E)H.set(I,g),g+=I.length;return H}),F=new sa.a;F.fromScratch(y.length,o.sampleRate,"32f",y),m(F.toBuffer())}catch(y){v(y)}const P=l.getTracks();for(const y of P)y.stop();c.disconnect(o.destination),s.disconnect(c),w=!0}return{stop:n,mediaRecording:h}})}var fe=Object.getOwnPropertySymbols,fa=Object.prototype.hasOwnProperty,ba=Object.prototype.propertyIsEnumerable,va=(e,a)=>{var t={};for(var r in e)fa.call(e,r)&&a.indexOf(r)<0&&(t[r]=e[r]);if(e!=null&&fe)for(var r of fe(e))a.indexOf(r)<0&&ba.call(e,r)&&(t[r]=e[r]);return t},ha=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});function ya({onRecordStart:e,onRecordFinish:a,onRecordError:t}){const[r,l]=Object(f.useState)(null),[o,s]=Object(f.useState)("");Object(f.useEffect)(()=>{da().then(m=>{m.length&&(l(new Map(m.map(v=>[v.device.deviceId,v]))),s(v=>v||m[0].device.deviceId))})},[]);const[c,n]=Object(f.useState)(1);Object(f.useEffect)(()=>{const m=r&&r.get(o);m&&n(m.channelsAvailable)},[r,o]);const[d,b]=Object(f.useState)(null);Object(f.useEffect)(()=>{d&&t(d)},[d,t]);const[u,p]=Object(f.useState)({fn:()=>{}}),N=Object(f.useCallback)(()=>ha(this,null,function*(){const{mediaRecording:m,stop:v}=yield pa({deviceId:o,channelCount:c,onStart:e});p({fn:v});let h;try{h=yield m}catch(w){b(w);return}a(h)}),[o,c,e,a]);return{captureDevices:r,selectedCaptureDeviceId:o,selectedChannelCount:c,recordingError:d,setSelectedCaptureDeviceId:s,setSelectedChannelCount:n,beginRecording:N,stopRecording:u.fn}}function Sa(e){var a=e,{captureState:t}=a,r=va(a,["captureState"]);const{captureDevices:l,selectedCaptureDeviceId:o,selectedChannelCount:s,recordingError:c,setSelectedCaptureDeviceId:n,setSelectedChannelCount:d,beginRecording:b,stopRecording:u}=ya(r);return t==="idle"?null:i.a.createElement("div",{style:{paddingLeft:"2rem"}},l?i.a.createElement("div",null,i.a.createElement("label",null,"Capture Device",i.a.createElement("select",{value:o,onChange:p=>n(p.target.value)},[...l].map(([p,{device:N}])=>i.a.createElement("option",{key:p,value:p},N.label||p)))),i.a.createElement("label",null,"Channel count",i.a.createElement("select",{value:s,onChange:p=>d(Number(p.target.value))},[1,2].map(p=>i.a.createElement("option",{key:p,value:p,disabled:!l.has(o)||l.get(o).channelsAvailable<p},p))))):"Loading capture devices...",i.a.createElement("button",{type:"button",onClick:t==="capturing"?u:b,disabled:t==="preparing"},["capturing","preparing"].includes(t)?"Stop":"Record"))}var wa=Sa,ga=Object.defineProperty,Ia=Object.defineProperties,Ca=Object.getOwnPropertyDescriptors,be=Object.getOwnPropertySymbols,Na=Object.prototype.hasOwnProperty,Fa=Object.prototype.propertyIsEnumerable,ve=(e,a,t)=>a in e?ga(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,Pa=(e,a)=>{for(var t in a||(a={}))Na.call(a,t)&&ve(e,t,a[t]);if(be)for(var t of be(a))Fa.call(a,t)&&ve(e,t,a[t]);return e},Ea=(e,a)=>Ia(e,Ca(a)),Da=(e,a,t)=>new Promise((r,l)=>{var o=n=>{try{c(t.next(n))}catch(d){l(d)}},s=n=>{try{c(t.throw(n))}catch(d){l(d)}},c=n=>n.done?r(n.value):Promise.resolve(n.value).then(o,s);c((t=t.apply(e,a)).next())});{const e=`
.volcaSampler {
  padding: 2rem;
  display: flex;
  height: 100%;
}

.sampleListContainer {
  width: 200px;
  flex-shrink: 0;
  padding-right: 0.5rem;
  height: 100%;
}

.focusedSampleContainer {
  flex-grow: 1;
}

.focusedSample {
  padding-left: 2rem;
}
  `,a=document.createElement("style");a.innerHTML=e,document.body.appendChild(a)}const J=["volcaSampler","sampleListContainer","sampleList","sampleListItem","focusedSampleContainer","focusedSample"].reduce((e,a)=>Ea(Pa({},e),{[a]:a}),{});function Oa(){const[e,a]=Object(f.useState)(!1),[t,r]=Object(f.useState)(new Map),[l,o]=Object(f.useState)(null),[s,c]=Object(f.useState)(!0),[n,d]=Object(f.useState)("idle"),b=e?xe:t;Object(f.useEffect)(()=>{C.getAllFromStorage().then(m=>{r(v=>new Map([...v,...m.map(h=>[h.id,h])]))}).finally(()=>{c(!1)})},[]),Object(f.useEffect)(()=>{b.size&&!(l&&b.has(l))&&o([...b.values()][0].id)},[b,l]);const u=Object(f.useCallback)(()=>d("capturing"),[]),p=Object(f.useCallback)(m=>Da(this,null,function*(){d("preparing");const v=yield je(m),h=new C.Mutable({name:"New one",sourceFileId:v});yield h.persist(),r(w=>new Map([[h.id,h],...w])),a(!1),o(h.id),d("idle")}),[]),N=Object(f.useCallback)(m=>{console.error(m),d("error")},[]);return i.a.createElement("div",{className:J.volcaSampler},i.a.createElement("select",{value:JSON.stringify(e),onChange:m=>a(JSON.parse(m.target.value))},i.a.createElement("option",{value:"false"},"Your Samples"),i.a.createElement("option",{value:"true"},"Factory Samples")),i.a.createElement("div",{className:J.sampleListContainer},i.a.createElement(Ee,{samples:b,selectedSampleId:n==="idle"?l:null,readonly:["capturing","preparing"].includes(n),onNewSample:()=>d("ready"),onSampleSelect:m=>{o(m),d("idle")}})),i.a.createElement("div",{className:J.focusedSampleContainer},n==="idle"&&i.a.createElement(ca,{sample:l&&b.get(l)||null,onSampleUpdate:(m,v)=>{const h=b.get(m);h&&h instanceof C.Mutable&&r(w=>new Map(w).set(h.id,h.update(v)))},onSampleDuplicate:m=>{const v=b.get(m);if(v){const h=v.duplicate();r(w=>new Map([[h.id,h],...w])),a(!1)}},onSampleDelete:m=>{const v=b.get(m);v&&v instanceof C.Mutable&&(v.remove(),r(h=>{const w=new Map(h);return w.delete(v.id),w}))}}),i.a.createElement(wa,{captureState:n,onRecordStart:u,onRecordFinish:p,onRecordError:N})))}var Ha=Oa,Ba=e=>{e&&e instanceof Function&&S.e(3).then(S.bind(null,24)).then(({getCLS:a,getFID:t,getFCP:r,getLCP:l,getTTFB:o})=>{a(e),t(e),r(e),l(e),o(e)})};ye.a.render(i.a.createElement(i.a.StrictMode,null,i.a.createElement(Ha,null)),document.getElementById("root")),Ba()},3:function(L){L.exports=JSON.parse('[{"name":"Kick 1","sourceFileId":"/factory-samples/00 Kick 1.wav","id":"674c0b49-9b56-4f86-a422-03bc6f3596e9","slotNumber":0,"dateSampled":1412121600000},{"name":"Kick 2","sourceFileId":"/factory-samples/01 Kick 2.wav","id":"d04126c9-639f-4577-81ae-c9d423ce2301","slotNumber":1,"dateSampled":1412121600000},{"name":"Kick 3","sourceFileId":"/factory-samples/02 Kick 3.wav","id":"8acc8b27-6712-4923-b5dc-2d4e05bf4570","slotNumber":2,"dateSampled":1412121600000},{"name":"Kick 4","sourceFileId":"/factory-samples/03 Kick 4.wav","id":"195873d4-fb05-45ae-b19c-70637fa83eac","slotNumber":3,"dateSampled":1412121600000},{"name":"Kick 5","sourceFileId":"/factory-samples/04 Kick 5.wav","id":"63be9e7e-8529-4b1e-91e5-6ca4f1231013","slotNumber":4,"dateSampled":1412121600000},{"name":"Kick 6","sourceFileId":"/factory-samples/05 Kick 6.wav","id":"728799b3-c6e0-4186-8841-fe00d98fd67a","slotNumber":5,"dateSampled":1412121600000},{"name":"Kick 7","sourceFileId":"/factory-samples/06 Kick 7.wav","id":"17b37b2b-3630-4d9b-bf32-9efd805330de","slotNumber":6,"dateSampled":1412121600000},{"name":"Kick 8","sourceFileId":"/factory-samples/07 Kick 8.wav","id":"7c0145ec-c7e7-4ab9-b6d6-59a703a9f06d","slotNumber":7,"dateSampled":1412121600000},{"name":"Kick 9","sourceFileId":"/factory-samples/08 Kick 9.wav","id":"e9bc7f89-8b7a-4da0-9f20-c4f817c95b1e","slotNumber":8,"dateSampled":1412121600000},{"name":"Kick 10","sourceFileId":"/factory-samples/09 Kick 10.wav","id":"e37943db-0060-48a0-a384-2c3212d522a8","slotNumber":9,"dateSampled":1412121600000},{"name":"Snare 1","sourceFileId":"/factory-samples/10 Snare 1.wav","id":"2e4ffebc-cc2d-4aa7-90b5-95416038dca9","slotNumber":10,"dateSampled":1412121600000},{"name":"Snare 2","sourceFileId":"/factory-samples/11 Snare 2.wav","id":"a4c72f41-920b-4b40-a1e5-d017e95d4124","slotNumber":11,"dateSampled":1412121600000},{"name":"Snare 3","sourceFileId":"/factory-samples/12 Snare 3.wav","id":"b58c7d3f-9be0-431c-9a5d-2a501644db23","slotNumber":12,"dateSampled":1412121600000},{"name":"Snare 4","sourceFileId":"/factory-samples/13 Snare 4.wav","id":"17a95762-fe48-48dc-a9fc-15341be23a61","slotNumber":13,"dateSampled":1412121600000},{"name":"Snare 5","sourceFileId":"/factory-samples/14 Snare 5.wav","id":"a54bb1f8-b869-4528-bc14-ed2798c217b6","slotNumber":14,"dateSampled":1412121600000},{"name":"Snare 6","sourceFileId":"/factory-samples/15 Snare 6.wav","id":"f3c668ad-bb01-4906-aadd-875ac9241ec3","slotNumber":15,"dateSampled":1412121600000},{"name":"Snare 7","sourceFileId":"/factory-samples/16 Snare 7.wav","id":"b7c3796d-8ab1-45c1-a87c-84a50995245f","slotNumber":16,"dateSampled":1412121600000},{"name":"Snare 8","sourceFileId":"/factory-samples/17 Snare 8.wav","id":"79ad9fca-3d6b-426f-919c-de7b8c61a48f","slotNumber":17,"dateSampled":1412121600000},{"name":"Snare 9","sourceFileId":"/factory-samples/18 Snare 9.wav","id":"1543519d-76b3-420d-963c-34412bb216ea","slotNumber":18,"dateSampled":1412121600000},{"name":"Snare 10","sourceFileId":"/factory-samples/19 Snare 10.wav","id":"15e7ca6d-d2f1-46ff-892a-7f2db29eafb5","slotNumber":19,"dateSampled":1412121600000},{"name":"Snare 11","sourceFileId":"/factory-samples/20 Snare 11.wav","id":"13f7e51c-6056-446a-9c19-5f160da195ca","slotNumber":20,"dateSampled":1412121600000},{"name":"Snare 12","sourceFileId":"/factory-samples/21 Snare 12.wav","id":"9492caba-2718-4be3-9a2d-1ebb383453c4","slotNumber":21,"dateSampled":1412121600000},{"name":"Clap 1","sourceFileId":"/factory-samples/22 Clap 1.wav","id":"daedf4eb-a8aa-413d-bdaf-718b917dcd04","slotNumber":22,"dateSampled":1412121600000},{"name":"Clap 2","sourceFileId":"/factory-samples/23 Clap 2.wav","id":"cf514145-abf7-4b45-acb0-54490562499b","slotNumber":23,"dateSampled":1412121600000},{"name":"Clap 3","sourceFileId":"/factory-samples/24 Clap 3.wav","id":"a1f39f29-4c13-43ba-9226-21ab01797af0","slotNumber":24,"dateSampled":1412121600000},{"name":"Clap 4","sourceFileId":"/factory-samples/25 Clap 4.wav","id":"9f9e05bf-74f0-40e9-aecc-63d25ccd3747","slotNumber":25,"dateSampled":1412121600000},{"name":"Clap 5","sourceFileId":"/factory-samples/26 Clap 5.wav","id":"f222b3b0-2863-4d7b-ba54-5476e44eda48","slotNumber":26,"dateSampled":1412121600000},{"name":"Clap 6","sourceFileId":"/factory-samples/27 Clap 6.wav","id":"708b133c-c5df-4130-8718-0cc4c2403a4a","slotNumber":27,"dateSampled":1412121600000},{"name":"Clap 7","sourceFileId":"/factory-samples/28 Clap 7.wav","id":"f8ffe081-5d8a-470c-bd55-98adb7b69841","slotNumber":28,"dateSampled":1412121600000},{"name":"Clap 8","sourceFileId":"/factory-samples/29 Clap 8.wav","id":"11d520f7-8345-40c4-ba25-d9c91a97451d","slotNumber":29,"dateSampled":1412121600000},{"name":"Hihat 1","sourceFileId":"/factory-samples/30 Hihat 1.wav","id":"0736ceaf-0c54-4b2f-b54c-25eb6c62a89d","slotNumber":30,"dateSampled":1412121600000},{"name":"Hihat 2","sourceFileId":"/factory-samples/31 Hihat 2.wav","id":"af6a1b14-66d8-4aa6-a37e-93db0a8dba0f","slotNumber":31,"dateSampled":1412121600000},{"name":"Hihat 3","sourceFileId":"/factory-samples/32 Hihat 3.wav","id":"343586fd-e5c1-4fc4-97a7-935feaf4c57f","slotNumber":32,"dateSampled":1412121600000},{"name":"Hihat 4","sourceFileId":"/factory-samples/33 Hihat 4.wav","id":"d5305d0d-37d6-4b94-8ce8-2b7af93b9b0f","slotNumber":33,"dateSampled":1412121600000},{"name":"Hihat 5","sourceFileId":"/factory-samples/34 Hihat 5.wav","id":"0745de06-1e97-4901-bc94-e16bb1457335","slotNumber":34,"dateSampled":1412121600000},{"name":"Hihat 6","sourceFileId":"/factory-samples/35 Hihat 6.wav","id":"85f33cec-cac7-4e23-b202-b1d309503c7b","slotNumber":35,"dateSampled":1412121600000},{"name":"Hihat 7","sourceFileId":"/factory-samples/36 Hihat 7.wav","id":"9be1ede4-d827-43cd-901a-c3a2d7641862","slotNumber":36,"dateSampled":1412121600000},{"name":"Hihat 8","sourceFileId":"/factory-samples/37 Hihat 8.wav","id":"ffb997b7-e7a8-4641-91e2-2e30ee540184","slotNumber":37,"dateSampled":1412121600000},{"name":"Hihat 9","sourceFileId":"/factory-samples/38 Hihat 9.wav","id":"1fdba9e9-1a49-4369-862b-3365da315b8a","slotNumber":38,"dateSampled":1412121600000},{"name":"Hihat 10","sourceFileId":"/factory-samples/39 Hihat 10.wav","id":"cf2d322c-0ef0-42d3-909b-5e13c06a0830","slotNumber":39,"dateSampled":1412121600000},{"name":"Crash","sourceFileId":"/factory-samples/40 Crash.wav","id":"7413762c-1469-4285-943e-1c51c12694ee","slotNumber":40,"dateSampled":1412121600000},{"name":"Ride","sourceFileId":"/factory-samples/41 Ride.wav","id":"135bc122-dd1a-445a-a8f4-00d493bc77b1","slotNumber":41,"dateSampled":1412121600000},{"name":"Swoosh","sourceFileId":"/factory-samples/42 Swoosh.wav","id":"47f82612-ac7b-4ec9-94d3-92c2abadeca9","slotNumber":42,"dateSampled":1412121600000},{"name":"SynthRim","sourceFileId":"/factory-samples/43 SynthRim.wav","id":"0dde4fcf-9ad4-4e62-80d0-9c297f4b9a3f","slotNumber":43,"dateSampled":1412121600000},{"name":"SynthTom 1","sourceFileId":"/factory-samples/44 SynthTom 1.wav","id":"2d66d78e-c28d-4dbb-b13f-6bd6acf5b1e7","slotNumber":44,"dateSampled":1412121600000},{"name":"SynthTom 2","sourceFileId":"/factory-samples/45 SynthTom 2.wav","id":"94fca74f-fbfb-4345-a18f-3f136afd5336","slotNumber":45,"dateSampled":1412121600000},{"name":"SynthTom 3","sourceFileId":"/factory-samples/46 SynthTom 3.wav","id":"676aa9e2-438c-4ef5-b2a0-2eb0daa28f29","slotNumber":46,"dateSampled":1412121600000},{"name":"SynthTom 4","sourceFileId":"/factory-samples/47 SynthTom 4.wav","id":"eec1fe3b-e414-4b5c-9391-840c080c620a","slotNumber":47,"dateSampled":1412121600000},{"name":"Tom 1","sourceFileId":"/factory-samples/48 Tom 1.wav","id":"149536bb-6f01-4212-a331-7880ff273ad6","slotNumber":48,"dateSampled":1412121600000},{"name":"Tom 2","sourceFileId":"/factory-samples/49 Tom 2.wav","id":"28199438-1200-4e93-aa76-aa274120c478","slotNumber":49,"dateSampled":1412121600000},{"name":"SynthCow","sourceFileId":"/factory-samples/50 SynthCow.wav","id":"031af0c9-d02f-4deb-bda6-627e25b47959","slotNumber":50,"dateSampled":1412121600000},{"name":"Bongo","sourceFileId":"/factory-samples/51 Bongo.wav","id":"1fe1ba0b-9183-4327-8f43-766b69b04eb9","slotNumber":51,"dateSampled":1412121600000},{"name":"DoncaClaves","sourceFileId":"/factory-samples/52 DoncaClaves.wav","id":"edd2dee1-9a54-4f8e-b9b7-9ecfde191a52","slotNumber":52,"dateSampled":1412121600000},{"name":"SynthShaker","sourceFileId":"/factory-samples/53 SynthShaker.wav","id":"3b20b2b5-c220-4f57-8b40-1eb93417c90d","slotNumber":53,"dateSampled":1412121600000},{"name":"Tambourine","sourceFileId":"/factory-samples/54 Tambourine.wav","id":"a16dea7c-25aa-4ba5-98d3-4d723c5ab59d","slotNumber":54,"dateSampled":1412121600000},{"name":"Cowbell","sourceFileId":"/factory-samples/55 Cowbell.wav","id":"963d006a-4673-43a8-b8ce-167d127cb524","slotNumber":55,"dateSampled":1412121600000},{"name":"DoncaSConga","sourceFileId":"/factory-samples/56 DoncaSConga.wav","id":"7112d02a-7084-4959-9f97-d7636de5b984","slotNumber":56,"dateSampled":1412121600000},{"name":"DoncaLBongo","sourceFileId":"/factory-samples/57 DoncaLBongo.wav","id":"33563087-8b03-41ec-881c-8d94ad224a07","slotNumber":57,"dateSampled":1412121600000},{"name":"SynthPerc","sourceFileId":"/factory-samples/58 SynthPerc.wav","id":"c5280095-99b4-4b8a-ab8a-c50c89df7485","slotNumber":58,"dateSampled":1412121600000},{"name":"WhiteNoise","sourceFileId":"/factory-samples/59 WhiteNoise.wav","id":"299af12e-b028-441d-ad26-8cc286b0dbf0","slotNumber":59,"dateSampled":1412121600000},{"name":"SynthHit 1","sourceFileId":"/factory-samples/60 SynthHit 1.wav","id":"6dcc045f-3165-4c70-9d14-7e95ebd271c0","slotNumber":60,"dateSampled":1412121600000},{"name":"SynthHit 2","sourceFileId":"/factory-samples/61 SynthHit 2.wav","id":"4a788daf-90be-4eec-8ce0-7d839798072e","slotNumber":61,"dateSampled":1412121600000},{"name":"SynthHit 3","sourceFileId":"/factory-samples/62 SynthHit 3.wav","id":"e2bac4cf-b4e0-424d-87c2-9bdc0395f3f3","slotNumber":62,"dateSampled":1412121600000},{"name":"SynthHit 4","sourceFileId":"/factory-samples/63 SynthHit 4.wav","id":"9a27ac71-8f54-4a32-8fb5-a83b25be76c8","slotNumber":63,"dateSampled":1412121600000},{"name":"SynthHit 5","sourceFileId":"/factory-samples/64 SynthHit 5.wav","id":"9784441b-06da-425e-a7b7-95994e77517e","slotNumber":64,"dateSampled":1412121600000},{"name":"SynthHit 6","sourceFileId":"/factory-samples/65 SynthHit 6.wav","id":"b4f6b321-176c-46f8-ad08-3c231d219711","slotNumber":65,"dateSampled":1412121600000},{"name":"SynthHit 7","sourceFileId":"/factory-samples/66 SynthHit 7.wav","id":"595e50ca-bc55-4c1a-9c00-67b5be711a5d","slotNumber":66,"dateSampled":1412121600000},{"name":"SynthHit 8","sourceFileId":"/factory-samples/67 SynthHit 8.wav","id":"7510c919-37fd-4ac5-9679-56d10d7cc769","slotNumber":67,"dateSampled":1412121600000},{"name":"SynthHit 9","sourceFileId":"/factory-samples/68 SynthHit 9.wav","id":"54c53b7a-0917-4955-9edc-98a55000bc15","slotNumber":68,"dateSampled":1412121600000},{"name":"SynthHit 10","sourceFileId":"/factory-samples/69 SynthHit 10.wav","id":"bfe483a2-511e-49ef-bec5-a0d6054ef7e6","slotNumber":69,"dateSampled":1412121600000},{"name":"PianoChord 1","sourceFileId":"/factory-samples/70 PianoChord 1.wav","id":"4a412fff-1037-4b62-bc3c-6a9c792ca6ee","slotNumber":70,"dateSampled":1412121600000},{"name":"PianoChord 2","sourceFileId":"/factory-samples/71 PianoChord 2.wav","id":"9549856b-4b78-45be-b9d1-011bb6331172","slotNumber":71,"dateSampled":1412121600000},{"name":"PianoChord 3","sourceFileId":"/factory-samples/72 PianoChord 3.wav","id":"02e65257-9e44-4d3b-b2eb-76e28ffc3582","slotNumber":72,"dateSampled":1412121600000},{"name":"EPChord 1","sourceFileId":"/factory-samples/73 EPChord 1.wav","id":"552a2757-603c-4787-9b5e-a8d85de7eb63","slotNumber":73,"dateSampled":1412121600000},{"name":"EPChord 2","sourceFileId":"/factory-samples/74 EPChord 2.wav","id":"13ef1c2d-a8fc-4916-bfd3-4ed9a99edc7b","slotNumber":74,"dateSampled":1412121600000},{"name":"EPChord 3","sourceFileId":"/factory-samples/75 EPChord 3.wav","id":"34cd91af-ae29-4113-9756-d0d02b584929","slotNumber":75,"dateSampled":1412121600000},{"name":"EPChord 4","sourceFileId":"/factory-samples/76 EPChord 4.wav","id":"6e1aa299-2f1b-4fde-9fee-5c5949c6ede5","slotNumber":76,"dateSampled":1412121600000},{"name":"OrganChord","sourceFileId":"/factory-samples/77 OrganChord.wav","id":"69aff7ae-c19c-4643-a984-79e5bec72d06","slotNumber":77,"dateSampled":1412121600000},{"name":"BandHit 1","sourceFileId":"/factory-samples/78 BandHit 1.wav","id":"f1a09a44-30e2-451d-88c7-2a70a2d87378","slotNumber":78,"dateSampled":1412121600000},{"name":"BandHit 2","sourceFileId":"/factory-samples/79 BandHit 2.wav","id":"90020385-3479-4551-8354-dcd559efb80f","slotNumber":79,"dateSampled":1412121600000},{"name":"BandHit 3","sourceFileId":"/factory-samples/80 BandHit 3.wav","id":"44eaf71d-2099-468b-9528-83758d164036","slotNumber":80,"dateSampled":1412121600000},{"name":"StringsHit 1","sourceFileId":"/factory-samples/81 StringsHit 1.wav","id":"2649fd35-d87c-4cdc-84ad-c03545763c0b","slotNumber":81,"dateSampled":1412121600000},{"name":"Choir","sourceFileId":"/factory-samples/82 Choir.wav","id":"c6206ad1-2f1f-41e4-aadd-7bf59d685aea","slotNumber":82,"dateSampled":1412121600000},{"name":"GuitarHit 1","sourceFileId":"/factory-samples/83 GuitarHit 1.wav","id":"8e43279d-4324-4af2-8a46-39a6393903ca","slotNumber":83,"dateSampled":1412121600000},{"name":"GuitarHit 2","sourceFileId":"/factory-samples/84 GuitarHit 2.wav","id":"50d4e1ff-180e-4cad-b3c1-2c801f013f9e","slotNumber":84,"dateSampled":1412121600000},{"name":"KalimbaChord","sourceFileId":"/factory-samples/85 KalimbaChord.wav","id":"d1f33352-5e51-42de-b135-77f350e0c639","slotNumber":85,"dateSampled":1412121600000},{"name":"SynChord","sourceFileId":"/factory-samples/86 SynChord.wav","id":"65a60241-3392-4917-9ba9-7c2080719d9b","slotNumber":86,"dateSampled":1412121600000},{"name":"BellChord","sourceFileId":"/factory-samples/87 BellChord.wav","id":"3419b335-a772-4af1-99cc-7f3c75d83feb","slotNumber":87,"dateSampled":1412121600000},{"name":"WindChime","sourceFileId":"/factory-samples/88 WindChime.wav","id":"3ab7c545-2e53-4a97-a466-8a3f3ed8aad9","slotNumber":88,"dateSampled":1412121600000},{"name":"Airhorn","sourceFileId":"/factory-samples/89 Airhorn.wav","id":"ae736115-1905-401c-b298-df470fe00bd3","slotNumber":89,"dateSampled":1412121600000},{"name":"VocalHit 1","sourceFileId":"/factory-samples/90 VocalHit 1.wav","id":"b77622cb-542e-4b29-8bf3-8c24425c7a96","slotNumber":90,"dateSampled":1412121600000},{"name":"VocalHit 2","sourceFileId":"/factory-samples/91 VocalHit 2.wav","id":"6c05da7e-ecc8-47de-b2cd-fa1cc353b72e","slotNumber":91,"dateSampled":1412121600000},{"name":"VocalHit 3","sourceFileId":"/factory-samples/92 VocalHit 3.wav","id":"547e92d5-f8e2-4be7-8a84-1949d8cb9c46","slotNumber":92,"dateSampled":1412121600000},{"name":"VocalHit 4","sourceFileId":"/factory-samples/93 VocalHit 4.wav","id":"df4e7830-04ce-419a-bd11-a5c539758d65","slotNumber":93,"dateSampled":1412121600000},{"name":"VocalHit 5","sourceFileId":"/factory-samples/94 VocalHit 5.wav","id":"2a6386f9-9e7f-4c7e-9daa-3982c9a39c1b","slotNumber":94,"dateSampled":1412121600000},{"name":"VocalHit 6","sourceFileId":"/factory-samples/95 VocalHit 6.wav","id":"c3a623f0-cd4b-4e1d-8946-08d48cce6f3c","slotNumber":95,"dateSampled":1412121600000},{"name":"VocalHit 7","sourceFileId":"/factory-samples/96 VocalHit 7.wav","id":"3219c1d3-6a46-44c6-8f71-04575ced990d","slotNumber":96,"dateSampled":1412121600000},{"name":"VocalHit 8","sourceFileId":"/factory-samples/97 VocalHit 8.wav","id":"00e02e92-1cc9-4c09-9a3e-66f8398e9b8f","slotNumber":97,"dateSampled":1412121600000},{"name":"VocalHit 9","sourceFileId":"/factory-samples/98 VocalHit 9.wav","id":"82da24c3-6571-4117-8762-03c883b6bca9","slotNumber":98,"dateSampled":1412121600000},{"name":"Doncamatic","sourceFileId":"/factory-samples/99 Doncamatic.wav","id":"3e7868e7-8064-4a11-b050-5f78711f0e12","slotNumber":99,"dateSampled":1412121600000}]')}},[[21,1,2]]]);

//# sourceMappingURL=main.d1d75395.chunk.js.map