import { redirect } from 'next/navigation';
import { LegacyPathLearn } from '@/components/LegacyPathLearn';
import { PathSelection } from '@/components/PathSelection';
import { learnerContext } from '@/lib/auth';
import { curriculumAvailable } from '@/lib/schema';

export default async function Learn(){
  const {db,user}=await learnerContext();
  if(!await curriculumAvailable(db))return <LegacyPathLearn/>;
  const enrollment=await db.from('learner_path_enrollments').select('domain_node_id').eq('user_id',user.id).eq('is_active',true).maybeSingle();
  if(enrollment.error?.code==='PGRST205')return <LegacyPathLearn/>;
  if(enrollment.error)throw enrollment.error;
  if(enrollment.data){
    const {data:domain,error}=await db.from('curriculum_nodes').select('slug').eq('id',enrollment.data.domain_node_id).eq('node_type','domain').eq('status','published').is('parent_id',null).maybeSingle();
    if(error)throw error;
    if(domain)redirect(`/learn/${domain.slug}`);
  }
  return <PathSelection/>;
}
