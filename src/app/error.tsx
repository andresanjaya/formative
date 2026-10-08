'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <main className="auth-wrap"><div className="tag">SOMETHING WENT WRONG</div><h1>We couldn’t load this page.</h1><p className="muted">Your saved work is still in your account. Check your connection and try again.</p><button className="button space" onClick={reset}>Try again</button></main>}
