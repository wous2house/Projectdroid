import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus, TaskStatus, Toast, User, Activity, Customer, ActivityDeepLink, Prices } from './types';
import { MOCK_USERS, DEFAULT_PRICES } from './constants';
import Dashboard from './components/Dashboard';
import ProjectDetails from './components/ProjectDetails';
import Navbar from './components/Navbar';
import ProfileModal from './components/ProfileModal';
import Login from './components/Login';
import AdminSettings from './components/AdminSettings';
import DashboardStats from './components/DashboardStats';
import CustomerManagement from './components/CustomerManagement';
import Planning from './components/Planning';
import { CheckCircle, XCircle, Info, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { pb } from './lib/pocketbase';

const STORAGE_KEYS = {
  DARK_MODE: 'projectdroid_dark_mode',
};

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [prices, setPrices] = useState<Prices>(DEFAULT_PRICES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'customers' | 'planning' | 'stats'>('stats');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<ActivityDeepLink | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const fetchFullState = useCallback(async () => {
    try {
      console.log('PB: Start ophalen gegevens...');
      const results = await Promise.allSettled([
        pb.collection('projects').getFullList(),
        pb.collection('customers').getFullList(),
        pb.collection('activities').getFullList({ sort: '-timestamp', limit: 100 }),
        pb.collection('users').getFullList(),
        pb.collection('settings').getFullList()
      ]);

      const [pRes, cRes, aRes, uRes, sRes] = results;

      if (pRes.status === 'fulfilled') {
        setProjects(pRes.value.map(p => ({
          ...p,
          id: p.id,
          customerId: p.customer,
          phases: p.phases_json || [],
          tasks: p.tasks_json || [],
          invoices: p.invoices_json || [],
          expenses: p.expenses_json || [],
          requirements: p.requirements_json || [],
          attachments: p.attachments_json || [],
          requirementNotes: p.requirementNotes_json || {},
          lockedPrices: p.lockedPrices_json || null,
          customRecurring: p.customRecurring_json || [],
          ignoredRecurring: p.ignoredRecurring_json || [],
          overriddenRecurring: p.overriddenRecurring_json || {},
          customOneTime: p.customOneTime_json || [],
          ignoredOneTime_json: p.ignoredOneTime_json || [],
          overriddenOneTime_json: p.overriddenOneTime_json || {},
          timeEntries: p.timeEntries_json || [],
          isTimerRunning: p.isTimerRunning || false,
          timerStartedAt: p.timerStartedAt || undefined,
          activeTimerTaskId: p.activeTimerTaskId || undefined,
          isTimerBillable: p.isTimerBillable ?? true,
        })) as unknown as Project[]);
      }

      if (cRes.status === 'fulfilled') {
        setCustomers(cRes.value.map(c => ({
          ...c,
          id: c.id,
          logo: c.logo ? pb.files.getURL(c, c.logo) : ''
        })) as unknown as Customer[]);
      }

      if (aRes.status === 'fulfilled') {
        setActivities(aRes.value.map(a => ({
          ...a,
          id: a.id,
          userId: a.user,
        })) as unknown as Activity[]);
      }

      if (uRes.status === 'fulfilled') {
        setUsers(uRes.value.map(u => ({
          ...u,
          id: u.id,
          avatar: u.avatar ? pb.files.getURL(u, u.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`
        })) as unknown as User[]);
      }

      if (sRes.status === 'fulfilled') {
        const globalPrices = sRes.value.find(s => s.key === 'global_prices');
        if (globalPrices) setPrices({ ...DEFAULT_PRICES, ...globalPrices.data });
      }
    } catch (err) { console.error('Unexpected error in fetchFullState:', err); }
  }, []);

  useEffect(() => {
    const storedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (storedDarkMode !== null) setIsDarkMode(JSON.parse(storedDarkMode));
    else setIsDarkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_LOGIN === 'true') {
      const adminMockUser: User = {
        id: 'mock-admin',
        name: 'Mock Admin',
        email: 'admin@test.com',
        role: 'admin',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mock-admin',
        title: 'Mock Administrator'
      };
      setCurrentUser(adminMockUser);
      fetchFullState();
    } else if (pb.authStore.isValid && pb.authStore.model) {
      const u = pb.authStore.model;
      setCurrentUser({
        id: u.id, name: u.name || u.username, email: u.email, role: u.role || 'user',
        avatar: u.avatar ? pb.files.getURL(u, u.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
        title: u.title || ''
      });
      fetchFullState();
    }
  }, [fetchFullState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const triggerConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  }, []);

  const logActivity = useCallback(async (type: Activity['type'], title: string, options: Partial<Activity> = {}) => {
    if (!currentUser) return;
    try {
      await pb.collection('activities').create({
        type, title, user: currentUser.id, timestamp: new Date().toISOString(),
        project: options.projectId || null, projectName: options.projectName || '', details: options.details || '',
      });
      fetchFullState();
    } catch (err) { console.error('Fout bij loggen activiteit', err); }
  }, [currentUser, fetchFullState]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      if (authData.record) {
        const u = authData.record;
        setCurrentUser({
          id: u.id, name: u.name || u.username, email: u.email, role: u.role || 'user',
          avatar: u.avatar ? pb.files.getURL(u, u.avatar) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`,
          title: u.title || ''
        });
        addToast(`Welkom terug, ${u.name || u.username}!`);
        fetchFullState();
      }
    } catch (err: any) { addToast('Inloggen mislukt', 'danger'); }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
    setShowProfileModal(false);
    setProjects([]);
    setCustomers([]);
    setActivities([]);
    addToast('Je bent uitgelogd', 'info');
  };

  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      const payload = {
        name: projectData.name, description: projectData.description, status: projectData.status,
        owner: projectData.owner, customer: projectData.customerId, team: projectData.team,
        startDate: projectData.startDate, endDate: projectData.endDate, totalPrice: projectData.totalPrice, priceNote: projectData.priceNote,
        phases_json: projectData.phases, tasks_json: projectData.tasks, invoices_json: projectData.invoices, expenses_json: projectData.expenses,
        requirements_json: projectData.requirements,
      };
      await pb.collection('projects').create(payload);
      fetchFullState();
      addToast('Project aangemaakt');
    } catch (err) { console.error(err); addToast('Fout bij aanmaken project', 'danger'); }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    // Optimistische update voor directe UI respons
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));

    try {
      const payload = {
        name: updatedProject.name, description: updatedProject.description, status: updatedProject.status,
        owner: updatedProject.owner, customer: updatedProject.customerId, team: updatedProject.team,
        startDate: updatedProject.startDate, endDate: updatedProject.endDate, totalPrice: updatedProject.totalPrice, priceNote: updatedProject.priceNote,
        phases_json: updatedProject.phases, tasks_json: updatedProject.tasks, invoices_json: updatedProject.invoices, expenses_json: updatedProject.expenses,
        requirements_json: updatedProject.requirements, attachments_json: updatedProject.attachments,
        requirementNotes_json: updatedProject.requirementNotes, lockedPrices_json: updatedProject.lockedPrices,
        customRecurring_json: updatedProject.customRecurring, ignoredRecurring_json: updatedProject.ignoredRecurring,
        overriddenRecurring_json: updatedProject.overriddenRecurring, customOneTime_json: updatedProject.customOneTime,
        ignoredOneTime_json: updatedProject.ignoredOneTime, overriddenOneTime_json: updatedProject.overriddenOneTime,
        isHourlyRateActive: updatedProject.isHourlyRateActive, hourlyRate: updatedProject.hourlyRate,
        trackedSeconds: updatedProject.trackedSeconds, timeEntries_json: updatedProject.timeEntries,
        isTimerRunning: updatedProject.isTimerRunning, timerStartedAt: updatedProject.timerStartedAt,
        activeTimerTaskId: updatedProject.activeTimerTaskId, isTimerBillable: updatedProject.isTimerBillable,
      };
      await pb.collection('projects').update(updatedProject.id, payload);
      // We hoeven fetchFullState hier niet direct aan te roepen omdat we de state al optimistisch hebben bijgewerkt.
      // fetchFullState(); 
    } catch (err) { 
      console.error(err); 
      addToast('Fout bij opslaan project', 'danger');
      // Herstel state bij fout
      fetchFullState();
    }
  };

  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    triggerConfirm('Project verwijderen?', `Weet je zeker dat je project '${project?.name}' wilt verwijderen?`, async () => {
      try {
        await pb.collection('projects').delete(id);
        fetchFullState();
        addToast('Project verwijderd', 'danger');
      } catch (err) { console.error(err); }
    });
  };

  const handleCreateCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      await pb.collection('customers').create(customerData);
      fetchFullState();
      addToast('Klant toegevoegd');
    } catch (err) { console.error(err); addToast('Fout bij aanmaken klant', 'danger'); }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      await pb.collection('customers').update(updatedCustomer.id, {
        name: updatedCustomer.name, email: updatedCustomer.email, phone: updatedCustomer.phone,
        address: updatedCustomer.address, hourlyRate: updatedCustomer.hourlyRate
      });
      fetchFullState();
      addToast('Klant bijgewerkt');
    } catch (err) { console.error(err); }
  };

  const handleDeleteCustomer = (id: string) => {
    const customer = customers.find(c => c.id === id);
    triggerConfirm('Klant verwijderen?', `Weet je zeker dat je klant '${customer?.name}' wilt verwijderen?`, async () => {
      try {
        await pb.collection('customers').delete(id);
        fetchFullState();
        addToast('Klant verwijderd', 'danger');
      } catch (err) { console.error(err); }
    });
  };

  if (!currentUser) return <Login onLogin={handleLogin} error="" />;
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-dark transition-colors duration-300">
      <Navbar 
        onLogoClick={() => { setSelectedProjectId(null); setActiveView('stats'); }}
        isDarkMode={isDarkMode} onToggleMode={() => setIsDarkMode(!isDarkMode)}
        projectName={selectedProject?.name} user={currentUser}
        onProfileClick={() => setShowProfileModal(true)}
        onCreateProjectClick={() => { setSelectedProjectId(null); setActiveView('dashboard'); }}
        activeView={activeView} onSwitchView={view => { setSelectedProjectId(null); setActiveView(view); }}
      />
      <main className="max-w-[2400px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 md:pb-12">
        {selectedProjectId && selectedProject ? (
          <ProjectDetails
            project={selectedProject} allProjects={projects} customers={customers} users={users} prices={prices}
            onUpdate={handleUpdateProject} onBack={() => setSelectedProjectId(null)}
            addToast={addToast} triggerConfirm={triggerConfirm} logActivity={logActivity}
            deepLink={deepLink} onClearDeepLink={() => setDeepLink(null)}
          />
        ) : activeView === 'stats' ? (
          <DashboardStats
            projects={projects} customers={customers} prices={prices}
            activities={activities} users={users}
            onSelectProject={id => { setSelectedProjectId(id); setActiveView('dashboard'); }}
          />
        ) : activeView === 'dashboard' ? (
          <Dashboard 
            projects={projects} customers={customers} activities={activities} users={users} prices={prices}
            onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject}
            onSelectProject={(id, dl) => { setSelectedProjectId(id); if (dl) setDeepLink(dl); }}
          />
        ) : activeView === 'planning' ? (
          <Planning
            projects={projects} customers={customers} users={users}
            onUpdateProject={handleUpdateProject} onSelectProject={(id) => { setSelectedProjectId(id); }}
            addToast={addToast}
          />
        ) : (
          <CustomerManagement 
            customers={customers} projects={projects}
            onCreateCustomer={handleCreateCustomer} onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer} onSelectProject={id => { setSelectedProjectId(id); setActiveView('dashboard'); }}
            triggerConfirm={triggerConfirm}
          />
        )}
      </main>
      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[9999] space-y-3">
        {toasts.map(toast => (
          <div key={toast.id} className={`relative overflow-hidden flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl border-l-4 animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-white dark:bg-dark-card border-success text-success-hover' : toast.type === 'danger' ? 'bg-white dark:bg-dark-card border-danger text-danger' : 'bg-white dark:bg-dark-card border-info text-info'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : toast.type === 'danger' ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="text-sm font-black tracking-tight z-10">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-4 opacity-40 hover:opacity-100 transition-opacity z-10"><X className="w-4 h-4" /></button>
            <div className={`absolute bottom-0 left-0 h-1 w-full animate-[shrink_3s_linear_forwards] opacity-20 ${toast.type === 'success' ? 'bg-success' : toast.type === 'danger' ? 'bg-danger' : 'bg-info'}`} />
          </div>
        ))}
      </div>
      {confirmDialog && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 bg-dark/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white dark:bg-dark-card border border-white/10 rounded-[40px] p-10 max-w-md w-full shadow-3xl animate-in zoom-in-95">
            <div className="flex items-center space-x-4 text-danger mb-6">
              <div className="p-3 bg-danger/10 rounded-2xl"><AlertTriangle className="w-8 h-8" /></div>
              <h3 className="text-2xl font-black tracking-tight">{confirmDialog.title}</h3>
            </div>
            <p className="text-text-muted dark:text-light/70 font-medium mb-10 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex space-x-4">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 dark:border-white/10 font-black text-xs uppercase tracking-widest text-text-muted dark:text-white">Annuleren</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="flex-1 py-4 rounded-2xl bg-danger text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-danger/20">Bevestigen</button>
            </div>
          </div>
        </div>
      )}
      {showProfileModal && (
        <ProfileModal 
          user={currentUser}
          onSave={updatedUser => { setCurrentUser(updatedUser); setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u)); setShowProfileModal(false); addToast('Profiel bijgewerkt'); }}
          onClose={() => setShowProfileModal(false)} onLogout={handleLogout}
          onOpenAdmin={currentUser.role === 'admin' ? () => { setShowProfileModal(false); setShowAdminSettings(true); } : undefined}
        />
      )}
      {showAdminSettings && (
        <AdminSettings 
          users={users} projects={projects} prices={prices}
          onUpdatePrices={async (newPrices) => {
            setPrices(newPrices);
            try {
              let existingPrices;
              try { existingPrices = await pb.collection('settings').getFirstListItem(`key="global_prices"`); } catch (e) { }
              if (existingPrices) await pb.collection('settings').update(existingPrices.id, { key: 'global_prices', data: newPrices });
              else await pb.collection('settings').create({ key: 'global_prices', data: newPrices });
              addToast('Prijzen opgeslagen', 'success');
            } catch (err) { console.error('Fout bij opslaan prijzen', err); }
          }}
          onClose={() => setShowAdminSettings(false)}
          onAddUser={async (u) => {
            try {
              const pass = u.password || 'Welkom123!';
              const username = u.email ? u.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random()*100) : `user${Math.floor(Math.random()*1000)}`;
              await pb.collection('users').create({ username, email: u.email || '', emailVisibility: true, password: pass, passwordConfirm: pass, name: u.name, role: u.role, title: u.title });
              fetchFullState(); addToast('Gebruiker toegevoegd');
            } catch (err) { console.error(err); addToast('Fout bij toevoegen gebruiker', 'danger'); }
          }}
          onUpdateUser={async (u) => {
            try {
              const updateData: any = { name: u.name, role: u.role, title: u.title, email: u.email };
              if (u.password) { updateData.password = u.password; updateData.passwordConfirm = u.password; }
              await pb.collection('users').update(u.id, updateData);
              fetchFullState(); addToast('Gebruiker bijgewerkt');
            } catch (err) { console.error(err); addToast('Fout bij opslaan gebruiker', 'danger'); }
          }}
          onDeleteUser={id => {
            triggerConfirm('Gebruiker verwijderen?', `Weet je zeker dat je deze gebruiker wilt verwijderen?`, async () => {
              try { await pb.collection('users').delete(id); fetchFullState(); addToast('Gebruiker verwijderd', 'danger'); } catch (err) { console.error(err); }
            });
          }}
          onUpdateProject={handleUpdateProject}
          onBackup={() => {
            const data = { projects, customers, activities, users, prices };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `projectdroid-backup-${format(new Date(), 'yyyy-MM-dd')}.json`; a.click();
            addToast('Backup gedownload');
          }}
          onRestore={async (data) => {
            addToast('Start database import...', 'info');
            try {
              if (data.customers) { for (const c of data.customers) { try { await pb.collection('customers').create(c); } catch (e) {} } }
              if (data.projects) {
                for (const p of data.projects) {
                  try {
                    const payload = {
                      name: p.name, description: p.description, status: p.status, owner: p.owner, customer: p.customerId,
                      team: p.team, startDate: p.startDate, endDate: p.endDate, totalPrice: p.totalPrice, priceNote: p.priceNote,
                      phases_json: p.phases, tasks_json: p.tasks, invoices_json: p.invoices, expenses_json: p.expenses,
                      requirements_json: p.requirements, attachments_json: p.attachments, requirementNotes_json: p.requirementNotes,
                      lockedPrices_json: p.lockedPrices, customRecurring_json: p.customRecurring, ignoredRecurring_json: p.ignoredRecurring,
                      overriddenRecurring_json: p.overriddenRecurring, customOneTime_json: p.customOneTime, ignoredOneTime_json: p.ignoredOneTime,
                      overriddenOneTime_json: p.overriddenOneTime, isHourlyRateActive: p.isHourlyRateActive, hourlyRate: p.hourlyRate,
                      trackedSeconds: p.trackedSeconds, timeEntries_json: p.timeEntries,
                    };
                    await pb.collection('projects').create(payload);
                  } catch (e) {}
                }
              }
              fetchFullState(); addToast('Import voltooid!');
            } catch (err) { addToast('Fout bij import', 'danger'); }
          }}
          triggerConfirm={triggerConfirm}
          getFullState={() => ({ projects, customers, activities, users })}
        />
      )}
    </div>
  );
};

export default App;
