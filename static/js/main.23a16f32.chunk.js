(this["webpackJsonpvolca-sampler"]=this["webpackJsonpvolca-sampler"]||[]).push([[0],{22:function(H,V,C){H.exports={title:"Header_title__R3bRx",menuIcon:"Header_menuIcon__swn7p",titleText:"Header_titleText__3e5ME",titleR:"Header_titleR__3QRgv",titleStarburst:"Header_titleStarburst__1oLYP",titleGraphic:"Header_titleGraphic__3S89F"}},64:function(H,V,C){},65:function(H,V,C){},76:function(H,V,C){"use strict";C.r(V);var d=C(0),i=C.n(d),Xe=C(14),$e=C.n(Xe),fa=C(64),ma=C(65),R=C(11),Ge=C(22),x=C.n(Ge);function Ke({onMenuOpen:e,onHeaderClick:t}){return i.a.createElement("h1",{className:x.a.title,onClick:t},i.a.createElement("span",{className:x.a.menuIcon,onClick:a=>{a.stopPropagation(),e()}},"\u2630"),i.a.createElement("span",{className:x.a.titleText,"data-text":"Volca Sample"},"Volca Sample",i.a.createElement("span",{className:x.a.titleR},"r"),i.a.createElement("div",{className:x.a.titleStarburst},Array(24).fill().map((a,n,{length:o})=>i.a.createElement("span",{key:n,style:{"--rotation":`${n*360/o}deg`}})))),i.a.createElement("img",{className:x.a.titleGraphic,src:"volca_sample.png",alt:""}),i.a.createElement("svg",{width:0,height:0},i.a.createElement("filter",{id:"outline"},i.a.createElement("feMorphology",{in:"SourceAlpha",result:"DILATED",operator:"dilate",radius:"1"}),i.a.createElement("feFlood",{floodColor:"var(--stroke-color)",floodOpacity:"1",result:"PINK"}),i.a.createElement("feComposite",{in:"PINK",in2:"DILATED",operator:"in",result:"OUTLINE"}),i.a.createElement("feMerge",null,i.a.createElement("feMergeNode",{in:"OUTLINE"}),i.a.createElement("feMergeNode",{in:"SourceGraphic"})))))}var Ye=Ke,U=C(88),Je=C(41),se=C.n(Je),Qe=C(37),z=C.n(Qe),ue=C(89),de=C(53);const X=31250;var _e=Object.defineProperty,Ze=Object.defineProperties,qe=Object.getOwnPropertyDescriptors,$=Object.getOwnPropertySymbols,fe=Object.prototype.hasOwnProperty,me=Object.prototype.propertyIsEnumerable,Z=(e,t,a)=>t in e?_e(e,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):e[t]=a,I=(e,t)=>{for(var a in t||(t={}))fe.call(t,a)&&Z(e,a,t[a]);if($)for(var a of $(t))me.call(t,a)&&Z(e,a,t[a]);return e},N=(e,t)=>Ze(e,qe(t)),pe=(e,t)=>{var a={};for(var n in e)fe.call(e,n)&&t.indexOf(n)<0&&(a[n]=e[n]);if(e!=null&&$)for(var n of $(e))t.indexOf(n)<0&&me.call(e,n)&&(a[n]=e[n]);return a},G=(e,t,a)=>(Z(e,typeof t!="symbol"?t+"":t,a),a),k=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});const K=z.a.createInstance({name:"audio_file_data",driver:z.a.INDEXEDDB}),Y=z.a.createInstance({name:"sample_metadata",driver:z.a.INDEXEDDB});function et(e){return k(this,null,function*(){const t=Object(ue.a)();return yield K.setItem(t,e),t})}const q="0.3.0",tt={"0.1.0":e=>{const t=e,{clip:a}=t,n=pe(t,["clip"]);return N(I({},n),{trimFrames:a.map(l=>Math.round(l*X)),metadataVersion:"0.2.0"})},"0.2.0":e=>k(void 0,null,function*(){const t=e,{trimFrames:a}=t,n=pe(t,["trimFrames"]),o=yield Ae(n.sourceFileId,a),l={frames:a,waveformPeaks:o};return N(I({},n),{trim:l,metadataVersion:"0.3.0"})})};function at(e){return k(this,null,function*(){let t=e;for(;t.metadataVersion!==q;){const a=tt[e.metadataVersion];if(!a){console.warn(`Failed to properly upgrade metadata for sample "${t.name}"`),t={name:t.name,sourceFileId:t.sourceFileId,id:t.id,metadataVersion:q};break}t=yield a(t)}return t})}const T=class{constructor({name:e,sourceFileId:t,trim:a,id:n=Object(ue.a)(),userFileInfo:o=null,slotNumber:l=0,dateSampled:c=Date.now(),dateModified:s=c,useCompression:r=!0,qualityBitDepth:u=16,scaleCoefficient:O=1}){this.id=n,this.metadata={name:e,sourceFileId:t,trim:a,userFileInfo:o,slotNumber:l,dateSampled:c,dateModified:s,useCompression:r,qualityBitDepth:u,scaleCoefficient:O,metadataVersion:q}}duplicate(){const e=new T.Mutable(N(I({},this.metadata),{name:`${this.metadata.name} (copy)`,dateModified:Date.now()}));return e.persist(),e}static cacheSourceFileData(e,t){this.sourceFileData.set(e,t),this.recentlyCachedSourceFileIds=[e,...this.recentlyCachedSourceFileIds.filter(n=>n!==e)];const a=this.recentlyCachedSourceFileIds.slice(this.MAX_CACHED);for(const n of a)this.sourceFileData.delete(n);this.recentlyCachedSourceFileIds=this.recentlyCachedSourceFileIds.slice(0,this.MAX_CACHED)}static getSourceFileData(e){return k(this,null,function*(){{const a=this.sourceFileData.get(e);if(a)return a}if(e.includes(".")){const a=yield fetch(e);if(a.status>=400)return Promise.reject(new Error(`Failed to fetch source file "${e}"`));const n=yield a.arrayBuffer(),o=new Uint8Array(n);return this.cacheSourceFileData(e,o),o}const t=yield K.getItem(e);return t?t instanceof Uint8Array?(this.cacheSourceFileData(e,t),t):Promise.reject("Source data is of unexpected type"):Promise.reject("Missing source data")})}static getAllMetadataFromStore(){return k(this,null,function*(){const e=new Map,t=[];return yield Y.iterate((a,n)=>{a&&t.push(at(a).then(o=>{e.set(n,o)}).catch(o=>{console.error(o),console.warn(`Failed to upgrade metadata "${n}" (${a.name}); ignoring.`)}))}),yield Promise.all(t),e})}static getAllFromStorage(){return k(this,null,function*(){const e=yield this.getAllMetadataFromStore(),t=yield he(),a=(yield K.keys()).concat(t.map(({sourceFileId:o})=>o));return[...e].map(([o,l])=>{const{sourceFileId:c}=l;return a.includes(c)?new T.Mutable(I({id:o},l)):(console.warn(`Found metadata "${l.name||o}" with missing data "${c}; ignoring.`),null)}).filter(Boolean).sort((o,l)=>l.metadata.dateModified-o.metadata.dateModified)})}};let B=T;G(B,"Mutable",class extends T{constructor(e){super(e);setTimeout(()=>k(this,null,function*(){(yield Y.keys()).includes(this.id)||console.warn(`Expected sample metadata container ${this.id} to be persisted`)}))}persist(){return k(this,null,function*(){yield Y.setItem(this.id,this.metadata)})}update(e){const{id:t,metadata:a}=this,n=typeof e=="function"?e(a):e;if(Object.keys(n).every(c=>n[c]===a[c]))return this;const o=N(I(I({},a),n),{dateModified:Date.now()}),l=new T.Mutable(I({id:t},o));return l.persist(),l}remove(){return k(this,null,function*(){if(yield Y.removeItem(this.id),this.metadata.sourceFileId.includes("."))return;const e=yield T.getAllMetadataFromStore();for(const[,{sourceFileId:t}]of e)if(t===this.metadata.sourceFileId)return;yield K.removeItem(this.metadata.sourceFileId)})}}),G(B,"sourceFileData",new Map),G(B,"recentlyCachedSourceFileIds",[]),G(B,"MAX_CACHED",10);let ee;function he(){return ee||(ee=fetch("factory-samples.json").then(e=>e.json())),ee}function nt(){return k(this,null,function*(){const e=yield he();return new Map(e.map(t=>[t.id,new B(N(I({},t),{trim:{frames:[t.trim.frames[0],t.trim.frames[1]],waveformPeaks:{positive:new Float32Array(Object(de.a)(t.trim.waveformPeaks.positive)),negative:new Float32Array(Object(de.a)(t.trim.waveformPeaks.negative))}}}))]))})}var ve=Math.pow,te=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});function ae(e,t){const a=4,n=t[0]*a,o=e.length-t[0]-t[1];return new Float32Array(e.buffer,n,o)}function ne(e,t){const a=e.length-t[0]-t[1],n=new Float32Array(a),o=Array(e.numberOfChannels).fill().map((l,c)=>ae(e.getChannelData(c),t));for(let l=0;l<a;l++){let c=0;for(let s=0;s<o.length;s++)c+=o[s][l];c/=o.length,n[l]=c}return n}function rt(e){let t=0;for(const a of e){const n=Math.abs(a);n>t&&(t=n)}return t}function ot(e,t){if(t!==1)for(let a=0;a<e.length;a++)e[a]*=t}function lt(e,t){const a=ve(2,t-1);for(let n=0;n<e.length;n++)e[n]=Math.round(e[n]*a)/a}function ye(e){for(let t=0;t<e.length;t++)e[t]>1?e[t]=1:e[t]<-1&&(e[t]=-1)}function it(e){const t=e.length,a=e[0].length,n=new Float32Array(t*a);for(let o=0;o<n.length;o++){const l=t*o;for(let c=0;c<t;c++)n[l+c]=e[c][o]}return n}function ge(e){const t=new Int16Array(e.length),a=ve(2,15);for(let n=0;n<e.length;n++)t[n]=e[n]===1?a-1:a*e[n];return t}function be(){return window.AudioContext||window.webkitAudioContext}let Se;function we(){const e=be();return Se=Se||new e({sampleRate:X})}function J(e){return te(this,null,function*(){const t=new Uint8Array(e);return yield new Promise((n,o)=>{we().decodeAudioData(t.buffer,n,o)})})}function re(e,t){return te(this,null,function*(){const a=yield B.getSourceFileData(e),n=yield J(a);if(t)for(let o=0;o<n.numberOfChannels;o++)ye(n.getChannelData(o));return n})}function Ee(e){return te(this,null,function*(){const{qualityBitDepth:t,sourceFileId:a,userFileInfo:n,scaleCoefficient:o,trim:{frames:l}}=e.metadata;if(t<8||t>16||!Number.isInteger(t))throw new Error(`Expected bit depth between 8 and 16. Received: ${t}`);const c=yield re(a,Boolean(n)),s=c.numberOfChannels===1?ae(c.getChannelData(0),l):ne(c,l);o!==1&&ot(s,o),t<16&&lt(s,t);const r=ge(s),u=r.length*2,O=se()({channels:1,sampleRate:c.sampleRate,bitDepth:16,dataLength:u}),w=new Uint8Array(O.length+u);return w.set(O),w.set(new Uint8Array(r.buffer),O.length),{data:w,sampleRate:16}})}const ct={playAudioBuffer(e,t){throw new Error("Must render AudioPlaybackContextProvider")},isAudioBusy:!1},Ce=Object(d.createContext)(ct);function st({children:e}){const[t,a]=Object(d.useState)(!1),n=Object(d.useCallback)((l,{onTimeUpdate:c=()=>null,onEnded:s=()=>null}={})=>{if(t)throw new Error("Wait until audio playback has finished to start new playback");a(!0);let r,u;try{r=we(),u=r.createBufferSource(),u.buffer=l,u.connect(r.destination),u.start()}catch(m){throw a(!1),m}const O=r.currentTime;c(0);let w=requestAnimationFrame(g);function g(){c(r.currentTime-O),w=requestAnimationFrame(g)}let y=!1;return u.addEventListener("ended",()=>{y||(c(l.duration),s()),a(!1),cancelAnimationFrame(w)}),function(){u.stop(),y=!0}},[t]),o=Object(d.useMemo)(()=>({playAudioBuffer:n,isAudioBusy:t}),[n,t]);return Object(d.createElement)(Ce.Provider,{value:o},e)}function Oe(){return Object(d.useContext)(Ce)}var ut=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});const W=6,Pe=W*44;function De(e,t){const a=Math.floor(W*e.length/t),n=new Float32Array(Math.floor(e.length/a)),o=new Float32Array(Math.floor(e.length/a));for(let l=0;l<n.length;l++){const c=new Float32Array(e.buffer,l*a*4,a);let s=0,r=0;for(const u of c)u>s&&(s=u),u<r&&(r=u);n[l]=Math.min(1,s),o[l]=Math.max(-1,r)}return{positive:n,negative:o}}function Ae(e,t){return ut(this,null,function*(){const a=yield re(e,!1),n=ne(a,t);return De(n,Pe)})}var dt=C(54);const ft=R.a.canvas({width:"100%",height:"100%",display:"block"});function mt(e,t){function a(o,l){e.width=o,e.height=l}a(e.offsetWidth,e.offsetHeight),t({width:e.offsetWidth,height:e.offsetHeight});const n=new dt.a(([o])=>{const{width:l,height:c}=o.contentRect;a(l,c),t({width:l,height:c})});return n.observe(e),()=>n.disconnect()}function pt(e,t,a){const n=getComputedStyle(document.documentElement),o=n.getPropertyValue("--bs-primary"),l=n.getPropertyValue("--bs-primary-darkened"),c=e.getContext("2d"),{width:s,height:r}=e;c.clearRect(0,0,s,r);const u=Math.floor(r*(2/3))+1;c.fillStyle=o,t.positive.forEach((w,g)=>{const y=u*w,m=Math.max(Math.round(a*y),1);c.fillRect(g*W,u-m,W-1,m)});const O=r-u;c.fillStyle=l,t.negative.forEach((w,g)=>{const y=O*w*-1,m=Math.round(a*y);c.fillRect(g*W,u,W-1,m)})}function ht({peaks:e,scaleCoefficient:t,waveformRef:a}){const n=Object(d.useRef)(null);Object(d.useImperativeHandle)(a,()=>n.current);const[o,l]=Object(d.useState)(Symbol()),c=Object(d.useRef)({width:0,height:0});return Object(d.useLayoutEffect)(()=>{if(!n.current)throw new Error("Canvas should be defined");return c.current.width=n.current.offsetWidth,c.current.height=n.current.offsetHeight,mt(n.current,({width:s,height:r})=>{(s!==c.current.width||r!==c.current.height)&&(l(Symbol()),c.current.width=s,c.current.height=r)})},[]),Object(d.useLayoutEffect)(()=>{const s=n.current;if(!s)throw new Error("Canvas should be defined");let r=requestAnimationFrame(()=>{r=requestAnimationFrame(()=>{pt(s,e,t)})});return()=>cancelAnimationFrame(r)},[e,t,o]),i.a.createElement(ft,{ref:n})}var Me=ht;const vt=R.a.div({width:`${Pe}px`,height:"40px"}),Be=typeof IntersectionObserver!="undefined",yt=i.a.memo(({sample:e,selected:t,onSampleSelect:a})=>{const n=Object(d.useRef)(null),[o,l]=Object(d.useState)(!Be);return Object(d.useLayoutEffect)(()=>{if(!Be)return;const c=n.current;if(!c)throw new Error("Waveform container should be defined");const s=c.getBoundingClientRect();if(s.top+s.height>=0&&s.bottom-s.height<=window.innerHeight){l(!0);return}const r=new IntersectionObserver(([u])=>{u.isIntersecting&&(l(!0),r.unobserve(c))});return r.observe(c),()=>r.disconnect()},[]),i.a.createElement(U.a.Item,{active:t,onClick:()=>a(e.id)},i.a.createElement("div",null,e.metadata.name),i.a.createElement(vt,{ref:n},o&&i.a.createElement(Me,{peaks:e.metadata.trim.waveformPeaks,scaleCoefficient:e.metadata.scaleCoefficient})))});function gt({samples:e,selectedSampleId:t,onSampleSelect:a}){return i.a.createElement(U.a,{variant:"flush"},[...e].map(([n,o])=>i.a.createElement(yt,{key:n,sample:o,selected:n===t,onSampleSelect:a})))}var ke=gt,A=C(55),bt=Object.defineProperty,St=Object.defineProperties,wt=Object.getOwnPropertyDescriptors,Q=Object.getOwnPropertySymbols,Ie=Object.prototype.hasOwnProperty,je=Object.prototype.propertyIsEnumerable,Fe=(e,t,a)=>t in e?bt(e,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):e[t]=a,Et=(e,t)=>{for(var a in t||(t={}))Ie.call(t,a)&&Fe(e,a,t[a]);if(Q)for(var a of Q(t))je.call(t,a)&&Fe(e,a,t[a]);return e},Ct=(e,t)=>St(e,wt(t)),Ot=(e,t)=>{var a={};for(var n in e)Ie.call(e,n)&&t.indexOf(n)<0&&(a[n]=e[n]);if(e!=null&&Q)for(var n of Q(e))t.indexOf(n)<0&&je.call(e,n)&&(a[n]=e[n]);return a},Pt=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});function Dt({sourceAudioBuffer:e,sample:{metadata:{trim:{frames:t},scaleCoefficient:a}},onSetTrimFrames:n,onSetScaleCoefficient:o}){const l=Object(d.useMemo)(()=>e?ne(e,[0,0]):new Float32Array,[e]),[c,s]=Object(d.useState)(null),r=Object(d.useMemo)(()=>c&&c.offsetWidth,[c]),u=Object(d.useMemo)(()=>!r||!l.length?{positive:new Float32Array,negative:new Float32Array}:De(l,r),[r,l]),O=Object(d.useMemo)(()=>{if(!e)return 0;const f=ae(l,t);return rt(f)},[e,l,t]),w=1/O;Object(d.useLayoutEffect)(()=>{a>w&&o(w)},[a,w,o]);const g=Object(d.useMemo)(()=>{if(!l.length||!r)return[0,0];const f=r/l.length;return t.map(p=>p*f)},[r,l.length,t]),y=Object(d.useRef)(null),m=Object(d.useRef)(null);return Object(d.useEffect)(()=>{function f(h){if(y.current===null||!r||!l.length)return;const{pageX:v}=h,b=v-y.current;if(b){const S=b/r,E=Math.round(l.length*S);n(P=>{let D=P[0]+E;return D=Math.min(D,l.length-P[1]-2e3),D=Math.max(D,0),[D,P[1]]}),y.current=v}}function p(){y.current=null,document.body.style.userSelect="unset"}return window.addEventListener("mousemove",f),window.addEventListener("mouseup",p),()=>{window.removeEventListener("mousemove",f),window.removeEventListener("mouseup",p)}},[r,l.length,n]),Object(d.useEffect)(()=>{function f(h){if(m.current===null||!r||!l.length)return;const{pageX:v}=h,b=m.current-v;if(b){const S=b/r,E=Math.round(l.length*S);n(P=>{let D=P[1]+E;return D=Math.min(D,l.length-P[0]-2e3),D=Math.max(D,0),[P[0],D]}),m.current=v}}function p(){m.current=null,document.body.style.userSelect="unset"}return window.addEventListener("mousemove",f),window.addEventListener("mouseup",p),()=>{window.removeEventListener("mousemove",f),window.removeEventListener("mouseup",p)}},[r,l.length,n]),i.a.createElement(i.a.Fragment,null,i.a.createElement("div",{style:{position:"relative"}},i.a.createElement("div",{style:{position:"absolute",right:0,bottom:4}},i.a.createElement(A.a,{type:"button",variant:"light",disabled:a===w,onClick:()=>o(w)},"Normalize")," ",i.a.createElement(A.a,{type:"button",variant:"light",disabled:a===1,onClick:()=>o(1)},"Original level"))),i.a.createElement("div",{style:{position:"relative",backgroundColor:"#f3f3f3"}},i.a.createElement(Me,{waveformRef:s,peaks:u,scaleCoefficient:a}),i.a.createElement("div",{style:{position:"absolute",top:0,bottom:0,left:0,right:`calc(100% - ${g[0]}px)`,background:"#f3f3f3"}},i.a.createElement("div",{style:{position:"absolute",top:0,bottom:0,right:0,width:2,background:"var(--bs-dark)"}}),i.a.createElement("div",{style:{position:"absolute",top:"100%",right:0,width:20,height:20,background:"var(--bs-dark)",borderRadius:10,transform:"translateX(50%)"},onTouchStart:f=>{f.preventDefault(),document.body.style.userSelect="none",y.current=f.touches[0].pageX},onMouseDown:f=>{document.body.style.userSelect="none",y.current=f.pageX},onTouchMove:f=>{if(f.preventDefault(),y.current===null||!r||!l.length)return;const{pageX:p}=f.touches[0],h=p-y.current;if(h){const v=h/r,b=Math.round(l.length*v);n(S=>{let E=S[0]+b;return E=Math.min(E,l.length-S[1]-2e3),E=Math.max(E,0),[E,S[1]]}),y.current=p}},onTouchEnd:()=>{y.current=null},onTouchCancel:()=>{y.current=null}})),i.a.createElement("div",{style:{position:"absolute",top:0,bottom:0,right:0,left:`calc(100% - ${g[1]}px)`,background:"#f3f3f3"}},i.a.createElement("div",{style:{position:"absolute",top:0,bottom:0,left:0,width:2,background:"var(--bs-dark)"}}),i.a.createElement("div",{style:{position:"absolute",top:"100%",left:0,width:20,height:20,background:"var(--bs-dark)",borderRadius:10,transform:"translateX(-50%)"},onTouchStart:f=>{f.preventDefault(),document.body.style.userSelect="none",m.current=f.touches[0].pageX},onMouseDown:f=>{document.body.style.userSelect="none",m.current=f.pageX},onTouchMove:f=>{if(f.preventDefault(),m.current===null||!r||!l.length)return;const{pageX:p}=f.touches[0],h=m.current-p;if(h){const v=h/r,b=Math.round(l.length*v);n(S=>{let E=S[1]+b;return E=Math.min(E,l.length-S[0]-2e3),E=Math.max(E,0),[S[0],E]}),m.current=p}},onTouchEnd:()=>{m.current=null},onTouchCancel:()=>{m.current=null}}))))}function At(e){var t=e,{sample:a}=t,n=Ot(t,["sample"]);const[o,l]=Object(d.useState)(null);Object(d.useEffect)(()=>{let s=!1;return(()=>Pt(this,null,function*(){if(s)return;const r=yield re(a.metadata.sourceFileId,Boolean(a.metadata.userFileInfo));s||l([a.metadata.sourceFileId,r])}))(),()=>{s=!0}},[a.metadata.sourceFileId,a.metadata.userFileInfo]);const c=Object(d.useRef)(a);return o&&a.metadata.sourceFileId===o[0]&&(c.current=a),i.a.createElement(Dt,Ct(Et({},n),{sample:c.current,sourceAudioBuffer:o&&o[1]}))}var Mt=At,Bt=C(90),kt=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});let Re;function It(){return kt(this,null,function*(){if(typeof window.CREATE_SYRO_BINDINGS!="function")return Promise.reject("Expected CREATE_SYRO_BINDINGS global function to exist");const e=yield window.CREATE_SYRO_BINDINGS();return Re=Re||new Promise((t,a)=>{let n;try{n={prepareSampleBufferFromWavData:e.cwrap("prepareSampleBufferFromWavData","number",["array","number","number","number","number"]),prepareSampleBufferFrom16BitPcmData(){throw new Error("This function does not work. Use prepareSampleBufferFromWavData.")},getSampleBufferChunkPointer:e.cwrap("getSampleBufferChunkPointer","number",["number"]),getSampleBufferChunkSize:e.cwrap("getSampleBufferChunkSize","number",["number"]),getSampleBufferProgress:e.cwrap("getSampleBufferProgress","number",["number"]),getSampleBufferTotalSize:e.cwrap("getSampleBufferTotalSize","number",["number"]),cancelSampleBufferWork:e.cwrap("cancelSampleBufferWork",null,["number"]),registerUpdateCallback(o){return e.addFunction(o,"vi")},unregisterUpdateCallback(o){e.removeFunction(o)},heap8Buffer(){return e.HEAP8.buffer}}}catch(o){a(o);return}t(n)})})}var jt=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});function Ft(e,t){let a=!1,n=()=>{};return{cancelWork(){a=!0,n()},sampleBufferPromise:(()=>jt(this,null,function*(){const{prepareSampleBufferFromWavData:o,getSampleBufferChunkPointer:l,getSampleBufferChunkSize:c,getSampleBufferProgress:s,getSampleBufferTotalSize:r,cancelSampleBufferWork:u,registerUpdateCallback:O,unregisterUpdateCallback:w,heap8Buffer:g}=yield It();if(a)return new Uint8Array;const{data:y}=yield Ee(e);if(a)return new Uint8Array;let m,f=0;const p=O(v=>{if(a)return;const b=r(v);m||(m=new Uint8Array(b));const S=l(v),E=c(v),P=s(v);m.set(new Uint8Array(g(),S,E),P-E),f=P/b}),h=o(y,y.length,e.metadata.slotNumber,e.metadata.qualityBitDepth,e.metadata.useCompression?1:0,p);t(f);try{yield new Promise(v=>{let b;n=()=>{cancelAnimationFrame(b),u(h),v()},S();function S(){if(f&&(t(f),f>=1)){v();return}b=requestAnimationFrame(S)}})}finally{n=()=>{},w(p)}if(a)return new Uint8Array;if(!m)throw new Error("Unexpected condition: sampleBuffer should be defined");return m}))()}}var Rt=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});function xt({sample:e}){const[t,a]=Object(d.useState)(0),[n,o]=Object(d.useState)("idle"),[l,c]=Object(d.useState)(null),[s,r]=Object(d.useState)(null);Object(d.useEffect)(()=>{l instanceof AudioBuffer&&s&&(r(null),s.fn())},[l,s]);const u=Object(d.useRef)(()=>{});Object(d.useEffect)(()=>{let g=!1;a(0),o("idle"),c(null),r(null),u.current=()=>{g=!0};try{const{sampleBufferPromise:y,cancelWork:m}=Ft(e,f=>{g||a(f)});u.current=()=>{m(),g=!0},y.then(f=>Rt(this,null,function*(){if(g)return;u.current=()=>{g=!0};const p=yield J(f);g||c(p)}))}catch(y){console.error(y),c(new Error(String(y)))}return()=>u.current()},[e]);const{playAudioBuffer:O,isAudioBusy:w}=Oe();return i.a.createElement(i.a.Fragment,null,i.a.createElement(A.a,{type:"button",variant:"primary",onClick:g=>{if(!(l instanceof AudioBuffer)){if(!l){const y=g.currentTarget;r({fn:()=>y.click()})}return}try{o("transferring");const y=O(l,{onTimeUpdate:m=>a(m/l.duration),onEnded:()=>o("idle")});u.current=()=>{y(),o("idle")}}catch(y){console.error(y),o("error")}},disabled:w||l instanceof Error||n==="transferring"},"Transfer to volca sample"),i.a.createElement("br",null),l&&n==="idle"?null:n==="error"?"Error transferring":i.a.createElement(i.a.Fragment,null,i.a.createElement("p",null,l?l instanceof AudioBuffer?"Transferring to Volca Sample...":"Error preparing sample for transfer":"Preparing sample for transfer..."),i.a.createElement(Bt.a,{now:100*t}),i.a.createElement("br",null),i.a.createElement(A.a,{type:"button",variant:"light",onClick:()=>u.current()},"Cancel")),i.a.createElement("br",null))}var Tt=xt,Wt=C(83),Lt=C(84),_=C(58),M=C(86),Nt=Object.defineProperty,Ht=Object.defineProperties,Vt=Object.getOwnPropertyDescriptors,xe=Object.getOwnPropertySymbols,Ut=Object.prototype.hasOwnProperty,zt=Object.prototype.propertyIsEnumerable,Te=(e,t,a)=>t in e?Nt(e,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):e[t]=a,We=(e,t)=>{for(var a in t||(t={}))Ut.call(t,a)&&Te(e,a,t[a]);if(xe)for(var a of xe(t))zt.call(t,a)&&Te(e,a,t[a]);return e},Le=(e,t)=>Ht(e,Vt(t)),Xt=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});const $t=R.a.div({height:"200px",maxWidth:"400px"});function Gt(e,t){const a=URL.createObjectURL(e),n=document.createElement("a");n.href=a,n.download=t,n.style.display="none",document.body.appendChild(n),n.click(),n.remove(),URL.revokeObjectURL(a)}function Kt({sample:e,onSampleUpdate:t,onSampleDuplicate:a,onSampleDelete:n}){const o=e&&e.id,l=Object(d.useCallback)(p=>o&&t(o,{scaleCoefficient:p}),[o,t]),c=Object(d.useCallback)(p=>o&&t(o,h=>Le(We({},h),{trim:Le(We({},h.trim),{frames:p(h.trim.frames)})})),[o,t]),[s,r]=Object(d.useState)(null),[u,O]=Object(d.useState)(null),[w,g]=Object(d.useState)(null);Object(d.useEffect)(()=>{u instanceof AudioBuffer&&w&&(g(null),w.fn())},[u,w]),Object(d.useEffect)(()=>{if(r(null),g(null),e){let p=!1;Ee(e).then(({data:h})=>{p||r(h)})}},[e]),Object(d.useEffect)(()=>{if(O(null),s){let p=!1;J(s).then(h=>{p||O(h)})}},[s]);const{playAudioBuffer:y,isAudioBusy:m}=Oe(),f=Object(d.useRef)(()=>{});return Object(d.useEffect)(()=>()=>f.current(),[e]),e?i.a.createElement(Wt.a,{fluid:"sm"},i.a.createElement("h2",null,e.metadata.name,i.a.createElement(Lt.a,{style:{display:"inline-block",float:"right"},variant:"light",align:"end",title:"options"},i.a.createElement(_.a.Item,{onClick:()=>{const p=prompt(`Choose a new name for the sample "${e.metadata.name}":`,e.metadata.name),h=p&&p.trim();h&&t(e.id,{name:h})}},"Rename"),i.a.createElement(_.a.Item,{onClick:()=>a(e.id)},"Duplicate"),i.a.createElement(_.a.Divider,null),i.a.createElement(_.a.Item,{onClick:()=>{window.confirm(`Are you sure you want to delete ${e.metadata.name}?`)&&n(e.id)}},"Delete"))),i.a.createElement("p",null,i.a.createElement("strong",null,"Sampled:")," ",new Date(e.metadata.dateSampled).toLocaleString(),i.a.createElement("br",null),i.a.createElement("strong",null,"Updated:")," ",new Date(e.metadata.dateModified).toLocaleString()),i.a.createElement("br",null),i.a.createElement("br",null),i.a.createElement($t,null,i.a.createElement(Mt,{onSetTrimFrames:c,onSetScaleCoefficient:l,sample:e})),i.a.createElement("br",null),i.a.createElement("br",null),i.a.createElement(A.a,{type:"button",variant:"secondary",size:"sm",onClick:p=>{if(u)f.current=y(u);else{const h=p.currentTarget;g({fn:()=>h.click()})}},disabled:m},"Play audio preview")," ",i.a.createElement(A.a,{type:"button",variant:"secondary",size:"sm",onClick:()=>Xt(this,null,function*(){const{sourceFileId:p,userFileInfo:h}=e.metadata,v=yield B.getSourceFileData(p),b=new Blob([v],{type:h?h.type:"audio/x-wav"});Gt(b,`${e.metadata.name}${h?h.ext:".wav"}`)})},"Download original file"),i.a.createElement("br",null),i.a.createElement("br",null),i.a.createElement(M.a.Group,null,i.a.createElement(M.a.Label,null,"Quality bit depth (",e.metadata.qualityBitDepth,")"),i.a.createElement(M.a.Range,{value:e.metadata.qualityBitDepth,step:1,min:8,max:16,onChange:p=>{const h=Number(p.target.value);t(e.id,{qualityBitDepth:h})}})),i.a.createElement(M.a.Group,null,i.a.createElement(M.a.Label,null,"Slot number"),i.a.createElement(M.a.Control,{type:"number",value:e.metadata.slotNumber,step:1,min:0,max:99,onChange:p=>{const h=Number(p.target.value);t(e.id,{slotNumber:h})}})),i.a.createElement("br",null),i.a.createElement(Tt,{sample:e})):null}var Yt=Kt,Jt=C(59),L=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});let Ne;function oe(){const e=be();return Ne=Ne||new e(navigator.mediaDevices.getSupportedConstraints().sampleRate?{sampleRate:X}:{})}function Qt(){return L(this,null,function*(){{const n=yield navigator.mediaDevices.getUserMedia({audio:!0,video:!1});for(const o of n.getTracks())o.stop()}const t=(yield navigator.mediaDevices.enumerateDevices()).filter(n=>n.kind==="audioinput"),a=[];for(const n of t){const o=yield navigator.mediaDevices.getUserMedia({audio:{deviceId:n.deviceId,channelCount:2},video:!1}),l=(yield navigator.mediaDevices.enumerateDevices()).find(({deviceId:s})=>n.deviceId===s).label;let c=1;{const s=o.getAudioTracks()[0],r=s.getSettings().channelCount;r?c=r:s.getCapabilities&&(c=(s.getCapabilities().channelCount||{}).max||c)}for(const s of o.getTracks())s.stop();a.push({device:{deviceId:n.deviceId,label:l},channelsAvailable:c})}return a})}let le;function _t(e){return L(this,arguments,function*({onData:t,onFinish:a}){const n=oe();le=le||n.audioWorklet.addModule("recorderWorkletProcessor.js"),yield le;const o=new AudioWorkletNode(n,"recorder-worklet",{parameterData:{bufferSize:1024}});o.port.onmessage=c=>{if(c.data.eventType==="data"){const s=c.data.audioChannels;t(s)}c.data.eventType==="stop"&&a()};const l=o.parameters.get("isRecording");return l.setValueAtTime(1,n.currentTime),{recorderNode:o,stop(){l.setValueAtTime(0,n.currentTime)}}})}function Zt({channelCount:e,onData:t,onFinish:a}){const o=oe().createScriptProcessor(1024,e,e);let l=!1;return o.onaudioprocess=c=>{const s=Array(e).fill().map((r,u)=>c.inputBuffer.getChannelData(u));t(s),l&&a()},{recorderNode:o,stop(){l=!0}}}function qt(e){return L(this,null,function*(){return typeof AudioWorkletNode=="undefined"?Zt(e):yield _t(e)})}function ea(e){return L(this,arguments,function*({deviceId:t,channelCount:a,onStart:n}){const o=yield navigator.mediaDevices.getUserMedia({audio:{deviceId:t,channelCount:a,sampleRate:X,echoCancellation:!1,autoGainControl:!1,noiseSuppression:!1},video:!1}),l=oe(),c=l.createMediaStreamSource(o),{recorderNode:s,stop:r}=yield qt({channelCount:a,onData:y,onFinish:v});c.connect(s),s.connect(l.destination),n();const O=10*l.sampleRate;let w=0;const g=Array(a).fill([]);function y(b){return L(this,null,function*(){let S=0;const E=[];for(let F=0;F<a;F++){const ze=b[F],da=ze.length,ce=ze.slice(0,Math.min(da,O-w));ye(ce),S||(S=ce.length),E.push(ce)}const P=it(E),D=ge(P);g.push(D),w+=S,w>=O&&(yield v(),r())})}let m,f;const p=new Promise((b,S)=>{m=b,f=S});let h=!1;function v(){return L(this,null,function*(){if(h)return;try{const E=yield new Blob(g).arrayBuffer(),P=new Float32Array(E),D=se()({channels:a,sampleRate:l.sampleRate,bitDepth:16,dataLength:P.byteLength}),F=new Uint8Array(D.length+P.byteLength);F.set(D),F.set(new Uint8Array(P.buffer),D.length),m(F)}catch(S){f(S)}const b=o.getTracks();for(const S of b)S.stop();s.disconnect(l.destination),c.disconnect(s),h=!0})}return{stop:r,mediaRecording:p}})}var He=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});const ta=R.a.div({}),Ve="capture_device_preference";let Ue=null;function aa(e){const t=Object(d.useRef)(JSON.parse(localStorage.getItem(Ve)||"null")),[a,n]=Object(d.useState)(Ue),[o,l]=Object(d.useState)(a?"ok":"pending"),[c,s]=Object(d.useState)("");Object(d.useEffect)(()=>{Ue=a,l("ok")},[a]);const r=Object(d.useCallback)(()=>{let v=!1;return Qt().then(b=>{v||b.length&&(n(new Map(b.map(S=>[S.device.deviceId,S]))),s(S=>S?(t.current=null,S):t.current&&b.find(({device:E})=>t.current.deviceId===E.deviceId)?t.current.deviceId:(t.current=null,b[0].device.deviceId)))}).catch(b=>{if(!v){if(b instanceof DOMException){if(b.name==="NotAllowedError"){l("denied");return}if(b.name==="NotFoundError"){l("unavailable");return}}throw b}}),()=>{v=!0}},[]);Object(d.useEffect)(r,[r]);const[u,O]=Object(d.useState)(1);Object(d.useEffect)(()=>{const v=a&&a.get(c);v&&(t.current&&t.current.deviceId===v.device.deviceId&&t.current.channelCount<=v.channelsAvailable?O(t.current.channelCount):O(v.channelsAvailable),t.current=null)},[a,c]),Object(d.useEffect)(()=>{c&&localStorage.setItem(Ve,JSON.stringify({deviceId:c,channelCount:u}))},[c,u]);const[w,g]=Object(d.useState)("ready"),[y,m]=Object(d.useState)(null),[f,p]=Object(d.useState)({fn(v){}}),h=Object(d.useCallback)(()=>He(this,null,function*(){let v=!1;const{mediaRecording:b,stop:S}=yield ea({deviceId:c,channelCount:u,onStart:()=>g("capturing")});p({fn(P){S(),P&&(v=!0)}});let E;try{E=yield b}catch(P){m(P),g("error");return}v?g("ready"):(g("finalizing"),e(E))}),[c,u,e]);return{captureDevices:a,accessState:o,selectedCaptureDeviceId:c,selectedChannelCount:u,captureState:w,recordingError:y,refreshCaptureDevices:r,setSelectedCaptureDeviceId:s,setSelectedChannelCount:O,beginRecording:h,stopRecording:f.fn}}function na({onRecordFinish:e}){const{captureDevices:t,accessState:a,selectedCaptureDeviceId:n,selectedChannelCount:o,captureState:l,recordingError:c,refreshCaptureDevices:s,setSelectedCaptureDeviceId:r,setSelectedChannelCount:u,beginRecording:O,stopRecording:w}=aa(e),[g,y]=Object(d.useState)(!1);return i.a.createElement(ta,null,a==="denied"?i.a.createElement("p",null,"Looks like you didn't grant access to your audio input device. Please give Volca Sampler access, then"," ",i.a.createElement(A.a,{type:"button",variant:"secondary",onClick:s},"try again")):a==="unavailable"?i.a.createElement("p",null,"Volca Sampler couldn't find any audio input devices. Please connect one, then"," ",i.a.createElement(A.a,{type:"button",variant:"secondary",onClick:s},"try again")):i.a.createElement("div",null,i.a.createElement("h2",null,"Send a new sound to your Volca Sample!"),i.a.createElement(A.a,{type:"button",variant:l==="capturing"?"danger":"primary",size:"lg",style:{width:250},onClick:l==="capturing"?()=>w():O,disabled:l==="finalizing"},["capturing","finalizing"].includes(l)?"Finished recording":"Start recording"),["capturing","finalizing"].includes(l)?i.a.createElement(i.a.Fragment,null,i.a.createElement("br",null),i.a.createElement("br",null),i.a.createElement(A.a,{style:{width:250},size:"sm",type:"button",variant:"secondary",onClick:()=>w(!0)},"Cancel")):i.a.createElement(i.a.Fragment,null,i.a.createElement("br",null),i.a.createElement(A.a,{style:{width:250},type:"button",variant:"light",size:"sm",onClick:()=>y(m=>!m)},"Audio input settings ",g?"\u25B2":"\u25BC"),i.a.createElement(Jt.a,{in:g},i.a.createElement("div",null,i.a.createElement(M.a.Group,null,i.a.createElement(M.a.Label,null,"Capture Device"),i.a.createElement(M.a.Select,{style:{width:250},value:n,onChange:m=>r(m.target.value)},t&&a==="ok"?[...t].map(([m,{device:f}])=>i.a.createElement("option",{key:m,value:m},f.label||m)):i.a.createElement("option",{value:"",disabled:!0},"Loading devices..."))),i.a.createElement(M.a.Group,null,i.a.createElement(M.a.Label,null,"Input channels"),i.a.createElement(M.a.Select,{style:{width:250},value:o,onChange:m=>u(Number(m.target.value))},[1,2].map(m=>i.a.createElement("option",{key:m,value:m,disabled:!t||!t.has(n)||t.get(n).channelsAvailable<m},m===1?"Mono":"Stereo (summed to mono)")))),i.a.createElement("br",null))))),l==="error"&&c||null,i.a.createElement("br",null),i.a.createElement(A.a,{style:{width:250},type:"button",variant:"secondary",onClick:m=>{const f=m.currentTarget.querySelector("input");f&&m.target!==f&&f.click()}},"Or import an audio file",i.a.createElement("input",{hidden:!0,type:"file",accept:"audio/*,.wav,.mp3,.ogg",onChange:m=>{if(m.target.files&&m.target.files.length){const f=m.target.files[0];f.arrayBuffer().then(p=>He(this,null,function*(){const h=new Uint8Array(p);let v;try{v=yield J(h)}catch(b){alert("Unsupported audio format detected");return}if(v.length>10*v.sampleRate){alert("Please select an audio file no more than 10 seconds long");return}e(h,f)}))}}})))}var ra=na,ie=C(85),j=C(87),oa=(e,t,a)=>new Promise((n,o)=>{var l=r=>{try{s(a.next(r))}catch(u){o(u)}},c=r=>{try{s(a.throw(r))}catch(u){o(u)}},s=r=>r.done?n(r.value):Promise.resolve(r.value).then(l,c);s((a=a.apply(e,t)).next())});const la=R.a.div({padding:"2rem",display:"flex",height:"100%"}),ia=R.a.div({flexGrow:1});function ca(){const[e,t]=Object(d.useState)(new Map),[a,n]=Object(d.useState)(new Map),o=Object(d.useMemo)(()=>new Map([...e,...a]),[e,a]);Object(d.useEffect)(()=>{nt().then(n).catch(console.error)},[]);const[l,c]=Object(d.useState)(null),[s,r]=Object(d.useState)(!0);Object(d.useEffect)(()=>{B.getAllFromStorage().then(m=>{t(f=>new Map([...f,...m.map(p=>[p.id,p])]))}).finally(()=>{r(!1)})},[]);const u=Object(d.useCallback)((m,f)=>oa(this,null,function*(){const p=yield et(m);let h="",v="";if(f){const P=f.name.lastIndexOf(".");P>0?(h=f.name.slice(0,P),v=f.name.slice(P)):h=f.name}else h="New sample";const b=[0,0],S=yield Ae(p,b),E=new B.Mutable({name:h,sourceFileId:p,trim:{frames:b,waveformPeaks:S},userFileInfo:f&&{type:f.type,ext:v}});yield E.persist(),t(P=>new Map([[E.id,E],...P])),c(E.id)}),[]),O=Object(d.useCallback)((m,f)=>{t(p=>{const h=p.get(m);if(h&&h instanceof B.Mutable){const v=h.update(f);if(v!==h)return new Map(p).set(h.id,v)}return p})},[]),[w,g]=Object(d.useState)(!1),y=Object(d.useCallback)(m=>{c(m),g(!1)},[]);return i.a.createElement("div",null,i.a.createElement(Ye,{onMenuOpen:()=>g(!0),onHeaderClick:()=>c(null)}),i.a.createElement(ie.a,{show:w,onHide:()=>g(!1)},i.a.createElement(ie.a.Header,{closeButton:!0}),i.a.createElement(ie.a.Body,null,i.a.createElement(U.a,null,i.a.createElement(U.a.Item,{as:"button",onClick:()=>y(null)},"New Sample"),s?"Loading...":null,!s&&i.a.createElement(j.a,{defaultActiveKey:e.size?"user":"factory"},i.a.createElement(j.a.Item,{eventKey:"user"},i.a.createElement(j.a.Header,null,"Your Samples"),i.a.createElement(j.a.Body,{style:{padding:0}},i.a.createElement(ke,{samples:e,selectedSampleId:l,onSampleSelect:y}))),i.a.createElement(j.a.Item,{eventKey:"factory"},i.a.createElement(j.a.Header,null,"Factory Samples"),i.a.createElement(j.a.Body,{style:{padding:0}},i.a.createElement(ke,{samples:a,selectedSampleId:l,onSampleSelect:y}))))))),i.a.createElement(la,null,i.a.createElement(ia,null,l&&i.a.createElement(Yt,{sample:o.get(l)||null,onSampleUpdate:O,onSampleDuplicate:m=>{const f=o.get(m);if(f){const p=f.duplicate();t(h=>new Map([[p.id,p],...h])),c(p.id)}},onSampleDelete:m=>{const f=o.get(m);f&&f instanceof B.Mutable&&(f.remove(),t(p=>{const h=new Map(p);return h.delete(f.id),h}))}}),!l&&i.a.createElement(ra,{onRecordFinish:u}))))}var sa=ca,ua=e=>{e&&e instanceof Function&&C.e(3).then(C.bind(null,91)).then(({getCLS:t,getFID:a,getFCP:n,getLCP:o,getTTFB:l})=>{t(e),a(e),n(e),o(e),l(e)})};Blob.prototype.arrayBuffer||(Blob.prototype.arrayBuffer=function(){return new Response(this).arrayBuffer()}),$e.a.render(i.a.createElement(i.a.StrictMode,null,i.a.createElement(st,null,i.a.createElement(sa,null))),document.getElementById("root")),ua()}},[[76,1,2]]]);

//# sourceMappingURL=main.23a16f32.chunk.js.map