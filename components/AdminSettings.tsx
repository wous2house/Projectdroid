
// Complete component implementation for AdminSettings with avatar upload support.
import React, { useState, useEffect, useRef } from 'react';
import { User, X, Plus, UserPlus, Database, Download, Upload, Shield, Trash2, CheckCircle2, Circle, Edit3, Mail, Briefcase, Link as LinkIcon, Camera, Save, Euro } from 'lucide-react';
import { User as UserType, Project, Prices, AppState } from '../types';
import { DEFAULT_PRICES } from '../constants';

interface AdminSettingsProps {
  users: UserType[];
  projects: Project[];
  prices: Prices;
  onUpdatePrices: (prices: Prices) => void;
  onClose: () => void;
  onAddUser: (user: Omit<UserType, 'id'>) => void;
  onUpdateUser: (user: UserType) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateProject: (project: Project) => void;
  onBackup: () => void;
  onRestore: (data: AppState) => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
  getFullState: () => AppState;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ 
  users, 
  projects, 
  prices,
  onUpdatePrices,
  onClose, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser,
  onUpdateProject,
  onBackup, 
  onRestore,
  triggerConfirm,
  getFullState
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'database' | 'prices'>('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formEmail, setFormEmail] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [syncUrl, setSyncUrl] = useState(() => localStorage.getItem('projectdroid_sync_url') || 'https://projectdroid.webdroids.nl');
  const [syncApiKey, setSyncApiKey] = useState(() => localStorage.getItem('projectdroid_sync_api_key') || '');
  const [isSyncing, setIsSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newApiOption, setNewApiOption] = useState('');

  // Synchroniseer formulier bij bewerken
  useEffect(() => {
    if (editingUser) {
      setFormName(editingUser.name || '');
      setFormRole(editingUser.role || 'user');
      setFormEmail(editingUser.email || '');
      setFormTitle(editingUser.title || '');
      setFormAvatar(editingUser.avatar || '');
      setFormPassword(editingUser.password || '');
      setShowAddUser(true);
    }
  }, [editingUser]);

  const handleCloseForm = () => {
    setShowAddUser(false);
    setEditingUser(null);
    setFormName('');
    setFormRole('user');
    setFormEmail('');
    setFormTitle('');
    setFormAvatar('');
    setFormPassword('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const avatarUrl = formAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formName}`;

    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name: formName,
        role: formRole,
        email: formEmail,
        title: formTitle,
        avatar: avatarUrl,
        password: formPassword
      });
    } else {
      onAddUser({
        name: formName,
        role: formRole,
        avatar: avatarUrl,
        title: formTitle || 'Projectlid',
        email: formEmail || `${formName.toLowerCase().replace(' ', '.')}@webdroids.nl`,
        password: formPassword || 'ChangeMe123!'
      });
    }
    
