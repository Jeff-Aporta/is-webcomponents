function g(o){let r=[],i=[],n="",t=0,u=!1,s=String(o||"").replace(/^\uFEFF/,"");for(;t<s.length;){let e=s[t];if(u){if(e==='"'){if(s[t+1]==='"'){n+='"',t+=2;continue}u=!1,t++;continue}n+=e,t++;continue}if(e==='"'){u=!0,t++;continue}if(e===","){i.push(n),n="",t++;continue}if(e===`
`||e==="\r"){e==="\r"&&s[t+1]===`
`&&t++,i.push(n),r.push(i),i=[],n="",t++;continue}n+=e,t++}return(n.length||i.length)&&(i.push(n),r.push(i)),r.filter(e=>e.some(c=>c!==""))}function p(o){return o.map(r=>r.map(i=>{let n=String(i??"");return/["\n\r,]/.test(n)?`"${n.replace(/"/g,'""')}"`:n}).join(",")).join(`
`)}export{g as a,p as b};
