import { chromium } from "playwright";
const b64 = (s) => Buffer.from(s,"utf8").toString("base64").replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
const b = await chromium.launch({headless:true});
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto(`http://127.0.0.1:8491/?s=${b64(JSON.stringify({component:"home"}))}`,{waitUntil:"load"});
await p.waitForTimeout(4000);
const r = await p.evaluate(() => {
  const chain = (el) => { const out=[]; let n=el; while(n && n!==document.body){ out.push(`${n.tagName.toLowerCase()}${n.className?("."+String(n.className).split(/\s+/).join(".")):""}`); n=n.parentElement;} return out.reverse().join(" > "); };
  const stage = document.querySelector(".preview-stage");
  const frame = document.querySelector("iframe.preview-frame");
  const main = document.querySelector("is-preview-component is-main");
  return {
    stageChain: stage ? chain(stage) : null,
    stageChildTags: stage ? [...stage.children].map(c=>`${c.tagName.toLowerCase()}.${[...c.classList].join(".")}`) : null,
    stageInnerTextLen: stage ? stage.innerText.length : null,
    frameChain: frame ? chain(frame) : null,
    frameSameDoc: frame ? !frame.contentDocument : null,
    frameSrc: frame?.getAttribute("src") ?? null,
    mainChain: main ? chain(main) : null,
    bodyChildren: [...document.body.children].map(c=>`${c.tagName.toLowerCase()}.${[...c.classList].join(".")}`),
  };
});
console.log(JSON.stringify(r,null,2));
await b.close();
