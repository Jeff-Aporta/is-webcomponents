import{a as l,c as g,e as p,k as u}from"./chunk-W75WYLLH.mjs";var y=Object.freeze({tabWidth:2,useTabs:!1,printWidth:100,semi:!0,singleQuote:!1,trailingComma:!1,endOfLine:"lf"});function b(r){let i=r&&typeof r=="object"?r:{},n=Number(i.tabWidth),e=Number(i.printWidth),t=i.endOfLine;return{tabWidth:Number.isFinite(n)&&n>0?Math.min(8,Math.floor(n)):2,useTabs:!!i.useTabs,printWidth:Number.isFinite(e)&&e>=40?Math.floor(e):100,semi:i.semi!==!1,singleQuote:!!i.singleQuote,trailingComma:!!i.trailingComma,endOfLine:t==="crlf"||t==="cr"?t:"lf"}}var f=r=>r.useTabs?"	":" ".repeat(r.tabWidth),m=(r,i)=>{let n=i.endOfLine==="crlf"?`\r
`:i.endOfLine==="cr"?"\r":`
`;return r.join(n)};function h(r,i){let n=f(i),e=0,t=[];for(let s of String(r).replace(/\r\n/g,`
`).split(`
`)){let a=s.trim();if(!a){t.push("");continue}/^[}\]\)]/.test(a)&&(e=Math.max(0,e-1)),t.push(n.repeat(e)+a);let o=(a.match(/[{\[(]/g)||[]).length,c=(a.match(/[}\])]/g)||[]).length;e=Math.max(0,e+o-c)}return m(t,i)}function d(r,i){let n=p(l(r),"javascript");return n=h(n,i),i.singleQuote?n=n.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g,(e,t)=>/'/.test(t)?e:`'${t.replace(/\\"/g,'"')}'`):n=n.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g,(e,t)=>/"/.test(t)?e:`"${t.replace(/\\'/g,"'")}"`),i.semi?(n=n.replace(/([^;\s{}])\s*\n/g,(e,t)=>/[,:({\[]$/.test(t)?e:`${t};
`),n=n.replace(/;;+/g,";")):n=n.replace(/;+(\s*\n)/g,"$1").replace(/;+\s*$/gm,""),n}function F(r,i){let n=g(l(r)),e=f(i);return n=n.replace(/^( +)/gm,(t,s)=>e.repeat(Math.floor(s.length/2))),m(n.split(/\r?\n/),i)}function N(r,i){let n=l(r).replace(/\s*\{\s*/g,` {
`).replace(/\s*\}\s*/g,`
}
`).replace(/;\s*/g,`;
`).replace(/\n{3,}/g,`

`);return h(n,i)}function z(r,i){let n=f(i),e=l(r).replace(/\r\n/g,`
`).split(`
`),t=e.filter(o=>o.trim()).map(o=>(o.match(/^ */)??[""])[0].length).filter(o=>o>0),s=t.length?Math.max(1,Math.min(...t)):2,a=e.map(o=>{if(!o.trim())return"";let c=(o.match(/^ */)??[""])[0].length,C=Math.round(c/s);return n.repeat(C)+o.trim()});return m(a,i)}function M(r,i,n={}){let e=b(n),t=String(i||"javascript").toLowerCase(),s;if(t==="diff"||t==="commit")s=u(r,{eol:e.endOfLine});else if(t==="html"||t==="htm"||t==="htmlmixed")s=F(r,e);else if(t==="css"||t==="scss"||t==="less")s=N(r,e);else if(t==="python"||t==="py")s=z(r,e);else if(t==="json")try{s=JSON.stringify(JSON.parse(String(r)),null,e.useTabs?"	":e.tabWidth),s=m(String(s).split(/\r?\n/),e)}catch{s=d(r,e)}else t==="shell"||t==="curl"||t==="bash"||t==="sh"||t==="zsh"||t==="cli"?s=m(String(r).replace(/\r\n/g,`
`).split(`
`),e):s=d(r,e);return s}export{y as a,b,M as c};
