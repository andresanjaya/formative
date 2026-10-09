import { describe, expect, it, vi } from 'vitest';
import { curriculumAvailable, isMissingCurriculum } from '../src/lib/schema';

describe('curriculum schema compatibility', () => {
  it('recognizes only the missing curriculum table', () => {
    expect(isMissingCurriculum({code:'PGRST205',message:"Could not find the table 'public.curriculum_nodes' in the schema cache"})).toBe(true);
    expect(isMissingCurriculum({code:'PGRST205',message:"Could not find the table 'public.profiles' in the schema cache"})).toBe(false);
    expect(isMissingCurriculum({code:'42501',message:'permission denied for curriculum_nodes'})).toBe(false);
  });

  it('uses the legacy path only when the table is absent', async () => {
    const probe=vi.fn().mockResolvedValueOnce({error:{code:'PGRST205',message:'Missing public.curriculum_nodes'}}).mockResolvedValueOnce({error:null});
    const db={from:()=>({select:()=>({limit:probe})})} as never;
    expect(await curriculumAvailable(db)).toBe(false);
    expect(await curriculumAvailable(db)).toBe(true);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('surfaces permissions and connection errors', async () => {
    const error={code:'42501',message:'permission denied for curriculum_nodes'};
    const db={from:()=>({select:()=>({limit:()=>Promise.resolve({error})})})} as never;
    await expect(curriculumAvailable(db)).rejects.toEqual(error);
  });
});
