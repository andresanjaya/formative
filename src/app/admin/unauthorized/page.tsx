import Link from 'next/link';
export default function Unauthorized(){return <main className="auth-wrap"><div className="tag">ACCESS RESTRICTED</div><h1>Curator access is required.</h1><p className="muted">This account has learner access. A project owner must enable the curator role for it.</p><Link href="/learn" className="button space">Back to learning</Link></main>}
