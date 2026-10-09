import { test,expect } from '@playwright/test';

test('curriculum setup form and material tabs fit the viewport',async({page})=>{
 for(const view of ['form','editor']){
  await page.goto('/dev-preview-setup/'+view,{waitUntil:'networkidle'});
  await expect(page.getByRole('heading',{name:view==='form'?'Add Topic':'Product Vision'}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),view+' horizontal overflow').toBe(true);
  if(view==='editor'){
   await page.getByRole('button',{name:'Resources',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Optional resources'})).toBeVisible();
   await page.getByRole('button',{name:'History',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Revision history'})).toBeVisible();
  }
 }
});