    handleCloseForm();
  };

  const handleBackupClick = () => {
    triggerConfirm(
      'Systeem Backup Maken',
      'Weet je zeker dat je een volledige backup van het systeem wilt downloaden?',
      onBackup
    );
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerConfirm(
      'Systeem Herstellen',
      'Weet je zeker dat je het systeem wilt herstellen? Dit zal alle huidige data OVERSCHRIJVEN met de data uit de backup. Dit kan niet ongedaan worden gemaakt.',
      () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const result = event.target?.result as string;
            const json = JSON.parse(result);
            if (json && (json.projects || json.users || json.customers)) {
              onRestore(json);
            } else {
              alert('Dit bestand lijkt geen geldig Projectdroid backup-bestand te zijn.');
            }
          } catch (err) {
            alert('Fout bij het lezen van het backup-bestand.');
          }
        };
        reader.readAsText(file);
      }
    );
    e.target.value = '';
  };

  const handleSyncUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSyncUrl(url);
    localStorage.setItem('projectdroid_sync_url', url);
  };

  const handleSyncApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSyncApiKey(key);
    localStorage.setItem('projectdroid_sync_api_key', key);
  };

  const handlePush = async () => {
    if (!syncApiKey) {
      alert('Vul eerst een API Key in om te kunnen synchroniseren.');
      return;
    }
    triggerConfirm(
      'Push naar Cloud',
      `Weet je zeker dat je de lokale data wilt pushen naar ${syncUrl}? Dit zal de online database OVERSCHRIJVEN.`,
      async () => {
        setIsSyncing(true);
        try {
          const state = getFullState();
          const cleanUrl = syncUrl.replace(/\/$/, '');
          const response = await fetch(`${cleanUrl}/api/admin/restore`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': syncApiKey,
              'Authorization': `Bearer ${syncApiKey}`
            },
            body: JSON.stringify(state)
          });
          if (response.ok) {
            alert('Data succesvol gepushed naar de cloud!');
          } else if (response.status === 401) {
            alert('Fout: Onjuiste API Key.');
          } else {
            alert('Fout bij het pushen van data.');
          }
        } catch (error) {
          alert('Kan geen verbinding maken met de server. Controleer de URL.');
        } finally {
          setIsSyncing(false);
        }
      }
    );
  };

  const handlePull = async () => {
    if (!syncApiKey) {
      alert('Vul eerst een API Key in om te kunnen synchroniseren.');
      return;
    }
    triggerConfirm(
      'Pull van Cloud',
      `Weet je zeker dat je de data wilt ophalen van ${syncUrl}? Dit zal je lokale database OVERSCHRIJVEN.`,
      async () => {
        setIsSyncing(true);
        try {
          const cleanUrl = syncUrl.replace(/\/$/, '');
          const response = await fetch(`${cleanUrl}/api/data`, {
            headers: {
              'x-api-key': syncApiKey,
              'Authorization': `Bearer ${syncApiKey}`
            }
          });
          if (response.ok) {
            const json = await response.json();
            onRestore(json);
            alert('Data succesvol opgehaald uit de cloud!');
          } else if (response.status === 401) {
            alert('Fout: Onjuiste API Key.');
          } else {
            alert('Fout bij het ophalen van data.');
          }
        } catch (error) {
          alert('Kan geen verbinding maken met de server. Controleer de URL.');
        } finally {
          setIsSyncing(false);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-8 bg-dark/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#061637] border border-white/10 rounded-[48px] w-full max-w-4xl p-8 sm:p-12 shadow-3xl animate-in zoom-in-95 duration-200 font-sans max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-text-main dark:text-white tracking-tighter">Admin Dashboard</h2>
              <p className="text-xs font-bold text-text-muted dark:text-light/50 uppercase tracking-widest font-subtitle">Systeembeheer & Onderhoud</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-danger transition-all p-4 bg-light dark:bg-dark rounded-3xl">
            <X className="w-8 h-8 dark:text-white" />
          </button>
        </div>

        <div className="flex items-center space-x-2 mb-10 bg-light dark:bg-dark p-1.5 rounded-2xl w-fit font-subtitle">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted dark:text-light/40'}`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Gebruikers</span>
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted dark:text-light/40'}`}
          >
            <Database className="w-4 h-4" />
            <span>Database</span>
          </button>
          <button 
            onClick={() => setActiveTab('prices')}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'prices' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted dark:text-light/40'}`}
          >
            <Euro className="w-4 h-4" />
            <span>Prijzen</span>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 scrollbar-hide">
          {activeTab === 'users' ? (
            <div className="space-y-8 animate-in slide-in-from-left-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-text-main dark:text-white">Gebruikersbeheer</h3>
                {!showAddUser && (
                  <button 
                    onClick={() => { setEditingUser(null); setShowAddUser(true); }}
                    className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Gebruiker Toevoegen</span>
                  </button>
                )}
              </div>

              {showAddUser && (
                <form onSubmit={handleSubmitUser} className="bg-light dark:bg-dark/40 p-8 rounded-[32px] border-2 border-primary/20 space-y-8 animate-in zoom-in-95">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-sm uppercase tracking-widest text-primary">
                      {editingUser ? `Bewerken: ${editingUser.name}` : 'Nieuwe Gebruiker'}
                    </h4>
                    <button type="button" onClick={handleCloseForm} className="text-text-muted hover:text-danger"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    <div className="md:col-span-4 flex flex-col items-center space-y-4">
                      <label className="text-[10px] font-black uppercase text-text-muted tracking-widest">Profielfoto</label>
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
                        <div className="w-32 h-32 rounded-[32px] border-4 border-primary/20 overflow-hidden shadow-xl bg-white dark:bg-dark">
                          <img 
                            src={formAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formName || 'New'}`} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 bg-white" 
                            alt="Avatar Preview" 
                          />
                        </div>
                        <div className="absolute inset-0 bg-primary/40 rounded-[32px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300">
                          <Camera className="w-8 h-8 text-white mb-1" />
                          <span className="text-[8px] text-white font-black uppercase tracking-widest">Upload</span>
                        </div>
                        <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg">
                          <Upload className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted ml-2">Volledige Naam</label>
                        <input 
                          required
                          type="text" 
                          value={formName} 
                          onChange={e => setFormName(e.target.value)}
                          className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm dark:text-white"
                          placeholder="Naam..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted ml-2">Functie / Titel</label>
                        <input 
                          type="text" 
                          value={formTitle} 
                          onChange={e => setFormTitle(e.target.value)}
                          className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm dark:text-white"
                          placeholder="Projectmanager..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted ml-2">E-mailadres</label>
                        <input 
                          type="email" 
                          value={formEmail} 
                          onChange={e => setFormEmail(e.target.value)}
                          className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm dark:text-white"
                          placeholder="e-mail..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted ml-2">Rol</label>
                        <select 
                          value={formRole}
                          onChange={e => setFormRole(e.target.value as 'admin' | 'user')}
                          className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm dark:text-white cursor-pointer"
                        >
                          <option value="user">Gebruiker</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted ml-2">Wachtwoord</label>
                        <input 
                          type="password" 
                          value={formPassword} 
                          onChange={e => setFormPassword(e.target.value)}
                          className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm dark:text-white"
                          placeholder="Wachtwoord..."
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase text-text-muted ml-2">Avatar URL (Optioneel)</label>
                        <input 
                          type="text" 
                          value={formAvatar} 
                          onChange={e => setFormAvatar(e.target.value)}
                          className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none font-bold text-sm dark:text-white"
                          placeholder="https://... of base64 data"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 justify-end pt-4">
                    <button type="button" onClick={handleCloseForm} className="px-6 py-2 text-[10px] font-black uppercase text-text-muted">Annuleren</button>
                    <button type="submit" className="bg-primary text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>{editingUser ? 'Wijzigingen Opslaan' : 'Toevoegen'}</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4 pb-10">
                {users.map(u => (
                  <div key={u.id} className="bg-white dark:bg-dark/20 border border-light dark:border-white/5 p-6 rounded-[32px] flex items-center justify-between group hover:border-primary/20 transition-all">
                    <div className="flex items-center space-x-5 min-w-0">
                      <div className="relative">
                        <img src={u.avatar} className="w-16 h-16 rounded-2xl shadow-sm object-cover bg-white" alt={u.name} />
                        {u.role === 'admin' && (
                          <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                            <Shield className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-black text-text-main dark:text-white truncate">{u.name}</h4>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-primary text-white' : 'bg-light dark:bg-dark text-text-muted'}`}>{u.role}</span>
                        </div>
                        <p className="text-[11px] font-bold text-text-muted dark:text-light/50 font-subtitle truncate">{u.title || 'Projectlid'} • {u.email || 'Geen e-mail'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-3 text-primary bg-primary/5 hover:bg-primary hover:text-white rounded-xl transition-all"
                        title="Gebruiker bewerken"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => onDeleteUser(u.id)}
                        className="p-3 text-danger bg-danger/5 hover:bg-danger hover:text-white rounded-xl transition-all"
                        title="Gebruiker verwijderen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'database' ? (
            <div className="space-y-10 animate-in slide-in-from-right-4 font-subtitle">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-primary/5 dark:bg-white/5 border border-primary/10 p-10 rounded-[40px] space-y-6 grid items-center">
                  <div className="p-4 bg-primary text-white rounded-2xl w-fit">
                    <Download className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-text-main dark:text-white mb-2">Systeem Backup</h4>
                    <p className="text-sm text-text-muted dark:text-light/60 leading-relaxed mb-6">Exporteer de volledige database inclusief projecten, klanten en instellingen naar een JSON bestand.</p>
                  </div>
                  <button 
                    onClick={onBackup}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    Download Backup (.json)
                  </button>
                </div>

                <div className="bg-warning/5 border border-warning/10 p-10 rounded-[40px] space-y-6 grid items-center">
                  <div className="p-4 bg-warning text-white rounded-2xl w-fit">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-text-main dark:text-white mb-2">Herstellen</h4>
                    <p className="text-sm text-text-muted dark:text-light/60 leading-relaxed mb-6">Importeer een eerder gemaakte backup. Let op: dit overschrijft de huidige data volledig.</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleFileRestore}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <button className="w-full py-4 bg-warning text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-warning/20">
                      Upload & Herstel Data
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-light dark:bg-dark/40 p-8 rounded-[40px] flex items-center space-x-6">
                <div className="p-4 bg-info/10 text-info rounded-2xl">
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <h5 className="font-black text-text-main dark:text-white uppercase tracking-widest text-xs mb-1">Database Statistieken</h5>
                  <p className="text-xs text-text-muted dark:text-light/50 font-bold">
                    Totaal: {projects.length} Projecten • {users.length} Gebruikers
                  </p>
                </div>
              </div>

              {navigator.userAgent.toLowerCase().indexOf(' electron/') > -1 && (
                <div className="bg-white dark:bg-dark/20 border border-light dark:border-white/5 p-10 rounded-[40px] space-y-8">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                      <LinkIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-text-main dark:text-white mb-1">Cloud Synchronisatie</h4>
                      <p className="text-sm text-text-muted dark:text-light/60">Synchroniseer data tussen deze desktop app en de online versie.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-text-muted ml-2">Cloud Server URL</label>
                    <input 
                      type="text" 
                      value={syncUrl} 
                      onChange={handleSyncUrlChange}
                      className="w-full bg-light dark:bg-dark/50 border border-transparent focus:border-primary rounded-2xl px-6 py-4 outline-none font-bold text-sm dark:text-white"
                      placeholder="https://projectdroid.webdroids.nl"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-text-muted ml-2">API Key</label>
                    <input 
                      type="password" 
                      value={syncApiKey} 
                      onChange={handleSyncApiKeyChange}
                      className="w-full bg-light dark:bg-dark/50 border border-transparent focus:border-primary rounded-2xl px-6 py-4 outline-none font-bold text-sm dark:text-white"
                      placeholder="Voer je API Key in..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      onClick={handlePush}
                      disabled={isSyncing}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Push naar Cloud</span>
                    </button>
                    <button 
                      onClick={handlePull}
                      disabled={isSyncing}
                      className="w-full py-4 bg-info text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-info/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Pull van Cloud</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'prices' ? (
            <div className="space-y-8 animate-in slide-in-from-left-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-text-main dark:text-white">Prijzen Beheer</h3>
                </div>

                <div className="bg-light dark:bg-dark/40 p-8 rounded-[32px] border-2 border-primary/20 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(prices).filter(([key]) => key !== 'apiToPostsOptions' && key !== 'dynamicCosts' && key !== 'dynamicPricing' && !key.endsWith('_cost')).map(([key, value]) => {
                    const hasCost = DEFAULT_PRICES.hasOwnProperty(`${key}_cost`);
                    const dynamicData = prices.dynamicPricing?.[key] || { isDynamic: false, isUnlimited: false, limit: 1 };
                    const isDynamic = dynamicData.isDynamic;

                    return (
                      <div key={key} className="space-y-4 bg-white dark:bg-dark p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                        <label className="text-[12px] font-black uppercase tracking-widest text-text-main dark:text-white">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">
                              Verkoop Prijs (€)
                            </label>
                            <div className="relative">
                              <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                              <input
                                type="number"
                                value={value !== undefined ? value : (DEFAULT_PRICES[key as keyof Prices] as number)}
                                onChange={(e) => onUpdatePrices({ ...prices, [key]: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-light dark:bg-dark-card rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white transition-all"
                              />
                            </div>
                          </div>
                          {hasCost && (
                            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/5">
                              <div className="flex flex-col space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-danger opacity-80 ml-2">
                                  Inkoop Prijs (€)
                                </label>
                                <div className="relative">
                                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-danger opacity-80" />
                                  <input
                                    type="number"
                                    value={prices[`${key}_cost` as keyof Prices] !== undefined ? prices[`${key}_cost` as keyof Prices] as number : (DEFAULT_PRICES[`${key}_cost` as keyof Prices] as number)}
                                    onChange={(e) => onUpdatePrices({ ...prices, [`${key}_cost`]: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-light dark:bg-dark-card rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-danger dark:text-white transition-all"
                                  />
                                </div>
                              </div>

                              <div className="bg-light dark:bg-dark/40 rounded-xl p-4 border border-slate-200 dark:border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Dynamisch delen</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdatePrices({
                                        ...prices,
                                        dynamicPricing: {
                                          ...(prices.dynamicPricing || {}),
                                          [key]: { ...dynamicData, isDynamic: !isDynamic }
                                        }
                                      });
                                    }}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isDynamic ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                                  >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isDynamic ? 'translate-x-5' : 'translate-x-1'}`} />
                                  </button>
                                </div>
                                
                                {isDynamic && (
                                  <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={dynamicData.isAnnual ?? true}
                                        onChange={(e) => {
                                          onUpdatePrices({
                                            ...prices,
                                            dynamicPricing: {
                                              ...(prices.dynamicPricing || {}),
                                              [key]: { ...dynamicData, isAnnual: e.target.checked }
                                            }
                                          });
                                        }}
                                        className="w-4 h-4 rounded-md border-slate-300 text-primary focus:ring-primary"
                                      />
                                      <span className="text-xs font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">
                                        Jaarlijks bedrag
                                      </span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={dynamicData.isUnlimited}
                                        onChange={(e) => {
                                          onUpdatePrices({
                                            ...prices,
                                            dynamicPricing: {
                                              ...(prices.dynamicPricing || {}),
                                              [key]: { ...dynamicData, isUnlimited: e.target.checked }
                                            }
                                          });
                                        }}
                                        className="w-4 h-4 rounded-md border-slate-300 text-primary focus:ring-primary"
                                      />
                                      <span className="text-xs font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">
                                        Ongelimiteerde websites
                                      </span>
                                    </label>

                                    {!dynamicData.isUnlimited && (
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                                          Aantal websites in licentie
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={dynamicData.limit || 1}
                                          onChange={(e) => {
                                            onUpdatePrices({
                                              ...prices,
                                              dynamicPricing: {
                                                ...(prices.dynamicPricing || {}),
                                                [key]: { ...dynamicData, limit: parseInt(e.target.value) || 1 }
                                              }
                                            });
                                          }}
                                          className="w-full bg-white dark:bg-dark-card rounded-lg px-4 py-2.5 font-bold text-xs outline-none border border-slate-200 dark:border-white/10 focus:border-primary dark:text-white transition-all"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              <div className="bg-light dark:bg-dark/40 p-8 rounded-[32px] border-2 border-primary/20 space-y-8 mt-8">
                <h4 className="text-lg font-black text-text-main dark:text-white">API to Posts Opties</h4>
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newApiOption}
                    onChange={(e) => setNewApiOption(e.target.value)}
                    placeholder="Nieuwe optie..."
                    className="flex-grow bg-white dark:bg-dark rounded-xl px-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white"
                  />
                  <button
                    onClick={() => {
                      if (newApiOption.trim() && !(prices.apiToPostsOptions || []).includes(newApiOption.trim())) {
                        onUpdatePrices({
                          ...prices,
                          apiToPostsOptions: [...(prices.apiToPostsOptions || []), newApiOption.trim()]
                        });
                        setNewApiOption('');
                      }
                    }}
                    className="bg-primary text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-hover transition-colors"
                  >
                    Toevoegen
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(prices.apiToPostsOptions || []).map(opt => (
                    <div key={opt} className="flex items-center justify-between bg-white dark:bg-dark p-4 rounded-xl border border-light dark:border-white/5">
                      <span className="font-bold text-sm text-text-main dark:text-white">{opt}</span>
                      <button
                        onClick={() => {
                          onUpdatePrices({
                            ...prices,
                            apiToPostsOptions: (prices.apiToPostsOptions || []).filter(o => o !== opt)
                          });
                        }}
                        className="text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-10 pt-10 border-t border-light dark:border-white/5 flex justify-between items-center shrink-0">
          <p className="text-[10px] font-black text-text-muted dark:text-white/20 uppercase tracking-[0.2em]">Projectdroid Professional • Versie 1.8.1</p>
          <button 
            onClick={onClose}
            className="px-12 py-5 bg-light dark:bg-dark text-text-main dark:text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
          >
            Dashboard Sluiten
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
