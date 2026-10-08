import { test,expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('path, lesson, completion, progress and editor render without horizontal overflow',async({page})=>{
 await mkdir('artifacts/screenshots',{recursive:true});
 const consoleErrors:string[]=[];
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 for(const [view,heading] of [['path','Think in Outcomes'],['lesson','Product Vision'],['completion','One idea put into practice.'],['progress','Every good step counts.'],['admin','Product Vision']]){
  await page.goto(`/dev-preview/${view}`,{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:heading}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${view} horizontal overflow`).toBe(true);
  await page.screenshot({path:`artifacts/screenshots/${test.info().project.name}-${view}-preview.png`,fullPage:true});
 }
 expect(consoleErrors.filter(message=>message.includes('Hydration')||message.includes('hydration'))).toEqual([]);
});
