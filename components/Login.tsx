
import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => void;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, error: externalError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    onLogin(email, password);
    // Reset loading state after a short delay to allow App.tsx to process
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFF] dark:bg-[#040E25] relative overflow-hidden font-sans">
      {/* Decoratieve achtergrond elementen */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-info/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white dark:bg-[#061637] border border-primary/5 dark:border-white/5 rounded-[48px] p-12 shadow-3xl shadow-primary/5">
          <div className="flex flex-col items-center mb-12">
            <div className="relative group mb-8">
              {/* Glow effect voor de login droid */}
              <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-700"></div>
              
              <div className="relative bg-white dark:bg-white/10 rounded-[32px] shadow-2xl border border-primary/10 flex items-center justify-center overflow-hidden w-24 h-24 group-hover:scale-105 transition-transform duration-500">
                <img src="/icon.svg" alt="Projectdroid Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            
            <h1 className="text-4xl font-extrabold text-[#061637] dark:text-white tracking-tighter mb-2 text-center">Projectdroid.</h1>
            <p className="text-text-muted dark:text-light/50 font-medium text-sm font-subtitle">Log in op je Professional account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted font-subtitle opacity-60 ml-4">E-mailadres</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text"
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-light dark:bg-dark/50 border border-transparent focus:border-primary rounded-3xl px-14 py-4 outline-none font-bold text-base transition-all dark:text-white"
                  placeholder="naam@bedrijf.nl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted font-subtitle opacity-60 ml-4">Wachtwoord</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-light dark:bg-dark/50 border border-transparent focus:border-primary rounded-3xl px-14 py-4 outline-none font-bold text-base transition-all dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {externalError && (
              <div className="flex items-center space-x-3 p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{externalError}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 bg-primary hover:bg-primary-hover text-white rounded-3xl font-extrabold text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary/25 flex items-center justify-center space-x-3 group active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Inloggen</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-primary/5 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-40 font-subtitle">
              &copy; 2026 Projectdroid Professional • Versie 1.7.7
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
