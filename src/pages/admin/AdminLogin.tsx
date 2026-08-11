import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { useSession } from '../../auth/useSession';
import { ConfigNotice, LoadingScreen } from '../../auth/AdminGuard';
import { COMPANY } from '../../lib/constants';
import { Button, Field, TextInput } from '../../components/ui';

export default function AdminLogin() {
  const { session, loading, isConfigured, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!isConfigured) return <ConfigNotice />;
  if (session) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src={COMPANY.logo} alt="" className="h-10 w-auto" />
          <div className="text-center">
            <h1 className="text-white font-bold text-lg">Technical Dashboard</h1>
            <p className="text-slate-400 text-xs uppercase tracking-widest mt-0.5">Staff sign-in</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
          <Field label="Email" htmlFor="login-email">
            <TextInput
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@interconverters.com"
              required
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <TextInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>

          {error && (
            <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full justify-center mt-1" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign in
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          Internal access only. Contact an administrator if you need a staff account.
        </p>
      </div>
    </div>
  );
}
