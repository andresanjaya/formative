import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts/screenshots',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
 const page=await browser.newPage({viewport,deviceScaleFactor:name==='mobile'?2:1});
 for(const view of ['path','lesson','completion','progress','admin']){
  await page.goto(`http://localhost:3000/dev-preview/${view}`,{waitUntil:'networkidle'});
  await page.screenshot({path:`artifacts/screenshots/${name}-${view}-preview.png`,fullPage:true});
 }
 await page.close();
}
await browser.close();
