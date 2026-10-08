import { userContext } from '@/lib/auth';
import { OnboardingForm } from '@/components/OnboardingForm';
export default async function Onboarding() {await userContext();return <main className="auth-wrap"><div className="brand"><span className="brand-mark">✦</span> formative</div><div className="tag">ONE QUICK SETUP</div><h1>Make this path yours.</h1><p className="muted">Choose the timezone used for your learning days. It becomes fixed after your first qualifying activity.</p><OnboardingForm /></main>;}
