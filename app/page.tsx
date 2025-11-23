'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { Eye, EyeOff, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginSchema } from '@/lib/validation/auth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { setUser } = useAppStore();
  const router = useRouter();
  const { toast } = useToast();

  const keyBenefits = [
    'Publish grades and transcripts with a single click.',
    'Monitor attendance trends in real time across sections.',
    'Collaborate securely with role-based access controls.',
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ identifier, password, rememberMe });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setFormError(fieldErrors.identifier?.[0] || fieldErrors.password?.[0] || 'Invalid input');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result?.message || 'Login failed');
        return;
      }

      setUser(result.user);
      toast({
        title: 'Welcome back!',
        description: `Signed in as ${result.user.firstName} ${result.user.lastName}`,
      });

      const destination =
        result.user.role === 'faculty'
          ? '/faculty/dashboard'
          : result.user.role === 'admin'
            ? '/admin/dashboard'
            : '/dashboard';

      router.push(destination);
    } catch (error) {
      console.error('Login error', error);
      setFormError('Unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020817]">
      <GlowOrb className="absolute -left-32 top-24 h-72 w-72 bg-blue-800/35" />
      <GlowOrb className="absolute bottom-10 right-0 h-96 w-96 bg-emerald-500/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.35),transparent_60%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
          <section className="hidden flex-col justify-between gap-10 rounded-3xl border border-white/10 bg-white/8 p-10 text-white/90 shadow-[0_40px_160px_-60px_rgba(59,130,246,0.55)] backdrop-blur-xl lg:flex">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.45em] text-white/70">
                <Sparkles className="h-4 w-4" />
                Campus Portal
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-white">
                Manage academics with clarity.
              </h1>
              <p className="max-w-lg text-base text-white/80">
                FlexPro keeps students, faculty, and administrators aligned—track attendance, publish results, and collaborate without juggling multiple tools.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-white/80">
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">Built for campus teams</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                {keyBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <Card className="relative overflow-hidden border border-white/10 bg-[#0b1220]/90 backdrop-blur-xl">
            <GlowOrb className="absolute -top-28 right-12 hidden h-56 w-56 bg-blue-600/30 lg:block" />
            <GlowOrb className="absolute -bottom-28 left-20 hidden h-48 w-48 bg-emerald-400/20 lg:block" />

            <CardHeader className="relative z-10 space-y-3 text-center text-white">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg">
                <span className="text-2xl font-bold">F</span>
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold">Welcome back to FlexPro</CardTitle>
                <CardDescription className="text-sm text-slate-300">
                  Sign in with your campus credentials to continue.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="relative z-10">
              <form onSubmit={handleLogin} className="space-y-5">
                {formError ? (
                  <p
                    className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                    aria-live="polite"
                  >
                    {formError}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <label htmlFor="identifier" className="text-sm font-medium text-white/80">
                    Roll Number or Employee ID
                  </label>
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="23I-0763"
                    autoFocus
                    className="h-12 rounded-xl border border-white/15 bg-white/5 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-white/80">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 rounded-xl border border-white/15 bg-white/5 pr-12 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-white/80">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border border-white/20 bg-white/10 text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                    />
                    <span>Stay signed in</span>
                  </label>
                  <button type="button" className="text-xs font-medium text-blue-300 hover:text-blue-200">
                    Need help?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-blue-600 text-white transition hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <p className="text-center text-xs text-slate-400">
                  By continuing you agree to the FlexPro usage policies and consent to campus guidelines.
                </p>
              </form>
            </CardContent>

            <div className="relative z-10 border-t border-white/5 bg-white/5 px-8 py-6 text-center text-xs text-white/60">
              Need access? Contact the campus IT helpdesk at <span className="text-blue-300">support@flexpro.edu</span>.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GlowOrb({ className }: { className: string }) {
  return <div aria-hidden className={`rounded-full blur-3xl ${className}`} />;
}
