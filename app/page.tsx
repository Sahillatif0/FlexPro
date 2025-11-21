'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginSchema } from '@/lib/validation/auth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { setUser } = useAppStore();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ identifier, password });
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900/50 backdrop-blur border-gray-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <CardTitle className="text-2xl font-bold text-white">FlexPro</CardTitle>
          <CardDescription className="text-gray-400">
            Campus Portal Access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {formError ? (
              <p className="rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="text" className="text-sm font-medium text-gray-300">
                Roll Number
              </label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="23I-0763"
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}