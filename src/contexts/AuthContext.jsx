import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const isPremiumPlus = profile?.subscription_status === "premium_plus";
  const isPremium = profile?.subscription_status === "premium" || isPremiumPlus;
  const isPro = isPremiumPlus; // AI Insights + full access

  const canUseAI = isPremiumPlus && (profile?.ai_analyses_used ?? 0) < 10;

  const aiAnalysesLeft = isPremiumPlus ? Math.max(0, 10 - (profile?.ai_analyses_used ?? 0)) : 0;

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, isPro, isPremium, isPremiumPlus, canUseAI, aiAnalysesLeft, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
