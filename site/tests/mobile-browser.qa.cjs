/* Real-browser mobile regression. Requires Playwright and a local site on port 8844. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.MOBILE_QA_BASE||'http://127.0.0.1:8844';
const screenshots=path.resolve('mobile-screenshots');
fs.mkdirSync(screenshots,{recursive:true});
const selectors={
 home:'.carousel-wrap',profiles:'.profile-body',language:'.reading-language',
 governance:'.governance-layout',
 corpus:'.corpus-area','ai-disclosure':'.ai-disclosure-content'
};
const sizes=[{width:320,height:700},{width:390,height:844},{width:768,height:1024}];
async function check(page,size,route){
 await page.goto(base+'/#'+route,{waitUntil:'domcontentloaded'});
 await page.locator('#view '+selectors[route]).first().waitFor({timeout:25000});
 await page.waitForTimeout(120);
 const result=await page.evaluate(()=>{
   const rect=x=>document.querySelector(x)?.getBoundingClientRect();
   const view=document.querySelector('#view');
   const footer=rect('.bottom-shell');
   const nav=[...document.querySelectorAll('#dock a')].map(n=>n.getBoundingClientRect());
   const strip=document.querySelector('#view .rdmo-tabs');
   const active=strip?.querySelector('[aria-pressed="true"]');
   const source=rect('.reading-about'),annotations=rect('.reading-annotations');
   const profile=rect('.profile-copy'),map=rect('.map-box');
   const text=document.querySelector('.slide-text');
   return {
     route:location.hash,windowWidth:innerWidth,
     overflow:Math.round(Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth),
     overflowY:getComputedStyle(view).overflowY,
     canvasScroll:view.scrollHeight-view.clientHeight,
     footerTop:Math.round(footer.top),footerBottom:Math.round(footer.bottom),
     navTargets:nav.map(r=>[Math.round(r.width),Math.round(r.height)]),
     activeVisible:!active||!strip||(active.getBoundingClientRect().right>strip.getBoundingClientRect().left+5 &&
                                  active.getBoundingClientRect().left<strip.getBoundingClientRect().right-5),
     stacked:!source||!annotations||annotations.top>=source.bottom-2,
     mapStacked:!profile||!map||map.top>=profile.bottom-2,
     mapWidth:map?.width||0,
     slideTextClient:text?.clientHeight||0,slideTextScroll:text?.scrollHeight||0
   };
 });
 console.log('MOBILE_QA',JSON.stringify({viewport:size.width+'x'+size.height,...result}));
 assert.ok(result.overflow<=3,route+': body horizontally overflows '+result.overflow+'px');
 assert.ok(result.footerTop>=0 && result.footerBottom<=size.height+3,route+': dock leaves viewport');
 assert.equal(result.overflowY,'auto',route+': page is not vertically scrollable');
 assert.ok(result.navTargets.every(([w,h])=>w>=39&&h>=44),route+': small dock tap targets');
 assert.ok(result.activeVisible,route+': current region not in visible part of navigation');
 assert.ok(result.stacked,route+': reading cards overlap instead of stacking');
 assert.ok(result.mapStacked,route+': map and description do not stack');
 if(['language','governance'].includes(route)){
   const slider=await page.locator('#view input[type="range"]').first().evaluate(n=>({
     height:n.getBoundingClientRect().height,disabled:n.disabled
   }));
   if(!slider.disabled)assert.ok(slider.height>=40,route+': timeline slider touch area is too small ('+slider.height+'px)');
 }
 if(route==='profiles')assert.ok(result.mapWidth>=size.width*.7,'Profile map too small');
 if(route==='home')assert.ok(result.slideTextScroll<=result.slideTextClient+3,'Home description clipped');
 if(size.width!==320)await page.screenshot({path:path.join(screenshots,size.width+'-'+route+'.png')});
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const size of sizes){
   const ctx=await browser.newContext({viewport:size,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const page=await ctx.newPage();
   for(const route of Object.keys(selectors))await check(page,size,route);
   // Source-only workbook review is enabled, not clause coding.
   await page.goto(base+'/#language');
   await page.locator('.reading-language .reading-annotations h2').waitFor();
   assert.match(await page.locator('.reading-annotations').innerText(),/Not coded yet/);
   const dockRoutes=await page.locator('#dock a').evaluateAll(nodes=>nodes.map(node=>node.dataset.route));
   assert.deepEqual(dockRoutes,['profiles','language','governance','corpus','home']);
   await page.locator('.reading-workbook-details summary').click();
   await page.locator('[data-source-review]').click();
   await page.getByRole('heading',{name:'Review source text'}).waitFor();
   assert.equal(await page.locator('[data-code]').count(),0);
   await page.locator('#source-note').fill('Test-only source review note');
   await page.locator('[data-language-mode="analysis"]').click();
   await page.locator('.reading-language .reading-annotations h2').waitFor();
   await page.locator('.reading-workbook-details summary').click();
   await page.locator('[data-source-review]').click();
   await page.locator('#source-note').waitFor();
   assert.equal(await page.locator('#source-note').inputValue(),'Test-only source review note');
   await page.screenshot({path:path.join(screenshots,size.width+'-source-review.png')});
   await page.goto(base+'/#home');
   await page.locator('.slide-tab').first().waitFor();
   assert.equal(await page.locator('.slide-tab').count(),3);
   const orientation=await page.locator('.slide-tab-label').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).writingMode));
   assert.ok(orientation.length===3&&orientation.every(mode=>mode==='horizontal-tb'));
   await page.locator('[data-slide="2"]').click();
   await page.locator('.slide-panel.codebook table').first().waitFor();
   assert.equal(await page.locator('.slide-panel.codebook table').count(),8);
   await page.locator('.slide-panel.codebook table').last().scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),size.width);
   await page.screenshot({path:path.join(screenshots,size.width+'-codebook.png')});
   await page.locator('[data-next-slide]').click();
   await page.locator('[data-slide="0"][aria-pressed="true"]').waitFor();
   await page.locator('[data-prev-slide]').click();
   await page.locator('[data-slide="2"][aria-pressed="true"]').waitFor();
   if(size.width===390){
     await page.goto(base+'/#language');
     assert.equal(await page.locator('.reading-language [data-excerpt]').count(),0);
     assert.ok((await page.locator('.reading-flow').innerText()).trim().length>20);
     assert.match(await page.locator('.reading-annotations').innerText(),/Not coded yet/);
     assert.equal(await page.locator('.reading-source-picker').count(),0);
     await page.locator('[data-language-view="table"]').click();
     const scroll=page.locator('.lm-table-scroll');
     await scroll.waitFor();
     const table=await scroll.evaluate(n=>[n.clientWidth,n.scrollWidth,getComputedStyle(n).overflowX]);
     assert.ok(table[1]>=table[0]&&table[2]==='auto','Language table has no local horizontal scroll');
     await page.screenshot({path:path.join(screenshots,'390-language-table.png')});
   }
   await ctx.close();
  }
  console.log('MOBILE_QA_RESULT PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error('MOBILE_QA_RESULT FAIL',e);process.exitCode=1;});
