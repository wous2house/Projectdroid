import React from 'react';
import { Moon, Sun, Plus, Layout, Users, Home, Calendar, BarChart3 } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  onLogoClick: () => void;
  isDarkMode: boolean;
  onToggleMode: () => void;
  projectName?: string;
  user: User;
  onProfileClick: () => void;
  onCreateProjectClick: () => void;
  activeView: 'dashboard' | 'customers' | 'planning' | 'stats';
  onSwitchView: (view: 'dashboard' | 'customers' | 'planning' | 'stats') => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onLogoClick, isDarkMode, onToggleMode, projectName, user, onProfileClick, onCreateProjectClick, activeView, onSwitchView 
}) => {
  return (
    <>
      {/* Top Navbar - Elevated z-index to stay above modals */}
      <nav className="sticky top-0 z-[6000] bg-white/90 dark:bg-dark/90 backdrop-blur-2xl border-b border-primary/5 dark:border-white/10 px-4 md:px-8 h-16 md:h-20 flex items-center justify-between shadow-sm transition-colors duration-300">
        <div className="flex items-center space-x-4 md:space-x-8">
          <button 
            onClick={onLogoClick}
            className="flex items-center space-x-3 md:space-x-4 group/logo transition-all"
          >
            <div className="relative">
              {/* Glow effect achter de robot */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-primary to-info rounded-full blur opacity-20 group-hover/logo:opacity-40 transition duration-1000 group-hover/logo:duration-200"></div>
              
              <div className="relative bg-white dark:bg-[#0B1E3F] rounded-full shadow-xl border border-primary/10 flex items-center justify-center overflow-hidden w-10 h-10 md:w-13 md:h-13">
                <img 
                  src="/icon.svg" 
                  alt="Projectdroid Logo" 
                  className="w-full h-full object-cover transform group-hover/logo:scale-110 transition-transform duration-500 ease-out bg-white" 
                />
              </div>
            </div>
            
            <div className="flex flex-col items-start text-left">
              <span className="hidden sm:inline text-text-main dark:text-white font-black text-xl md:text-2xl tracking-tighter leading-none">
                Projectdroid
              </span>
              {/*}<span className="hidden sm:inline text-[8px] font-black uppercase tracking-[0.3em] text-primary opacity-60 mt-0.5">
                Professional
              </span>*/}
            </div>
          </button>

          {/* Desktop View Switcher */}
          <div className="hidden md:flex items-center bg-light/50 dark:bg-dark-card/50 p-1 rounded-2xl border border-primary/5 dark:border-white/5 ml-4">
            <button 
              onClick={() => onSwitchView('stats')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'stats' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-primary/5 dark:text-light/40 dark:hover:text-light'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className={"hidden lg:block"}>Dashboard</span>
            </button>
            <button 
              onClick={() => onSwitchView('dashboard')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-primary/5 dark:text-light/40 dark:hover:text-light'}`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span className={"hidden lg:block"}>Projecten</span>
            </button>
            <button 
              onClick={() => onSwitchView('planning')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'planning' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-primary/5 dark:text-light/40 dark:hover:text-light'}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className={"hidden lg:block"}>Planning</span>
            </button>
            <button 
              onClick={() => onSwitchView('customers')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'customers' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:bg-primary/5 dark:text-light/40 dark:hover:text-light'}`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className={"hidden lg:block"}>Klanten</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-5">
          <button
            onClick={onToggleMode}
            className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-primary/5 dark:bg-white/5 hover:bg-primary/10 dark:hover:bg-white/10 transition-all text-primary border border-primary/5 dark:border-white/5"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-secondary" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={onProfileClick}
            className="flex items-center space-x-3 md:space-x-5 border-l border-primary/5 dark:border-white/10 pl-3 md:pl-5 h-8 md:h-10 group transition-all"
          >
            <div className="text-right hidden sm:block font-subtitle">
              <p className="text-[9px] font-black text-text-muted dark:text-light/70 uppercase tracking-[0.2em] leading-none opacity-80">
                {user.title || 'Team Lid'}
              </p>
              <p className="text-[11px] md:text-[13px] font-extrabold text-text-main dark:text-white leading-none mt-1 md:mt-1.5 font-sans tracking-tight">
                {user.name}
              </p>
            </div>
            <img src={user.avatar} alt={user.name} className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border-2 border-primary/20 shadow-lg object-cover bg-white" />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navbar - Elevated z-index to stay above modals */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[6000] bg-white/95 dark:bg-dark/95 backdrop-blur-2xl border-t border-primary/5 dark:border-white/10 h-20 px-6 flex items-center justify-around shadow-2xl">
        <button 
          onClick={() => onSwitchView('stats')}
          className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeView === 'stats' ? 'text-primary' : 'text-text-muted dark:text-light/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeView === 'stats' ? 'bg-primary/10' : ''}`}>
            <BarChart3 className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Dash</span>
        </button>

        <button 
          onClick={() => onSwitchView('dashboard')}
          className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeView === 'dashboard' ? 'text-primary' : 'text-text-muted dark:text-light/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeView === 'dashboard' ? 'bg-primary/10' : ''}`}>
            <Home className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Proj</span>
        </button>

        <button 
          onClick={() => onSwitchView('planning')}
          className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeView === 'planning' ? 'text-primary' : 'text-text-muted dark:text-light/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeView === 'planning' ? 'bg-primary/10' : ''}`}>
            <Calendar className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Plan</span>
        </button>

        <button 
          onClick={() => onSwitchView('customers')}
          className={`flex flex-col items-center justify-center space-y-1 transition-all ${activeView === 'customers' ? 'text-primary' : 'text-text-muted dark:text-light/40'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeView === 'customers' ? 'bg-primary/10' : ''}`}>
            <Users className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Klant</span>
        </button>
      </div>
    </>
  );
};

export default Navbar;