(this["webpackJsonpvolca-sampler"]=this["webpackJsonpvolca-sampler"]||[]).push([[0],{15:function(Be,re,E){},23:function(Be,re,E){"use strict";E.r(re);var d=E(0),u=E.n(d),Te=E(7),We=E.n(Te),la=E(15),O=E(1),Ne=E(8),Le=E.n(Ne),_e=E(2),W=E.n(_e),oe=E(25),ie=E(5);const N=31250;var Ve=Object.defineProperty,Ue=Object.defineProperties,He=Object.getOwnPropertyDescriptors,L=Object.getOwnPropertySymbols,le=Object.prototype.hasOwnProperty,ce=Object.prototype.propertyIsEnumerable,Y=(e,a,t)=>a in e?Ve(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,j=(e,a)=>{for(var t in a||(a={}))le.call(a,t)&&Y(e,t,a[t]);if(L)for(var t of L(a))ce.call(a,t)&&Y(e,t,a[t]);return e},B=(e,a)=>Ue(e,He(a)),se=(e,a)=>{var t={};for(var n in e)le.call(e,n)&&a.indexOf(n)<0&&(t[n]=e[n]);if(e!=null&&L)for(var n of L(e))a.indexOf(n)<0&&ce.call(e,n)&&(t[n]=e[n]);return t},_=(e,a,t)=>(Y(e,typeof a!="symbol"?a+"":a,t),t),F=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});const V=W.a.createInstance({name:"audio_file_data",driver:W.a.INDEXEDDB}),U=W.a.createInstance({name:"sample_metadata",driver:W.a.INDEXEDDB});function ze(e){return F(this,null,function*(){const a=Object(oe.a)();return yield V.setItem(a,e),a})}const Q="0.3.0",$e={"0.1.0":e=>{const a=e,{clip:t}=a,n=se(a,["clip"]);return B(j({},n),{trimFrames:t.map(i=>Math.round(i*N)),metadataVersion:"0.2.0"})},"0.2.0":e=>F(void 0,null,function*(){const a=e,{trimFrames:t}=a,n=se(a,["trimFrames"]),o=yield $(n.sourceFileId,t),i={frames:t,waveformPeaks:o};return B(j({},n),{trim:i,metadataVersion:"0.3.0"})})};function Ge(e){return F(this,null,function*(){let a=e;for(;a.metadataVersion!==Q;){const t=$e[e.metadataVersion];if(!t){console.warn(`Failed to properly upgrade metadata for sample "${a.name}"`),a={name:a.name,sourceFileId:a.sourceFileId,id:a.id,metadataVersion:Q};break}a=yield t(a)}return a})}const k=class{constructor({name:e,sourceFileId:a,trim:t,id:n=Object(oe.a)(),userFileInfo:o=null,slotNumber:i=0,dateSampled:c=Date.now(),dateModified:l=c,useCompression:r=!0,qualityBitDepth:s=16,scaleCoefficient:p=1}){this.id=n,this.metadata={name:e,sourceFileId:a,trim:t,userFileInfo:o,slotNumber:i,dateSampled:c,dateModified:l,useCompression:r,qualityBitDepth:s,scaleCoefficient:p,metadataVersion:Q}}duplicate(){const e=new k.Mutable(B(j({},this.metadata),{name:`${this.metadata.name} (copy)`,dateModified:Date.now()}));return e.persist(),e}static cacheSourceFileData(e,a){this.sourceFileData.set(e,a),this.recentlyCachedSourceFileIds=[e,...this.recentlyCachedSourceFileIds.filter(n=>n!==e)];const t=this.recentlyCachedSourceFileIds.slice(this.MAX_CACHED);for(const n of t)this.sourceFileData.delete(n);this.recentlyCachedSourceFileIds=this.recentlyCachedSourceFileIds.slice(0,this.MAX_CACHED)}static getSourceFileData(e){return F(this,null,function*(){{const t=this.sourceFileData.get(e);if(t)return t}if(e.includes(".")){const t=yield fetch(e);if(t.status>=400)return Promise.reject(new Error(`Failed to fetch source file "${e}"`));const n=yield t.arrayBuffer(),o=new Uint8Array(n);return this.cacheSourceFileData(e,o),o}const a=yield V.getItem(e);return a?a instanceof Uint8Array?(this.cacheSourceFileData(e,a),a):Promise.reject("Source data is of unexpected type"):Promise.reject("Missing source data")})}static getAllMetadataFromStore(){return F(this,null,function*(){const e=[];return yield U.iterate((t,n)=>{t&&e.push(Ge(t).then(o=>[n,o]))}),new Map(yield Promise.all(e))})}static getAllFromStorage(){return F(this,null,function*(){const e=yield this.getAllMetadataFromStore(),a=yield ue(),t=(yield V.keys()).concat(a.map(({sourceFileId:o})=>o));return[...e].map(([o,i])=>{const{sourceFileId:c}=i;return t.includes(c)?new k.Mutable(j({id:o},i)):(console.warn(`Found metadata "${i.name||o}" with missing data "${c}; ignoring.`),null)}).filter(Boolean).sort((o,i)=>i.metadata.dateModified-o.metadata.dateModified)})}};let D=k;_(D,"Mutable",class extends k{constructor(e){super(e);setTimeout(()=>F(this,null,function*(){(yield U.keys()).includes(this.id)||console.warn(`Expected sample metadata container ${this.id} to be persisted`)}))}persist(){return F(this,null,function*(){yield U.setItem(this.id,this.metadata)})}update(e){const{id:a,metadata:t}=this;if(Object.keys(e).every(i=>e[i]===t[i]))return this;const n=B(j(j({},t),e),{dateModified:Date.now()}),o=new k.Mutable(j({id:a},n));return o.persist(),o}remove(){return F(this,null,function*(){if(yield U.removeItem(this.id),this.metadata.sourceFileId.includes("."))return;const e=yield k.getAllMetadataFromStore();for(const[,{sourceFileId:a}]of e)if(a===this.metadata.sourceFileId)return;yield V.removeItem(this.metadata.sourceFileId)})}}),_(D,"sourceFileData",new Map),_(D,"recentlyCachedSourceFileIds",[]),_(D,"MAX_CACHED",10);let K;function ue(){return K||(K=fetch("factory-samples.json").then(e=>e.json())),K}function Xe(){return F(this,null,function*(){const e=yield ue();return new Map(e.map(a=>[a.id,new D(B(j({},a),{trim:{frames:[a.trim.frames[0],a.trim.frames[1]],waveformPeaks:{positive:new Float32Array(Object(ie.a)(a.trim.waveformPeaks.positive)),negative:new Float32Array(Object(ie.a)(a.trim.waveformPeaks.negative))}}}))]))})}var de=Math.pow,Z=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});function q(e,a){const t=4,n=a[0]*t,o=e.length-a[0]-a[1];return new Float32Array(e.buffer,n,o)}function ee(e,a){const t=e.length-a[0]-a[1],n=new Float32Array(t),o=Array(e.numberOfChannels).fill().map((i,c)=>q(e.getChannelData(c),a));for(let i=0;i<t;i++){let c=0;for(let l=0;l<o.length;l++)c+=o[l][i];c/=o.length,n[i]=c}return n}function Je(e){let a=0;for(const t of e){const n=Math.abs(t);n>a&&(a=n)}return a}function Ye(e,a){if(a!==1)for(let t=0;t<e.length;t++)e[t]*=a}function Qe(e,a){const t=de(2,a-1);for(let n=0;n<e.length;n++)e[n]=Math.round(e[n]*t)/t}function fe(e){for(let a=0;a<e.length;a++)e[a]>1?e[a]=1:e[a]<-1&&(e[a]=-1)}function Ke(e){const a=new Int16Array(e.length),t=de(2,15);for(let n=0;n<e.length;n++)a[n]=e[n]===1?t-1:t*e[n];return a}function me(){return window.AudioContext||window.webkitAudioContext}let pe;function he(){const e=me();return pe=pe||new e({sampleRate:N})}function H(e){return Z(this,null,function*(){const a=new Uint8Array(e);return yield new Promise((n,o)=>{he().decodeAudioData(a.buffer,n,o)})})}function z(e,a){return Z(this,null,function*(){const t=yield D.getSourceFileData(e),n=yield H(t);if(a)for(let o=0;o<n.numberOfChannels;o++)fe(n.getChannelData(o));return n})}function te(e){return Z(this,null,function*(){const{qualityBitDepth:a,sourceFileId:t,userFileInfo:n,scaleCoefficient:o,trim:{frames:i}}=e.metadata;if(a<8||a>16||!Number.isInteger(a))throw new Error(`Expected bit depth between 8 and 16. Received: ${a}`);const c=yield z(t,Boolean(n)),l=c.numberOfChannels===1?q(c.getChannelData(0),i):ee(c,i);o!==1&&Ye(l,o),a<16&&Qe(l,a);const r=Ke(l),s=r.length*2,p=Le()({channels:1,sampleRate:c.sampleRate,bitDepth:16,dataLength:s}),m=new Uint8Array(p.length+s);return m.set(p),m.set(new Uint8Array(r.buffer),p.length),{data:m,sampleRate:16}})}const Ze={playAudioBuffer(e,a){throw new Error("Must render AudioPlaybackContextProvider")},isAudioBusy:!1},ve=Object(d.createContext)(Ze);function qe({children:e}){const[a,t]=Object(d.useState)(!1),n=Object(d.useCallback)((i,{onTimeUpdate:c=()=>null,onEnded:l=()=>null}={})=>{if(a)throw new Error("Wait until audio playback has finished to start new playback");t(!0);let r,s;try{r=he(),s=r.createBufferSource(),s.buffer=i,s.connect(r.destination),s.start()}catch(f){throw t(!1),f}const p=r.currentTime;c(0);let m=requestAnimationFrame(y);function y(){c(r.currentTime-p),m=requestAnimationFrame(y)}let w=!1;return s.addEventListener("ended",()=>{w||(c(i.duration),l()),t(!1),cancelAnimationFrame(m)}),function(){s.stop(),w=!0}},[a]),o=Object(d.useMemo)(()=>({playAudioBuffer:n,isAudioBusy:a}),[n,a]);return Object(d.createElement)(ve.Provider,{value:o},e)}function ye(){return Object(d.useContext)(ve)}var et=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});const x=6,ge=x*44;function be(e,a){const t=Math.floor(x*e.length/a),n=new Float32Array(Math.floor(e.length/t)),o=new Float32Array(Math.floor(e.length/t));for(let i=0;i<n.length;i++){const c=new Float32Array(e.buffer,i*t*4,t);let l=0,r=0;for(const s of c)s>l&&(l=s),s<r&&(r=s);n[i]=Math.min(1,l),o[i]=Math.max(-1,r)}return{positive:n,negative:o}}function $(e,a){return et(this,null,function*(){const t=yield z(e,!1),n=ee(t,a);return be(n,ge)})}var tt=E(9);const at=O.a.canvas({width:"100%",height:"100%",display:"block"});function nt(e,a){function t(o,i){e.width=o,e.height=i}t(e.offsetWidth,e.offsetHeight),a({width:e.offsetWidth,height:e.offsetHeight});const n=new tt.a(([o])=>{const{width:i,height:c}=o.contentRect;t(i,c),a({width:i,height:c})});return n.observe(e),()=>n.disconnect()}function rt(e,a,t){const n=e.getContext("2d"),{width:o,height:i}=e;n.clearRect(0,0,o,i);const c=Math.floor(i*(2/3))+1;n.fillStyle="red",a.positive.forEach((r,s)=>{const p=c*r,m=Math.max(Math.round(t*p),1);n.fillRect(s*x,c-m,x-1,m)});const l=i-c;n.fillStyle="darkred",a.negative.forEach((r,s)=>{const p=l*r*-1,m=Math.round(t*p);n.fillRect(s*x,c,x-1,m)})}function ot({peaks:e,scaleCoefficient:a,waveformRef:t}){const n=Object(d.useRef)(null);Object(d.useImperativeHandle)(t,()=>n.current);const[o,i]=Object(d.useState)(Symbol()),c=Object(d.useRef)({width:0,height:0});return Object(d.useLayoutEffect)(()=>{if(!n.current)throw new Error("Canvas should be defined");return c.current.width=n.current.offsetWidth,c.current.height=n.current.offsetHeight,nt(n.current,({width:l,height:r})=>{(l!==c.current.width||r!==c.current.height)&&(i(Symbol()),c.current.width=l,c.current.height=r)})},[]),Object(d.useLayoutEffect)(()=>{const l=n.current;if(!l)throw new Error("Canvas should be defined");let r=requestAnimationFrame(()=>{r=requestAnimationFrame(()=>{rt(l,e,a)})});return()=>cancelAnimationFrame(r)},[e,a,o]),u.a.createElement(at,{ref:n})}var Se=ot;const it=O.a.div({height:"100%",overflow:"auto"}),we=O.a.div({padding:"0.5rem",border:"1px solid grey",cursor:"pointer",backgroundColor:({$selected:e})=>e?"#f3f3f3":"unset"}),lt=O.a.div({width:`${ge}px`,height:"40px"}),Ee=typeof IntersectionObserver!="undefined",ct=u.a.memo(({sample:e,selected:a,readonly:t,onSampleSelect:n})=>{const o=Object(d.useRef)(null),[i,c]=Object(d.useState)(!Ee);return Object(d.useLayoutEffect)(()=>{if(!Ee)return;const l=o.current;if(!l)throw new Error("Waveform container should be defined");const r=l.getBoundingClientRect();if(r.top+r.height>=0&&r.bottom-r.height<=window.innerHeight){c(!0);return}const s=new IntersectionObserver(([p])=>{p.isIntersecting&&(c(!0),s.unobserve(l))});return s.observe(l),()=>s.disconnect()},[]),u.a.createElement(we,{selected:a,"data-disabled":t,onClick:()=>!t&&n(e.id)},u.a.createElement("div",null,e.metadata.name),u.a.createElement(lt,{ref:o},i&&u.a.createElement(Se,{peaks:e.metadata.trim.waveformPeaks,scaleCoefficient:e.metadata.scaleCoefficient})))});function st({samples:e,selectedSampleId:a,readonly:t,onNewSample:n,onSampleSelect:o}){return u.a.createElement(it,null,u.a.createElement(we,{"data-disabled":t,onClick:()=>!t&&n()},"New Sample"),[...e].map(([i,c])=>u.a.createElement(ct,{key:i,sample:c,selected:i===a,readonly:t,onSampleSelect:o})))}var ut=st,dt=Object.defineProperty,ft=Object.defineProperties,mt=Object.getOwnPropertyDescriptors,G=Object.getOwnPropertySymbols,Oe=Object.prototype.hasOwnProperty,Ce=Object.prototype.propertyIsEnumerable,Pe=(e,a,t)=>a in e?dt(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,pt=(e,a)=>{for(var t in a||(a={}))Oe.call(a,t)&&Pe(e,t,a[t]);if(G)for(var t of G(a))Ce.call(a,t)&&Pe(e,t,a[t]);return e},ht=(e,a)=>ft(e,mt(a)),vt=(e,a)=>{var t={};for(var n in e)Oe.call(e,n)&&a.indexOf(n)<0&&(t[n]=e[n]);if(e!=null&&G)for(var n of G(e))a.indexOf(n)<0&&Ce.call(e,n)&&(t[n]=e[n]);return t},yt=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});const gt=O.a.input({position:"absolute"});function bt({sourceAudioBuffer:e,sample:{metadata:{trim:{frames:a},scaleCoefficient:t}},onSetTrimFrames:n,onSetScaleCoefficient:o}){const i=Object(d.useMemo)(()=>e?ee(e,[0,0]):new Float32Array,[e]),c=Object(d.useRef)(null),l=Object(d.useMemo)(()=>{const m=c.current&&c.current.offsetWidth;return!m||!i.length?{positive:new Float32Array,negative:new Float32Array}:be(i,m)},[i]),r=Object(d.useMemo)(()=>{if(!e)return 0;const m=q(i,a);return Je(m)},[e,i,a]),s=1/r;Object(d.useLayoutEffect)(()=>{t>s&&o(s)},[t,s,o]);const p=t*r;return u.a.createElement(u.a.Fragment,null,u.a.createElement(gt,{type:"range",disabled:r===0,value:p,min:.1,max:1,step:.01,onChange:m=>{r!==0&&o(Number(m.target.value)/r)}}),u.a.createElement(Se,{waveformRef:c,peaks:l,scaleCoefficient:t}),u.a.createElement("button",{type:"button",disabled:t===s,onClick:()=>o(s)},"Normalize"),u.a.createElement("button",{type:"button",disabled:t===1,onClick:()=>o(1)},"Original level"))}function St(e){var a=e,{sample:t}=a,n=vt(a,["sample"]);const[o,i]=Object(d.useState)(null);Object(d.useEffect)(()=>{let l=!1;return(()=>yt(this,null,function*(){if(l)return;const r=yield z(t.metadata.sourceFileId,Boolean(t.metadata.userFileInfo));l||i([t.metadata.sourceFileId,r])}))(),()=>{l=!0}},[t.metadata.sourceFileId,t.metadata.userFileInfo]);const c=Object(d.useRef)(t);return o&&t.metadata.sourceFileId===o[0]&&(c.current=t),u.a.createElement(bt,ht(pt({},n),{sample:c.current,sourceAudioBuffer:o&&o[1]}))}var wt=St,Et=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});let De;function Ot(){return Et(this,null,function*(){if(typeof window.CREATE_SYRO_BINDINGS!="function")return Promise.reject("Expected CREATE_SYRO_BINDINGS global function to exist");const e=yield window.CREATE_SYRO_BINDINGS();return De=De||new Promise((a,t)=>{let n;try{n={prepareSampleBufferFromWavData:e.cwrap("prepareSampleBufferFromWavData",null,["array","number","number","number","number"]),prepareSampleBufferFrom16BitPcmData(){throw new Error("This function does not work. Use prepareSampleBufferFromWavData.")},getSampleBufferPointer:e.cwrap("getSampleBufferPointer","number",["number"]),getSampleBufferSize:e.cwrap("getSampleBufferSize","number",["number"]),getSampleBufferProgress:e.cwrap("getSampleBufferProgress","number",["number"]),registerUpdateCallback(o){return e.addFunction(o,"vi")},unregisterUpdateCallback(o){e.removeFunction(o)},heap8Buffer(){return e.HEAP8.buffer}}}catch(o){t(o);return}a(n)})})}var Ct=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});function Pt(e,a){return Ct(this,null,function*(){const{prepareSampleBufferFromWavData:t,getSampleBufferPointer:n,getSampleBufferSize:o,getSampleBufferProgress:i,registerUpdateCallback:c,unregisterUpdateCallback:l,heap8Buffer:r}=yield Ot(),{data:s}=yield te(e);let p,m=0;const y=c(w=>{const f=n(w),g=o(w);p||(p=new Uint8Array(g)),p.set(new Uint8Array(r(),f,g)),m=i(w)/g});t(s,s.length,e.metadata.slotNumber,e.metadata.qualityBitDepth,e.metadata.useCompression?1:0,y),a(m);try{yield new Promise(w=>{f();function f(){if(m&&(a(m),m>=1)){w();return}requestAnimationFrame(f)}})}finally{l(y)}if(!p)throw new Error("Unexpected condition: sampleBuffer should be defined");return p})}var Dt=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});function At({sample:e}){const[a,t]=Object(d.useState)(0),[n,o]=Object(d.useState)("idle"),i=Object(d.useRef)(()=>{});Object(d.useEffect)(()=>()=>i.current(),[e]);const{playAudioBuffer:c,isAudioBusy:l}=ye();return u.a.createElement(u.a.Fragment,null,u.a.createElement("button",{type:"button",onClick:()=>Dt(this,null,function*(){try{let r=!1;i.current=()=>{o("idle"),r=!0},t(0),o("loading");const s=yield Pt(e,y=>{r||t(y)});if(r)return;o("transferring");const p=yield H(s);if(r)return;const m=c(p,{onTimeUpdate:y=>t(y/p.duration),onEnded:()=>o("idle")});i.current=()=>{m(),o("idle")}}catch(r){console.error(r),o("error")}}),disabled:l||n==="loading"||n==="transferring"},"transfer to volca sample"),u.a.createElement("br",null),n==="idle"?null:n==="error"?"Error transferring":u.a.createElement(u.a.Fragment,null,u.a.createElement("p",null,n==="loading"?"Preparing sample transfer...":"Transferring to Volca Sample..."),u.a.createElement("progress",{value:a}),u.a.createElement("br",null),u.a.createElement("button",{onClick:()=>i.current()},"Cancel")),u.a.createElement("br",null))}var Ft=At,jt=Object.defineProperty,Ae=Object.getOwnPropertySymbols,It=Object.prototype.hasOwnProperty,Mt=Object.prototype.propertyIsEnumerable,Fe=(e,a,t)=>a in e?jt(e,a,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[a]=t,je=(e,a)=>{for(var t in a||(a={}))It.call(a,t)&&Fe(e,t,a[t]);if(Ae)for(var t of Ae(a))Mt.call(a,t)&&Fe(e,t,a[t]);return e},T=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});const kt=O.a.div({paddingLeft:"2rem"}),xt=O.a.div({height:"200px",backgroundColor:"#f3f3f3",maxWidth:"400px"});function Ie(e,a){const t=URL.createObjectURL(e),n=document.createElement("a");n.href=t,n.download=a,n.style.display="none",document.body.appendChild(n),n.click(),n.remove(),URL.revokeObjectURL(t)}function Rt({sample:e,onSampleUpdate:a,onSampleDuplicate:t,onSampleDelete:n}){const[o,i]=Object(d.useState)(0),c=e&&e.metadata.sourceFileId;Object(d.useEffect)(()=>{i(0),c&&z(c,!1).then(f=>i(f.length))},[c]);const l=e&&e.id,r=Object(d.useCallback)(f=>l&&a(l,{scaleCoefficient:f}),[l,a]),{playAudioBuffer:s,isAudioBusy:p}=ye(),m=Object(d.useRef)(()=>{});if(Object(d.useEffect)(()=>()=>m.current(),[e]),!e)return null;const y=Math.max(0,o-e.metadata.trim.frames[1]),w=Math.max(0,o-e.metadata.trim.frames[0]);return u.a.createElement(kt,null,u.a.createElement("h3",null,e.metadata.name),u.a.createElement("button",{type:"button",onClick:()=>t(e.id)},"Duplicate"),u.a.createElement("button",{type:"button",onClick:()=>{window.confirm(`Are you sure you want to delete ${e.metadata.name}?`)&&n(e.id)}},"Remove"),u.a.createElement("h4",null,"Last edited: ",new Date(e.metadata.dateModified).toLocaleString()),u.a.createElement("h4",null,"Sampled: ",new Date(e.metadata.dateSampled).toLocaleString()),u.a.createElement("label",null,u.a.createElement("h4",null,"Trim start"),u.a.createElement("input",{type:"number",value:e.metadata.trim.frames[0],step:1,min:0,max:y,onChange:f=>T(this,null,function*(){if(o){const g=Number(f.target.value),C=[Math.min(g,y),e.metadata.trim.frames[1]],h=yield $(e.metadata.sourceFileId,C);a(e.id,{trim:{frames:C,waveformPeaks:h}})}else a(e.id,{trim:je({},e.metadata.trim)})})})),u.a.createElement("label",null,u.a.createElement("h4",null,"Trim end"),u.a.createElement("input",{type:"number",value:e.metadata.trim.frames[1],step:1,min:0,max:w,onChange:f=>T(this,null,function*(){if(o){const g=Number(f.target.value),C=[e.metadata.trim.frames[0],Math.min(g,w)],h=yield $(e.metadata.sourceFileId,C);a(e.id,{trim:{frames:C,waveformPeaks:h}})}else a(e.id,{trim:je({},e.metadata.trim)})})})),u.a.createElement(xt,null,u.a.createElement(wt,{onSetTrimFrames:()=>null,onSetScaleCoefficient:r,sample:e}),u.a.createElement("button",{type:"button",onClick:()=>T(this,null,function*(){const{data:f}=yield te(e),g=yield H(f);m.current=s(g)}),disabled:p},"play"),u.a.createElement("button",{type:"button",onClick:()=>T(this,null,function*(){const{data:f}=yield te(e),g=new Blob([f],{type:"audio/x-wav"});Ie(g,`${e.metadata.name}.wav`)})},"download"),u.a.createElement("button",{type:"button",onClick:()=>T(this,null,function*(){const{sourceFileId:f,userFileInfo:g}=e.metadata,C=yield D.getSourceFileData(f),h=new Blob([C],{type:g?g.type:"audio/x-wav"});Ie(h,`${e.metadata.name}${g?g.ext:".wav"}`)})},"download (orig)")),u.a.createElement("h4",null,"Quality bit depth: ",e.metadata.qualityBitDepth),u.a.createElement("input",{type:"range",value:e.metadata.qualityBitDepth,step:1,min:8,max:16,onChange:f=>{const g=Number(f.target.value);a(e.id,{qualityBitDepth:g})}}),u.a.createElement("label",null,u.a.createElement("h4",null,"Slot number"),u.a.createElement("input",{type:"number",value:e.metadata.slotNumber,step:1,min:0,max:99,onChange:f=>{const g=Number(f.target.value);a(e.id,{slotNumber:g})}})),u.a.createElement(Ft,{sample:e}))}var Bt=Rt,Tt=E(10),X=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});let Me;function ae(){const e=me();return Me=Me||new e(navigator.mediaDevices.getSupportedConstraints().sampleRate?{sampleRate:N}:{})}function Wt(){return X(this,null,function*(){{const n=yield navigator.mediaDevices.getUserMedia({audio:!0,video:!1});for(const o of n.getTracks())o.stop()}const a=(yield navigator.mediaDevices.enumerateDevices()).filter(n=>n.kind==="audioinput"),t=[];for(const n of a){const o=yield navigator.mediaDevices.getUserMedia({audio:{deviceId:n.deviceId,channelCount:2},video:!1}),i=(yield navigator.mediaDevices.enumerateDevices()).find(({deviceId:l})=>n.deviceId===l).label,c=o.getAudioTracks().length;for(const l of o.getTracks())l.stop();t.push({device:{deviceId:n.deviceId,label:i},channelsAvailable:c})}return t})}let ne;function Nt(e){return X(this,arguments,function*({onData:a,onFinish:t}){const n=ae();ne=ne||n.audioWorklet.addModule("recorderWorkletProcessor.js"),yield ne;const o=new AudioWorkletNode(n,"recorder-worklet",{parameterData:{bufferSize:1024}});o.port.onmessage=c=>{if(c.data.eventType==="data"){const l=c.data.audioChannels;a(l)}c.data.eventType==="stop"&&t()};const i=o.parameters.get("isRecording");return i.setValueAtTime(1,n.currentTime),{recorderNode:o,stop(){i.setValueAtTime(0,n.currentTime)}}})}function Lt({channelCount:e,onData:a,onFinish:t}){const o=ae().createScriptProcessor(1024,e,e);let i=!1;return o.onaudioprocess=c=>{const l=Array(e).fill().map((r,s)=>c.inputBuffer.getChannelData(s));a(l),i&&t()},{recorderNode:o,stop(){i=!0}}}function _t(e){return X(this,null,function*(){return typeof AudioWorkletNode=="undefined"?Lt(e):yield Nt(e)})}function Vt(e){return X(this,arguments,function*({deviceId:a,channelCount:t,onStart:n}){const o=yield navigator.mediaDevices.getUserMedia({audio:{deviceId:a,channelCount:t,sampleRate:N,echoCancellation:!1,autoGainControl:!1,noiseSuppression:!1},video:!1}),i=ae(),c=i.createMediaStreamSource(o),{recorderNode:l,stop:r}=yield _t({channelCount:t,onData:w,onFinish:v});c.connect(l),l.connect(i.destination),n();const p=10*i.sampleRate;let m=0;const y=Array(t).fill([]);function w(S){let b=0;for(let P=0;P<t;P++){const M=S[P],R=M.length,A=M.slice(0,Math.min(R,p-m));fe(A),b||(b=A.length),y[P].push(A)}m+=b,m>=p&&(v(),r())}let f,g;const C=new Promise((S,b)=>{f=S,g=b});let h=!1;function v(){if(h)return;try{const b=y.map(R=>{const A=new Float32Array(R.reduce((J,ia)=>J+ia.length,0));let I=0;for(const J of R)A.set(J,I),I+=J.length;return A}),P=new Tt.a;P.fromScratch(b.length,i.sampleRate,"32f",b);const M=P.toBuffer();f(M)}catch(b){g(b)}const S=o.getTracks();for(const b of S)b.stop();l.disconnect(i.destination),c.disconnect(l),h=!0}return{stop:r,mediaRecording:C}})}var ke=Object.getOwnPropertySymbols,Ut=Object.prototype.hasOwnProperty,Ht=Object.prototype.propertyIsEnumerable,zt=(e,a)=>{var t={};for(var n in e)Ut.call(e,n)&&a.indexOf(n)<0&&(t[n]=e[n]);if(e!=null&&ke)for(var n of ke(e))a.indexOf(n)<0&&Ht.call(e,n)&&(t[n]=e[n]);return t},xe=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});const $t=O.a.div({padding:"2rem"});let Re=null;function Gt({onRecordStart:e,onRecordFinish:a,onRecordError:t}){const[n,o]=Object(d.useState)(Re),[i,c]=Object(d.useState)(n?"ok":"pending"),[l,r]=Object(d.useState)("");Object(d.useEffect)(()=>{Re=n,c("ok")},[n]);const s=Object(d.useCallback)(()=>{Wt().then(h=>{h.length&&(o(new Map(h.map(v=>[v.device.deviceId,v]))),r(v=>v||h[0].device.deviceId))}).catch(h=>{if(h instanceof DOMException){if(h.name==="NotAllowedError"){c("denied");return}if(h.name==="NotFoundError"){c("unavailable");return}}throw h})},[]);Object(d.useEffect)(s,[s]);const[p,m]=Object(d.useState)(1);Object(d.useEffect)(()=>{const h=n&&n.get(l);h&&m(h.channelsAvailable)},[n,l]);const[y,w]=Object(d.useState)(null);Object(d.useEffect)(()=>{y&&t(y)},[y,t]);const[f,g]=Object(d.useState)({fn:()=>{}}),C=Object(d.useCallback)(()=>xe(this,null,function*(){const{mediaRecording:h,stop:v}=yield Vt({deviceId:l,channelCount:p,onStart:e});g({fn:v});let S;try{S=yield h}catch(b){w(b);return}a(S)}),[l,p,e,a]);return{captureDevices:n,accessState:i,selectedCaptureDeviceId:l,selectedChannelCount:p,recordingError:y,refreshCaptureDevices:s,setSelectedCaptureDeviceId:r,setSelectedChannelCount:m,beginRecording:C,stopRecording:f.fn}}function Xt(e){var a=e,{captureState:t}=a,n=zt(a,["captureState"]);const{captureDevices:o,accessState:i,selectedCaptureDeviceId:c,selectedChannelCount:l,recordingError:r,refreshCaptureDevices:s,setSelectedCaptureDeviceId:p,setSelectedChannelCount:m,beginRecording:y,stopRecording:w}=Gt(n);return u.a.createElement($t,null,i==="denied"?u.a.createElement("p",null,"Looks like you didn't grant access to your audio input device. Please give Volca Sampler access, then"," ",u.a.createElement("button",{type:"button",onClick:s},"try again")):i==="unavailable"?u.a.createElement("p",null,"Volca Sampler couldn't find any audio input devices. Please connect one, then"," ",u.a.createElement("button",{type:"button",onClick:s},"try again")):u.a.createElement("div",null,u.a.createElement("label",null,"Capture Device",u.a.createElement("select",{value:c,onChange:f=>p(f.target.value)},o&&i==="ok"?[...o].map(([f,{device:g}])=>u.a.createElement("option",{key:f,value:f},g.label||f)):u.a.createElement("option",{value:"",disabled:!0},"Loading devices..."))),u.a.createElement("label",null,"Channel count",u.a.createElement("select",{value:l,onChange:f=>m(Number(f.target.value))},[1,2].map(f=>u.a.createElement("option",{key:f,value:f,disabled:!o||!o.has(c)||o.get(c).channelsAvailable<f},f))))),u.a.createElement("button",{type:"button",onClick:t==="capturing"?w:y,disabled:t==="preparing"},["capturing","preparing"].includes(t)?"Stop":"Record"),u.a.createElement("input",{type:"file",accept:"audio/*,.wav,.mp3,.ogg",onChange:f=>{if(f.target.files&&f.target.files.length){const g=f.target.files[0];g.arrayBuffer().then(C=>xe(this,null,function*(){const h=new Uint8Array(C);let v;try{v=yield H(h)}catch(S){alert("Unsupported audio format detected");return}if(v.length>10*v.sampleRate){alert("Please select an audio file no more than 10 seconds long");return}n.onRecordFinish(h,g)}))}}}),t==="error"&&r||null)}var Jt=Xt,Yt=(e,a,t)=>new Promise((n,o)=>{var i=r=>{try{l(t.next(r))}catch(s){o(s)}},c=r=>{try{l(t.throw(r))}catch(s){o(s)}},l=r=>r.done?n(r.value):Promise.resolve(r.value).then(i,c);l((t=t.apply(e,a)).next())});const Qt=O.a.h1({display:"flex",alignItems:"center",padding:"2rem",paddingBottom:"0px",marginBottom:"0px"}),Kt=O.a.span({color:"red"}),Zt=O.a.span({textTransform:"uppercase",textDecoration:"underline"}),qt=O.a.img({height:"1.6em",paddingLeft:"1rem"}),ea=O.a.div({padding:"2rem",display:"flex",height:"100%"}),ta=O.a.div({width:"300px",flexShrink:0,paddingRight:"0.5rem",height:"100%"}),aa=O.a.div({flexGrow:1});function na(){const[e,a]=Object(d.useState)(!1),[t,n]=Object(d.useState)(new Map),[o,i]=Object(d.useState)(new Map);Object(d.useEffect)(()=>{Xe().then(i).catch(console.error)},[]);const[c,l]=Object(d.useState)(null),[r,s]=Object(d.useState)(!0),[p,m]=Object(d.useState)("idle"),y=e?o:t;Object(d.useEffect)(()=>{D.getAllFromStorage().then(h=>{n(v=>new Map([...v,...h.map(S=>[S.id,S])]))}).finally(()=>{s(!1)})},[]),Object(d.useEffect)(()=>{y.size&&!(c&&y.has(c))&&l([...y.values()][0].id)},[y,c]);const w=Object(d.useCallback)(()=>m("capturing"),[]),f=Object(d.useCallback)((h,v)=>Yt(this,null,function*(){m("preparing");const S=yield ze(h);let b="",P="";if(v){const I=v.name.lastIndexOf(".");I>0?(b=v.name.slice(0,I),P=v.name.slice(I)):b=v.name}else b="New one";const M=[0,0],R=yield $(S,M),A=new D.Mutable({name:b,sourceFileId:S,trim:{frames:M,waveformPeaks:R},userFileInfo:v&&{type:v.type,ext:P}});yield A.persist(),n(I=>new Map([[A.id,A],...I])),a(!1),l(A.id),m("idle")}),[]),g=Object(d.useCallback)(h=>{console.error(h),m("error")},[]),C=Object(d.useCallback)((h,v)=>{n(S=>{const b=S.get(h);if(b&&b instanceof D.Mutable){const P=b.update(v);if(P!==b)return new Map(S).set(b.id,P)}return S})},[]);return u.a.createElement("div",null,u.a.createElement(Qt,null,u.a.createElement(Kt,null,"Volca Sample",u.a.createElement(Zt,null,"r")),u.a.createElement(qt,{src:"volca_sample.png",alt:""})),u.a.createElement(ea,null,u.a.createElement("select",{value:JSON.stringify(e),onChange:h=>a(JSON.parse(h.target.value))},u.a.createElement("option",{value:"false"},"Your Samples"),u.a.createElement("option",{value:"true"},"Factory Samples")),u.a.createElement(ta,null,r?"Loading...":null,u.a.createElement(ut,{samples:y,selectedSampleId:p==="idle"?c:null,readonly:["capturing","preparing"].includes(p),onNewSample:()=>m("ready"),onSampleSelect:h=>{l(h),m("idle")}})),u.a.createElement(aa,null,p==="idle"&&u.a.createElement(Bt,{sample:c&&y.get(c)||null,onSampleUpdate:C,onSampleDuplicate:h=>{const v=y.get(h);if(v){const S=v.duplicate();n(b=>new Map([[S.id,S],...b])),a(!1),l(S.id)}},onSampleDelete:h=>{const v=y.get(h);v&&v instanceof D.Mutable&&(v.remove(),n(S=>{const b=new Map(S);return b.delete(v.id),b}))}}),p!=="idle"&&u.a.createElement(Jt,{captureState:p,onRecordStart:w,onRecordFinish:f,onRecordError:g}))))}var ra=na,oa=e=>{e&&e instanceof Function&&E.e(3).then(E.bind(null,26)).then(({getCLS:a,getFID:t,getFCP:n,getLCP:o,getTTFB:i})=>{a(e),t(e),n(e),o(e),i(e)})};We.a.render(u.a.createElement(u.a.StrictMode,null,u.a.createElement(qe,null,u.a.createElement(ra,null))),document.getElementById("root")),oa()}},[[23,1,2]]]);

//# sourceMappingURL=main.df755d10.chunk.js.map