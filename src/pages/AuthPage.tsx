import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Truck, Car, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, signup, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '',
    phone: '',
    vehicleNumber: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await login(loginData.email, loginData.password);
    
    if (error) {
      if (error.includes('Email not confirmed') || error.includes('confirm your email')) {
        setShowEmailNotConfirmed(true);
        setIsLoading(false);
        return;
      }
      toast({
        title: "Login Failed",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signup(signupData.email, signupData.password, {
      fullName: `${signupData.firstName} ${signupData.lastName}`.trim(),
      phone: signupData.phone,
      vehicleNumber: signupData.vehicleNumber,
    });
    
    if (error) {
      toast({
        title: "Signup Failed",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account Created",
        description: "Please check your email to verify your account.",
      });
    }
    
    setIsLoading(false);
  };

  const handleResendVerificationEmail = async () => {
    if (!loginData.email) {
      toast({ title: 'Email required', description: 'Please enter your email address', variant: 'destructive' });
      return;
    }

    setIsResendingEmail(true);
    const { error } = await resendVerificationEmail(loginData.email);
    
    if (error) {
      toast({ title: 'Failed to resend', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Email sent', description: 'Please check your inbox for the verification link' });
      setShowEmailNotConfirmed(false);
    }
    setIsResendingEmail(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <img 
              src="/lovable-uploads/18787fac-b55f-4fd2-9e36-9b0a7dac93e4.png" 
              alt="MyFleet Logo" 
              className="w-16 h-16 mb-4"
            />
            <h1 className="text-2xl font-bold">MyFleet</h1>
          </div>
          <p className="text-muted-foreground">Access your fleet management dashboard</p>
        </div>

        <Tabs defaultValue="login" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {showEmailNotConfirmed && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-yellow-800">Email not verified</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            Please check your inbox and click the verification link, or resend it below.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResendVerificationEmail}
                            disabled={isResendingEmail}
                            className="mt-2 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                          >
                            {isResendingEmail ? 'Sending...' : 'Resend verification email'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Create a new account to start managing your fleet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">First Name</Label>
                      <Input
                        id="signup-firstName"
                        placeholder="John"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">Last Name</Label>
                      <Input
                        id="signup-lastName"
                        placeholder="Doe"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <div className="flex">
                      <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground border-input">
                        +91
                      </div>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="9876543210"
                        value={signupData.phone.replace('+91', '')}
                        onChange={(e) => {
                          const phoneNumber = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setSignupData(prev => ({ ...prev, phone: `+91${phoneNumber}` }));
                        }}
                        className="rounded-l-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-vehicle" className="flex items-center">
                      <Car className="h-4 w-4 mr-2" />
                      Vehicle Number
                    </Label>
                    <Input
                      id="signup-vehicle"
                      type="text"
                      placeholder="KA 01 AB 1234"
                      value={signupData.vehicleNumber}
                      onChange={(e) => setSignupData(prev => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a strong password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>For testing: Use any email/password combination</p>
          <p>Check your email after signup to verify your account</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;