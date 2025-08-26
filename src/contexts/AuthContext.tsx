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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (email: string, password: string, userData: { fullName: string; phone: string }) => Promise<{ error?: string }>;
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
  }) => Promise<boolean>;
  startTrial: () => Promise<void>;
  setPaidSubscription: (tier: 'semiannual' | 'annual') => Promise<void>;
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        phone: supabaseUser.phone || '',
        fullName: profile?.full_name || '',
        companyName: profile?.company_name || '',
        panNumber: profile?.pan_number || '',
        isOnboarded: profile?.is_onboarded || false,
        subscribed: profile?.subscribed || false,
        subscriptionTier: profile?.subscription_tier || null,
        subscriptionEnd: profile?.subscription_end || null,
      };

      setUser(userData);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUser(null);
    }
  };

  const signup = async (email: string, password: string, userData: { fullName: string; phone: string }) => {
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
  }): Promise<boolean> => {
    try {
      if (!user) {
        console.error('No user found during profile update');
        return false;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          company_name: profileData.companyName,
          pan_number: profileData.panNumber,
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
    setSession(null);
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

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      login,
      signup,
      logout,
      completeOnboarding,
      updateProfile,
      startTrial,
      setPaidSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
};