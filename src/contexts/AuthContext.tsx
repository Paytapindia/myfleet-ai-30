import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  phone: string;
  email?: string;
  fullName?: string;
  companyName?: string;
  panNumber?: string;
  isOnboarded: boolean;
  subscribed?: boolean;
  subscriptionTier?: string | null;
  subscriptionEnd?: string | null;
  phoneVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  emailUnverified: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, userData: { fullName: string; phone: string; vehicleNumber: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  completeOnboarding: (profileData: {
    fullName: string;
    mobileNo: string;
    vehicleNumber: string;
  }) => Promise<boolean>;
  updateProfile: (profileData: {
    fullName: string;
    companyName: string;
    panNumber: string;
    phone: string;
  }) => Promise<boolean>;
  startTrial: () => Promise<void>;
  setPaidSubscription: (tier: 'semiannual' | 'annual') => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailUnverified, setEmailUnverified] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        
        // Check email verification status
        setEmailUnverified(session?.user && !session.user.email_confirmed_at ? true : false);
        
        if (session?.user && event !== 'SIGNED_OUT') {
          // Only load profile if we have a valid session
          setTimeout(async () => {
            await loadUserProfile(session.user);
          }, 0);
        } else {
          // Clear user state on sign out or no session
          setUser(null);
          setEmailUnverified(false);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('Initial session check:', session?.user?.email, error);
      
      if (error) {
        console.error('Session error:', error);
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setSession(session);
      setEmailUnverified(session?.user && !session.user.email_confirmed_at ? true : false);
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
        setEmailUnverified(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Loading profile for user:', supabaseUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        // On profile error, clear user state to force re-authentication
        setUser(null);
        setSession(null);
        return;
      }

      // If no profile exists, this means the user trigger didn't work or user is invalid
      if (!profile) {
        console.warn('No profile found for user, clearing session');
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        return;
      }

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        phone: supabaseUser.phone || '',
        fullName: profile.full_name || '',
        companyName: profile.company_name || '',
        panNumber: profile.pan_number || '',
        isOnboarded: profile.is_onboarded || false,
        subscribed: profile.subscribed || false,
        subscriptionTier: profile.subscription_tier || null,
        subscriptionEnd: profile.subscription_end || null,
        phoneVerified: profile.phone_verified || false,
      };

      console.log('User profile loaded:', userData.email, userData.isOnboarded);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // On any error, clear user state
      setUser(null);
      setSession(null);
      await supabase.auth.signOut();
    }
  };

  const signup = async (email: string, password: string, userData: { fullName: string; phone: string; vehicleNumber: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: userData.fullName,
            phone: userData.phone,
            vehicle_number: userData.vehicleNumber,
          }
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check for email not confirmed error
        if (error.message.toLowerCase().includes('email not confirmed') || 
            error.message.toLowerCase().includes('confirm your email')) {
          return { error: 'Email not confirmed. Please check your inbox or resend verification email.' };
        }
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const completeOnboarding = async (profileData: {
    fullName: string;
    mobileNo: string;
    vehicleNumber: string;
  }): Promise<boolean> => {
    try {
      if (!user) {
        console.error('No user found during onboarding');
        return false;
      }
      
      // Update profile in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          is_onboarded: true,
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        return false;
      }

      // Create initial vehicle
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          number: profileData.vehicleNumber,
          model: "Not specified",
          status: 'active',
        });

      if (vehicleError) {
        console.error('Failed to create initial vehicle:', vehicleError);
        return false;
      }
      
      // Reload user profile
      await loadUserProfile({ id: user.id } as SupabaseUser);
      
      return true;
    } catch (error) {
      console.error('Onboarding failed:', error);
      return false;
    }
  };

  const updateProfile = async (profileData: {
    fullName: string;
    companyName: string;
    panNumber: string;
    phone: string;
  }): Promise<boolean> => {
    try {
      if (!user) {
        console.error('No user found during profile update');
        return false;
      }
      
      // Check if phone number changed, reset verification status if so
      const phoneChanged = user.phone !== profileData.phone;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          company_name: profileData.companyName,
          pan_number: profileData.panNumber,
          phone: profileData.phone,
          ...(phoneChanged && { phone_verified: false }),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update profile:', error);
        return false;
      }

      // Reload user profile
      await loadUserProfile({ id: user.id } as SupabaseUser);
      
      return true;
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      // Clear state first
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any remaining auth data
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Force page reload to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      // Force reload even if logout fails
      window.location.href = '/';
    }
  };

  const startTrial = async (): Promise<void> => {
    if (!user) throw new Error('No user');
    const end = new Date();
    end.setDate(end.getDate() + 30);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        subscribed: true,
        subscription_tier: 'trial',
        subscription_end: end.toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to start trial:', error);
      throw error;
    }

    await loadUserProfile({ id: user.id } as SupabaseUser);
  };

  const setPaidSubscription = async (tier: 'semiannual' | 'annual'): Promise<void> => {
    if (!user) throw new Error('No user');
    const end = new Date();
    end.setMonth(end.getMonth() + (tier === 'semiannual' ? 6 : 12));
    
    const { error } = await supabase
      .from('profiles')
      .update({
        subscribed: true,
        subscription_tier: tier,
        subscription_end: end.toISOString(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to set paid subscription:', error);
      throw error;
    }

    await loadUserProfile({ id: user.id } as SupabaseUser);
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'Failed to resend verification email' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      emailUnverified,
      login,
      signup,
      logout,
      completeOnboarding,
      updateProfile,
      startTrial,
      setPaidSubscription,
      resendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};