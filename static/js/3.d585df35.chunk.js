(this["webpackJsonpvolca-sampler"]=this["webpackJsonpvolca-sampler"]||[]).push([[3],{127:function(W,v,p){"use strict";p.r(v),p.d(v,"getCLS",function(){return B}),p.d(v,"getFCP",function(){return I}),p.d(v,"getFID",function(){return M}),p.d(v,"getLCP",function(){return O}),p.d(v,"getTTFB",function(){return N});var s,l,F,y,f=function(t,n){return{name:t,value:n===void 0?-1:n,delta:0,entries:[],id:"v1-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12)}},E=function(t,n){try{if(PerformanceObserver.supportedEntryTypes.includes(t)){if(t==="first-input"&&!("PerformanceEventTiming"in self))return;var i=new PerformanceObserver(function(a){return a.getEntries().map(n)});return i.observe({type:t,buffered:!0}),i}}catch(a){}},L=function(t,n){var i=function a(e){e.type!=="pagehide"&&document.visibilityState!=="hidden"||(t(e),n&&(removeEventListener("visibilitychange",a,!0),removeEventListener("pagehide",a,!0)))};addEventListener("visibilitychange",i,!0),addEventListener("pagehide",i,!0)},h=function(t){addEventListener("pageshow",function(n){n.persisted&&t(n)},!0)},d=typeof WeakSet=="function"?new WeakSet:new Set,m=function(t,n,i){var a;return function(){n.value>=0&&(i||d.has(n)||document.visibilityState==="hidden")&&(n.delta=n.value-(a||0),(n.delta||a===void 0)&&(a=n.value,t(n)))}},B=function(t,n){var i,a=f("CLS",0),e=function(r){r.hadRecentInput||(a.value+=r.value,a.entries.push(r),i())},o=E("layout-shift",e);o&&(i=m(t,a,n),L(function(){o.takeRecords().map(e),i()}),h(function(){a=f("CLS",0),i=m(t,a,n)}))},g=-1,w=function(){return document.visibilityState==="hidden"?0:1/0},C=function(){L(function(t){var n=t.timeStamp;g=n},!0)},T=function(){return g<0&&(g=w(),C(),h(function(){setTimeout(function(){g=w(),C()},0)})),{get timeStamp(){return g}}},I=function(t,n){var i,a=T(),e=f("FCP"),o=function(c){c.name==="first-contentful-paint"&&(u&&u.disconnect(),c.startTime<a.timeStamp&&(e.value=c.startTime,e.entries.push(c),d.add(e),i()))},r=performance.getEntriesByName("first-contentful-paint")[0],u=r?null:E("paint",o);(r||u)&&(i=m(t,e,n),r&&o(r),h(function(c){e=f("FCP"),i=m(t,e,n),requestAnimationFrame(function(){requestAnimationFrame(function(){e.value=performance.now()-c.timeStamp,d.add(e),i()})})}))},S={passive:!0,capture:!0},R=new Date,P=function(t,n){s||(s=n,l=t,F=new Date,b(removeEventListener),D())},D=function(){if(l>=0&&l<F-R){var t={entryType:"first-input",name:s.type,target:s.target,cancelable:s.cancelable,startTime:s.timeStamp,processingStart:s.timeStamp+l};y.forEach(function(n){n(t)}),y=[]}},J=function(t){if(t.cancelable){var n=(t.timeStamp>1e12?new Date:performance.now())-t.timeStamp;t.type=="pointerdown"?function(i,a){var e=function(){P(i,a),r()},o=function(){r()},r=function(){removeEventListener("pointerup",e,S),removeEventListener("pointercancel",o,S)};addEventListener("pointerup",e,S),addEventListener("pointercancel",o,S)}(n,t):P(n,t)}},b=function(t){["mousedown","keydown","touchstart","pointerdown"].forEach(function(n){return t(n,J,S)})},M=function(t,n){var i,a=T(),e=f("FID"),o=function(u){u.startTime<a.timeStamp&&(e.value=u.processingStart-u.startTime,e.entries.push(u),d.add(e),i())},r=E("first-input",o);i=m(t,e,n),r&&L(function(){r.takeRecords().map(o),r.disconnect()},!0),r&&h(function(){var u;e=f("FID"),i=m(t,e,n),y=[],l=-1,s=null,b(addEventListener),u=o,y.push(u),D()})},O=function(t,n){var i,a=T(),e=f("LCP"),o=function(c){var A=c.startTime;A<a.timeStamp&&(e.value=A,e.entries.push(c)),i()},r=E("largest-contentful-paint",o);if(r){i=m(t,e,n);var u=function(){d.has(e)||(r.takeRecords().map(o),r.disconnect(),d.add(e),i())};["keydown","click"].forEach(function(c){addEventListener(c,u,{once:!0,capture:!0})}),L(u,!0),h(function(c){e=f("LCP"),i=m(t,e,n),requestAnimationFrame(function(){requestAnimationFrame(function(){e.value=performance.now()-c.timeStamp,d.add(e),i()})})})}},N=function(t){var n,i=f("TTFB");n=function(){try{var a=performance.getEntriesByType("navigation")[0]||function(){var e=performance.timing,o={entryType:"navigation",startTime:0};for(var r in e)r!=="navigationStart"&&r!=="toJSON"&&(o[r]=Math.max(e[r]-e.navigationStart,0));return o}();if(i.value=i.delta=a.responseStart,i.value<0)return;i.entries=[a],t(i)}catch(e){}},document.readyState==="complete"?setTimeout(n,0):addEventListener("pageshow",n)}}}]);

//# sourceMappingURL=3.d585df35.chunk.js.map