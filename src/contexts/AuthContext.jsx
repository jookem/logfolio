import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") { setIsPasswordRecovery(true); return; }
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    setLoading(false);
  };

  const refreshProfile = () => user && fetchProfile(user.id);

  const proTrialActive = profile?.pro_trial_until && new Date(profile.pro_trial_until) > new Date();
  const isProPlus = profile?.subscription_status === "pro_plus";
  const isPro = profile?.subscription_status === "pro" || isProPlus || proTrialActive;

  const canUseAI = isProPlus && (profile?.ai_analyses_used ?? 0) < 10;

  const aiAnalysesLeft = isProPlus ? Math.max(0, 10 - (profile?.ai_analyses_used ?? 0)) : 0;

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, isPro, isProPlus, proTrialActive, canUseAI, aiAnalysesLeft, refreshProfile, signOut, isPasswordRecovery, setIsPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
