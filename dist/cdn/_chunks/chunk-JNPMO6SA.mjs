import{e as p}from"./chunk-ELCBMFYU.mjs";function h(n,e){return n.includes(e)||n.includes(`
`)||n.includes("\r")||n.includes('"')?`"${n.replaceAll('"','""')}"`:n}function j(n,e){return n.map(r=>r.map(s=>h(s,e)).join(e)).join(`
`)}function D(n,e,r=!1){let s=[],c=[],i="",a=!1;for(let t=0;t<n.length;t++){let l=n[t]??"";if(a){l==='"'&&n[t+1]==='"'?(i+='"',t++):l==='"'?a=!1:i+=l;continue}l==='"'&&i===""?a=!0:n.startsWith(e,t)?(c.push(i),i="",t+=e.length-1):l===`
`||l==="\r"?(l==="\r"&&n[t+1]===`
`&&t++,c.push(i),s.push(c),c=[],i=""):i+=l}c.push(i),s.push(c);let o=s[s.length-1];return o?.length===1&&o[0]===""&&!r&&s.length>1&&s.pop(),s}function d(n,e){let r=n.length,s=n[0]?.length??0;if(!r||!s)return n;let c=e.filaHasta-e.filaDesde+1,i=e.colHasta-e.colDesde+1,a=p(e)>r*s,o=c%r===0&&i%s===0;if(!a||!o)return n;let f=[];for(let t=0;t<c;t++){let l=n[t%r]??[],g=[];for(let u=0;u<i;u++)g.push(l[u%s]??"");f.push(g)}return f}export{j as a,D as b,d as c};
