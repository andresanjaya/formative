import Link from 'next/link';
import { SignOut } from './SignOut';
import { supabaseServer } from '@/lib/supabase/server';

export async function Shell({ children, title, admin=false, streak }: { children:React.ReactNode; title:string; admin?:boolean; streak?:number }) {
  const links = admin ? [['/admin','Overview','O'],['/admin/setup/domains','Learning Domains','D'],['/admin/setup/sections','Sections','S'],['/admin/setup/topics','Topics','T'],['/admin/materials','Learning Materials','M'],['/admin/resources','Resources','R'],['/admin/questions','Questions','Q']] : [['/learn','Learn','L'],['/review','Review','R'],['/library','Library','B'],['/progress','Progress','P']];
  const mobileLinks = admin ? [['/admin','Overview','O'],['/admin/setup/domains','Domains','D'],['/admin/setup/sections','Sections','S'],['/admin/setup/topics','Topics','T'],['/admin/materials','Materials','M'],['/admin/resources','Resources','R'],['/admin/questions','Questions','Q'],['/learn','Learn','L']] : links;
  let canCurate = admin;
  if (!admin) {
    const db = await supabaseServer();
    const { data: { user } } = await db.auth.getUser();
    if (user) {
      const { data, error } = await db.rpc('is_admin');
      canCurate = !error && data === true;
    }
  }
  return <div className="app-frame">
    <aside className="sidebar"><Link className="brand" href="/learn"><span className="brand-mark">✦</span> formative</Link><nav aria-label={admin?'Admin navigation':'Learning navigation'}>{admin&&<div className="tag">SETUP CURRICULUM</div>}{links.map(([href,label,icon])=><Link className="nav-link" key={href} href={href}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav><div className="side-foot"><Link className="nav-link" href={admin?'/learn':'/settings'}>{admin?'Switch to learning':'Settings'}</Link>{!admin&&canCurate&&<Link className="nav-link" href="/admin">Content studio</Link>}<SignOut /></div></aside>
    <div className="main-frame"><header className="topbar"><span className="crumb">{admin?'Content studio':'Your learning space'} / {title}</span><div className="row">{streak!==undefined&&<span className="streak-top">♨ {streak} day{streak===1?'':'s'}</span>}<Link className="account-link" href={admin?'/learn':'/settings'} aria-label={admin?'Switch to learning':'Account settings'}>◉</Link></div></header><main className="workspace">{children}</main></div>
    <nav className="mobile-nav" aria-label={admin?'Mobile Admin navigation':'Mobile navigation'}>{mobileLinks.map(([href,label,icon])=><Link key={href} href={href}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav>
  </div>;
}
