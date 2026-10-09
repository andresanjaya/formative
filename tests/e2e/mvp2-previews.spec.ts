import { test,expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('MVP 2 review, checkpoint, artifact, insight and editor fit the viewport',async({page})=>{
 await mkdir('artifacts/screenshots',{recursive:true});
 const hydrationErrors:string[]=[];
 page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated/i.test(message.text()))hydrationErrors.push(message.text());});
 for(const [view,heading] of [['review','Daily review'],['checkpoint','Product Direction'],['artifact','Rootin'],['weak','Every good step counts.'],['admin-questions','Product Vision'],['tree','Curriculum']]){
  await page.goto('/dev-preview-mvp2/'+view,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:heading}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),view+' horizontal overflow').toBe(true);
  await page.screenshot({path:'artifacts/screenshots/'+test.info().project.name+'-'+view+'-mvp2.png',fullPage:true,caret:'initial'});
 }
 expect(hydrationErrors).toEqual([]);
});
