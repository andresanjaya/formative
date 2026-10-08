import { describe,expect,it } from 'vitest';
import { localDate,progress,streak } from '../src/lib/domain';

describe('learning calendar and progress',()=>{
 it('uses the stored timezone across Asia/Makassar midnight',()=>{
  expect(localDate(new Date('2026-10-08T15:59:00Z'),'Asia/Makassar')).toBe('2026-10-08');
  expect(localDate(new Date('2026-10-08T16:00:00Z'),'Asia/Makassar')).toBe('2026-10-09');
 });
 it('uses calendar dates through daylight saving and leap day',()=>{
  expect(streak(['2024-02-28','2024-02-29','2024-03-01'],'2024-03-01')).toEqual({current:3,longest:3});
  expect(streak(['2026-03-07','2026-03-08','2026-03-09'],'2026-03-09')).toEqual({current:3,longest:3});
 });
 it('preserves yesterday and resets only current streak after a gap',()=>{
  expect(streak(['2026-10-04','2026-10-05'],'2026-10-06')).toEqual({current:2,longest:2});
  expect(streak(['2026-10-04','2026-10-05'],'2026-10-07')).toEqual({current:0,longest:2});
 });
 it('counts only lessons pinned in the enrolled manifest',()=>{
  expect(progress(['vision','future-draft','vision'],['vision'])).toEqual({count:1,total:1,percent:100});
 });
});
