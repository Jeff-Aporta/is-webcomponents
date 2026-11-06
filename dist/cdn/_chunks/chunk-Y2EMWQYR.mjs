import{b as d}from"./chunk-4KLEPXKB.mjs";var x=/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g,w=/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}(?!\})/g;function S(t){return/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(t??"").trim())}function L(t){let e=String(t??"");if(!e)return[];let n=[],r=new RegExp(x.source,"g"),o=0,s;for(;s=r.exec(e);)s.index>o&&n.push({type:"text",value:e.slice(o,s.index)}),n.push({type:"var",name:s[1]}),o=s.index+s[0].length;return o<e.length&&n.push({type:"text",value:e.slice(o)}),n}function k(t){let e=new Set,n=[];for(let r of L(t))r.type!=="var"||e.has(r.name)||(e.add(r.name),n.push(r.name));return n}function M(t){let e=2166136261,n=String(t??"").trim().toLowerCase();for(let r=0;r<n.length;r+=1)e^=n.charCodeAt(r),e=Math.imul(e,16777619),e^=Math.imul(r+1,2654435761);return(Math.imul(e>>>0,137)>>>0)%360}function N(t){return`--var-tone-h:${M(t)}`}function $(t){return new RegExp(`\\{\\{\\s*${String(t).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*\\}\\}`,"gi")}function R(t,e,n){let r=String(n??"").trim();return S(r)?String(t??"").replace($(e),`{{${r}}}`):String(t??"")}function C(t,e){return String(t??"").replace($(e),"")}function V(t,e,n){let r=`{{${n}}}`,o=Math.max(0,Math.min(e,t.length));return t.slice(0,o)+r+t.slice(o)}function y(t){return String(t??"").replace(w,(e,n)=>`{{${n}}}`)}function l(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function _(t){return`<span class="prompt-var-chip" contenteditable="false" data-var="${l(t)}" style="${N(t)}" title="${l(t)}"><span class="prompt-var-chip__label">{{${l(t)}}}</span></span>`}function b(t,e={}){let n=y(t);if(!n)return"";let r=[],o=0,s=n.replace(x,(g,c)=>{let h=`\uE000PV${o}\uE001`;return o+=1,r.push({token:h,name:c}),h}),a=d(s,e);for(let{token:g,name:c}of r)a=a.split(g).join(_(c));return a}function j(t,e={}){let n=String(t??"");return n?b(n,e):""}function P(t){return b(t,{componentes:!1})||"<p><br></p>"}var f=new Set(["h1","h2","h3","h4","h5","h6","p","ul","ol","li","pre","blockquote","hr"]),A=new Set(["strong","b","em","i","code","a","br","img"]);function i(t){return t.outerHTML}function p(t){return t.dataset.var?`{{${t.dataset.var}}}`:""}function T(t){return t.classList?.contains("prompt-var-chip")?p(t):[...t.childNodes].map(e=>m(e)).join("").trim()}function E(t){let e=[...t.querySelectorAll("tr")];if(!e.length)return i(t);let n=[],r=[...e[0].querySelectorAll("th,td")].map(T);n.push(`| ${r.join(" | ")} |`),n.push(`| ${r.map(()=>"---").join(" | ")} |`);for(let o=1;o<e.length;o+=1){let s=[...e[o].querySelectorAll("th,td")].map(T);n.push(`| ${s.join(" | ")} |`)}return n.join(`
`)}function m(t){if(t.nodeType===Node.TEXT_NODE)return t.textContent||"";if(t.nodeType!==Node.ELEMENT_NODE)return"";let e=t;if(e.classList?.contains("prompt-var-chip"))return p(e);let n=e.tagName.toLowerCase(),r=()=>[...e.childNodes].map(m).join("");if(!A.has(n))return i(e);switch(n){case"strong":case"b":return`**${r()}**`;case"em":case"i":return`*${r()}*`;case"code":return`\`${r()}\``;case"a":{let o=e.getAttribute("href")||"",s=r();return o?`[${s||o}](${o})`:s}case"img":{let o=e.getAttribute("alt")||"imagen",s=e.getAttribute("src")||"";return s?`![${o}](${s})`:""}case"br":return`
`;default:return i(e)}}function u(t){let e=t.tagName.toLowerCase(),n=()=>[...t.childNodes].map(r=>m(r)).join("");if(t.classList?.contains("prompt-var-chip"))return p(t);if(!f.has(e)){if(e==="div"&&t.classList.contains("md-table-wrap")){let r=t.querySelector(":scope > table");if(r)return`${E(r)}

`}return e==="table"?`${E(t)}

`:`${i(t)}

`}switch(e){case"h1":return`# ${n().trim()}

`;case"h2":return`## ${n().trim()}

`;case"h3":return`### ${n().trim()}

`;case"h4":return`#### ${n().trim()}

`;case"h5":return`##### ${n().trim()}

`;case"h6":return`###### ${n().trim()}

`;case"p":return`${n()}

`;case"li":return`${t.parentElement?.tagName.toLowerCase()==="ol"?"1.":"-"} ${n().trimStart()}
`;case"ul":case"ol":return[...t.children].map(r=>u(r)).join("")+`
`;case"pre":return`\`\`\`
${t.querySelector("code")?.textContent??t.textContent??""}
\`\`\`

`;case"blockquote":return n().split(`
`).filter(Boolean).map(r=>`> ${r}`).join(`
`)+`

`;case"hr":return`---

`;case"div":{let r=[...t.children];return t.attributes.length>0||t.classList.length>0||r.some(o=>!f.has(o.tagName.toLowerCase()))?`${i(t)}

`:r.map(o=>u(o)).join("")}default:return`${i(t)}

`}}function O(t){let e="";for(let n of t.childNodes)n.nodeType===Node.ELEMENT_NODE?e+=u(n):n.nodeType===Node.TEXT_NODE&&(e+=n.textContent||"");return e.replace(/\n{3,}/g,`

`).trimEnd()}var H=/\{\{\s*[A-Za-z_]\w*\s*\}\}/;function B(t){if(!t)return!1;let e=document.createTreeWalker(t,NodeFilter.SHOW_TEXT),n=e.nextNode();for(;n;){if(!n.parentElement?.closest(".prompt-var-chip")&&H.test(n.textContent??""))return!0;n=e.nextNode()}return!1}export{x as a,w as b,S as c,L as d,k as e,M as f,N as g,R as h,C as i,V as j,y as k,_ as l,j as m,P as n,O as o,B as p};
