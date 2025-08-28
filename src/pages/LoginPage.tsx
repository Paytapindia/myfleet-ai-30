import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Truck, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // exactly 6 digits
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // SEO basics for the login page
    document.title = mode === 'login' ? 'Login - MyFleet AI' : 'Sign Up - MyFleet AI';
    const description = 'Secure email login for MyFleet AI fleet management app';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);

    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', window.location.href);
  }, [mode]);

  const isValidPassword = (value: string) => /^\d{6}$/.test(value);
  const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

  // Keep compatibility with current AuthContext gates (localStorage-based)
  const buildLocalUser = (uid: string) => ({
    id: uid,
    phone: email, // reuse existing key format (phone) to avoid wider refactor now
    email,
    fullName: undefined,
    companyName: undefined,
    panNumber: undefined,
    isOnboarded: false,
    subscribed: false,
    subscriptionTier: null as string | null,
    subscriptionEnd: null as string | null,
  });

  const persistAndEnter = (uid: string) => {
    const localUser = buildLocalUser(uid);
    localStorage.setItem('myfleet_user', JSON.stringify(localUser));
    localStorage.setItem(`user_${localUser.phone}`, JSON.stringify(localUser));
    // Full refresh ensures clean state
    window.location.href = '/';
  };

  const handleLogin = async () => {
    if (!isValidEmail(email)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    if (!isValidPassword(password)) {
      toast({ title: 'Invalid password', description: 'Password must be exactly 6 digits', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Ensure any old sessions are cleared before a fresh sign-in
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error('No user id returned');

      toast({ title: 'Welcome back', description: 'Login successful' });
      persistAndEnter(uid);
    } catch (err: any) {
      toast({ title: 'Login failed', description: err?.message || 'Please try again', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!isValidEmail(email)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }
    if (!isValidPassword(password)) {
      toast({ title: 'Invalid password', description: 'Password must be exactly 6 digits', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Clear stale sessions before sign-up
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}

      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;

      if (data.session && data.user) {
        // If email confirmations are disabled, user is signed in immediately
        toast({ title: 'Account created', description: 'You are now logged in' });
        persistAndEnter(data.user.id);
      } else {
        // If confirmations are enabled
        toast({ title: 'Check your inbox', description: 'We sent a confirmation link to complete signup' });
        navigate('/');
      }
    } catch (err: any) {
      toast({ title: 'Sign up failed', description: err?.message || 'Please try again', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-primary/5 via-background to-accent/5 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mr-3">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">MyFleet AI</h1>
              <p className="text-muted-foreground text-sm">Smart Fleet Management</p>
            </div>
          </div>
        </div>

        <Card className="w-full border-primary/20 shadow-xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">
              {mode === 'login' ? 'Welcome Back' : 'Create your account'}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {mode === 'login'
                ? 'Login with your email and 6-digit password'
                : 'Sign up using your email and choose a 6-digit password'}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-base"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">6-digit Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-9 text-base tracking-widest font-mono"
                  inputMode="numeric"
                  pattern="\\d{6}"
                  maxLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
              <p className="text-xs text-muted-foreground">Use exactly 6 digits. Example: 123456</p>
            </div>

            {mode === 'login' ? (
              <Button onClick={handleLogin} disabled={isLoading || !email || !password} className="w-full h-11 text-base font-medium" size="lg">
                {isLoading ? 'Signing in...' : (<span className="inline-flex items-center"><LogIn className="h-4 w-4 mr-2" /> Login</span>)}
              </Button>
            ) : (
              <Button onClick={handleSignUp} disabled={isLoading || !email || !password} className="w-full h-11 text-base font-medium" size="lg">
                {isLoading ? 'Creating account...' : (<span className="inline-flex items-center"><UserPlus className="h-4 w-4 mr-2" /> Create account</span>)}
              </Button>
            )}

            <div className="flex items-center justify-center text-xs text-muted-foreground pt-2">
              <Shield className="h-4 w-4 mr-2" />
              <span>Supabase-secured authentication</span>
            </div>

            <div className="text-center">
              {mode === 'login' ? (
                <Button variant="link" onClick={() => setMode('signup')} disabled={isLoading} className="text-sm h-auto p-0">
                  New here? Create an account
                </Button>
              ) : (
                <Button variant="link" onClick={() => setMode('login')} disabled={isLoading} className="text-sm h-auto p-0">
                  Already have an account? Login
                </Button>
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
