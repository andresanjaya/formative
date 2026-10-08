import Link from 'next/link';
export default function NotFound(){return <main className="auth-wrap"><div className="tag">NOT FOUND</div><h1>This lesson isn’t available.</h1><p className="muted">It may be unpublished or outside your current path.</p><Link href="/learn" className="button space">Back to path</Link></main>}
