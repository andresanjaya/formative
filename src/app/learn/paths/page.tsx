import { PathSelection } from '@/components/PathSelection';
import { LegacyPathLearn } from '@/components/LegacyPathLearn';
import { learnerContext } from '@/lib/auth';
export default async function Paths(){
  const {db}=await learnerContext();
  const {error}=await db.from('learner_path_enrollments').select('id').limit(1);
  if(error?.code==='PGRST205')return <LegacyPathLearn/>;
  if(error)throw error;
  return <PathSelection/>;
}
