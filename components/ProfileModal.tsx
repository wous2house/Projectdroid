
import React, { useState, useRef } from 'react';
import { X, Save, Camera, Mail, Briefcase, FileText, LogOut, Shield, Upload } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileModalProps {
  user: UserType;
  onSave: (user: UserType) => void;
  onClose: () => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onSave, onClose, onLogout, onOpenAdmin }) => {
  const [formData, setFormData] = useState<UserType>({ ...user });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-8 bg-dark/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#061637] border-2 border-light dark:border-white/10 rounded-[60px] w-full max-w-2xl p-16 shadow-3xl animate-in zoom-in-95 duration-200 font-sans max-h-[90vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-16">
          <h2 className="text-5xl font-black text-text-main dark:text-white tracking-tighter">Mijn Account.</h2>
          <button onClick={onClose} className="text-text-muted hover:text-danger transition-all p-4 bg-light dark:bg-dark rounded-3xl">
            <X className="w-8 h-8 dark:text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="w-full p-8 bg-primary/5 border border-primary/10 rounded-[40px] flex items-center justify-between group hover:bg-primary transition-all duration-300"
            >
              <div className="flex items-center space-x-6">
                <div className="p-4 bg-primary rounded-2xl text-white group-hover:bg-white group-hover:text-primary transition-colors">
                  <Shield className="w-8 h-8" />
                </div>
                <div className="text-left">
                  <h4 className="font-extrabold text-xl text-[#061637] dark:text-white group-hover:text-white tracking-tight">Admin Dashboard</h4>
                  <p className="text-text-muted dark:text-light/70 text-sm group-hover:text-white/90 font-subtitle">Beheer gebruikers, rollen en backups.</p>
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-full text-primary group-hover:text-white">
                <Upload className="w-6 h-6 rotate-90" />
              </div>
            </button>
          )}

          <div className="flex flex-col items-center space-y-6">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div 
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <img 
                src={formData.avatar} 
                className="w-44 h-44 rounded-[54px] border-4 border-primary shadow-2xl object-cover transition-transform group-hover:scale-[1.02] square-logo bg-white" 
                alt="Avatar Preview" 
              />
              <div className="absolute inset-0 bg-dark/40 rounded-[54px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 scale-95 group-hover:scale-100">
                <Camera className="w-12 h-12 text-white mb-2" />
                <span className="text-[10px] text-white font-black uppercase tracking-widest font-subtitle">Wijzig Foto</span>
              </div>
              <div className="absolute -bottom-2 -right-2 p-4 bg-primary text-white rounded-3xl shadow-xl group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-3 font-subtitle">
              <label className="flex items-center space-x-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-300">
                <FileText className="w-4 h-4" />
                <span>Volledige Naam</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-light dark:bg-dark border-3 border-transparent rounded-[24px] px-8 py-5 focus:border-primary outline-none transition-all font-black text-xl text-text-main dark:text-white font-sans"
                placeholder="Bijv. Wouter"
              />
            </div>

            <div className="space-y-3 font-subtitle">
              <label className="flex items-center space-x-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-300">
                <Briefcase className="w-4 h-4" />
                <span>Functie / Titel</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-light dark:bg-dark border-3 border-transparent rounded-[24px] px-8 py-5 focus:border-primary outline-none transition-all font-black text-xl text-text-main dark:text-white font-sans"
                placeholder="Bijv. Projectmanager"
              />
            </div>

            <div className="space-y-3 font-subtitle">
              <label className="flex items-center space-x-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-300">
                <Mail className="w-4 h-4" />
                <span>E-mailadres</span>
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-light dark:bg-dark border-3 border-transparent rounded-[24px] px-8 py-5 focus:border-primary outline-none transition-all font-black text-xl text-text-main dark:text-white font-sans"
                placeholder="naam@webdroids.nl"
              />
            </div>

            <div className="space-y-3 font-subtitle">
              <label className="flex items-center space-x-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary dark:text-blue-300">
                <FileText className="w-4 h-4" />
                <span>Korte Bio</span>
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                className="w-full bg-light dark:bg-dark border-3 border-transparent rounded-[24px] px-8 py-5 focus:border-primary outline-none transition-all font-bold text-lg text-text-main dark:text-white min-h-[120px]"
                placeholder="Vertel iets over jezelf..."
              />
            </div>
          </div>

          <div className="flex flex-col space-y-4 pt-8 font-subtitle">
            <div className="flex space-x-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-6 rounded-[28px] border-2 border-light dark:border-white/10 font-black hover:bg-light dark:hover:bg-dark transition-all text-text-muted dark:text-white uppercase tracking-[0.2em] text-xs"
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="flex-1 py-6 rounded-[28px] bg-primary hover:bg-primary-hover text-white font-black transition-all shadow-3xl shadow-primary/30 uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-3"
              >
                <Save className="w-5 h-5" />
                <span>Opslaan</span>
              </button>
            </div>
            
            {!isElectron && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-5 rounded-[24px] bg-danger/10 hover:bg-danger hover:text-white text-danger font-black transition-all uppercase tracking-[0.2em] text-[10px] flex items-center justify-center space-x-3 mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>Sessie beëindigen (Uitloggen)</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
