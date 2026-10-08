import Link from 'next/link';
export default function Unauthorized(){return <main className="auth-wrap"><div className="tag">ACCESS RESTRICTED</div><h1>Curator access is required.</h1><p className="muted">Your learner account is still available.</p><Link href="/learn" className="button space">Back to learning</Link></main>}
