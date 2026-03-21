
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

// Sleutels voor localStorage
const STORAGE_KEYS = {
  PROJECTS: 'projectdroid_projects',
  CUSTOMERS: 'projectdroid_customers',
  ACTIVITIES: 'projectdroid_activities',
  USERS: 'projectdroid_users',
  CURRENT_USER: 'projectdroid_current_user',
  DARK_MODE: 'projectdroid_dark_mode',
  PRICES: 'projectdroid_prices'
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

  // Initial load from localStorage
  useEffect(() => {
    const storedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const storedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const storedActivities = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    const storedCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    const storedDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    const storedPrices = localStorage.getItem(STORAGE_KEYS.PRICES);

    if (storedDarkMode !== null) {
      setIsDarkMode(JSON.parse(storedDarkMode));
    } else {
      setIsDarkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    if (storedProjects) setProjects(JSON.parse(storedProjects));
    if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
    if (storedActivities) setActivities(JSON.parse(storedActivities));
    if (storedPrices) {
      const parsed = JSON.parse(storedPrices);
      setPrices({ ...DEFAULT_PRICES, ...parsed });
    }
    
    let loadedUsers = MOCK_USERS;
    if (storedUsers) {
      loadedUsers = JSON.parse(storedUsers);
      setUsers(loadedUsers);
    }

    const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
    if (isElectron) {
      // Find wouter@webdroids.nl in loadedUsers or MOCK_USERS, or fallback to any admin, or first user
      let adminUser = loadedUsers.find(u => u.email === 'wouter@webdroids.nl');
      
      if (!adminUser) {
        // If not in loadedUsers, try MOCK_USERS
        adminUser = MOCK_USERS.find(u => u.email === 'wouter@webdroids.nl');
        // If we found it in MOCK_USERS but it wasn't in loadedUsers, add it to users
        if (adminUser) {
          setUsers(prev => {
            const newUsers = [...prev, adminUser!];
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
            return newUsers;
          });
        }
      }
      
      if (!adminUser) {
        adminUser = loadedUsers.find(u => u.role === 'admin') || loadedUsers[0];
      }
      
      if (adminUser) {
        setCurrentUser(adminUser);
      }
    } else {
      // If online version, fetch data from server API if we have a stored user
      if (storedCurrentUser) {
        const parsedUser = JSON.parse(storedCurrentUser);
        if (parsedUser.email && parsedUser.password) {
          fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: parsedUser.email, password: parsedUser.password })
          })
            .then(res => {
              if (res.ok) return res.json();
              throw new Error('Invalid credentials');
            })
            .then(({ user, data }) => {
              if (data.projects) setProjects(data.projects);
              if (data.customers) setCustomers(data.customers);
              if (data.activities) setActivities(data.activities);
              if (data.users) setUsers(data.users);
              setCurrentUser(user);
            })
            .catch(err => {
              console.error('Error fetching initial data:', err);
              setCurrentUser(null);
              localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            });
        }
      }
    }
    
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDarkMode));
    localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(prices));
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [projects, customers, activities, users, currentUser, isDarkMode, prices]);

  // Handle dark mode class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const triggerConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  }, []);

  const logActivity = useCallback(async (type: Activity['type'], title: string, options: Partial<Activity> = {}) => {
    if (!currentUser) return;

    // Create optimistic local activity
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      title,
      userId: currentUser.id,
      timestamp: new Date().toISOString(),
      ...options
    };

    setActivities(prev => [newActivity, ...prev].slice(0, 100));

    try {
      // Save to PB
      await pb.collection('activities').create({
        type: newActivity.type,
        title: newActivity.title,
        user: newActivity.userId, // PB relational field
        timestamp: newActivity.timestamp,
        project: newActivity.projectId || null,
        task: newActivity.taskId || '',
        phase: newActivity.phaseId || '',
        projectName: newActivity.projectName || '',
        details: newActivity.details || '',
      });
    } catch (err) {
      console.error('Fout bij loggen activiteit', err);
    }
  }, [currentUser]);

  const [loginError, setLoginError] = useState('');

  const handleLogin = async (email: string, password: string) => {
    const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
    
    // Tijdelijke omzeiling voor desktop app (electron/lokaal)
    if (email.toLowerCase() === 'admin' && password === 'Admin123') {
        const tempAdmin = {
            id: 'u-temp-admin',
            name: 'Tijdelijke Admin',
            role: 'admin' as const,
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
            email: 'admin'
        };
        setCurrentUser(tempAdmin);
        setLoginError('');
        addToast('Welkom terug, Tijdelijke Admin!');
        return;
    }

    if (isElectron) {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
        setCurrentUser(user);
        setLoginError('');
        addToast(`Welkom terug, ${user.name}!`);
      } else {
        setLoginError('Onjuist e-mailadres of wachtwoord.');
      }
    } else {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
          const { user, data } = await response.json();
          if (data.projects) setProjects(data.projects);
          if (data.customers) setCustomers(data.customers);
          if (data.activities) setActivities(data.activities);
          if (data.users) setUsers(data.users);
          
          setCurrentUser(user);
          setLoginError('');
          addToast(`Welkom terug, ${user.name}!`);
        } else {
          setLoginError('Onjuist e-mailadres of wachtwoord.');
        }
      } catch (err) {
        setLoginError('Kan geen verbinding maken met de server.');
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowProfileModal(false);
    addToast('Je bent uitgelogd', 'info');
  };

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [newProject, ...prev]);
    logActivity('project_created', `Project aangemaakt: ${newProject.name}`, { projectId: newProject.id, projectName: newProject.name });
    addToast('Project aangemaakt');
  const handleCreateProject = async (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      // Map to PB schema
      const pbProject = {
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        owner: projectData.owner,
        customer: projectData.customerId,
        team: projectData.team,
        totalPrice: projectData.totalPrice,
        priceNote: projectData.priceNote,
        phases_json: projectData.phases,
        tasks_json: projectData.tasks,
        invoices_json: projectData.invoices,
        requirements_json: projectData.requirements,
      };

      const record = await pb.collection('projects').create(pbProject);
      const newProject: Project = { ...projectData, id: record.id, createdAt: record.created };

      setProjects(prev => [newProject, ...prev]);
      logActivity('project_created', `Project aangemaakt: ${newProject.name}`, { projectId: newProject.id, projectName: newProject.name });
      addToast('Project aangemaakt');
    } catch (err) {
      console.error(err);
      addToast('Fout bij aanmaken project', 'danger');
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      // Optimistic update
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));

      const pbProject = {
        name: updatedProject.name,
        description: updatedProject.description,
        status: updatedProject.status,
        owner: updatedProject.owner,
        customer: updatedProject.customerId,
        team: updatedProject.team,
        totalPrice: updatedProject.totalPrice,
        priceNote: updatedProject.priceNote,
        phases_json: updatedProject.phases,
        tasks_json: updatedProject.tasks,
        invoices_json: updatedProject.invoices,
        requirements_json: updatedProject.requirements,
        attachments_json: updatedProject.attachments,
        requirementNotes_json: updatedProject.requirementNotes,
        lockedPrices_json: updatedProject.lockedPrices,
        customRecurring_json: updatedProject.customRecurring,
        ignoredRecurring_json: updatedProject.ignoredRecurring,
        overriddenRecurring_json: updatedProject.overriddenRecurring,
        customOneTime_json: updatedProject.customOneTime,
        ignoredOneTime_json: updatedProject.ignoredOneTime,
        overriddenOneTime_json: updatedProject.overriddenOneTime,
        isHourlyRateActive: updatedProject.isHourlyRateActive,
        hourlyRate: updatedProject.hourlyRate,
        trackedSeconds: updatedProject.trackedSeconds,
        isTimerRunning: updatedProject.isTimerRunning,
        timerStartedAt: updatedProject.timerStartedAt,
        activeTimerTaskId: updatedProject.activeTimerTaskId,
        timeEntries_json: updatedProject.timeEntries,
      };

      await pb.collection('projects').update(updatedProject.id, pbProject);
    } catch (err) {
      console.error(err);
      addToast('Fout bij opslaan project', 'danger');
      // Ideally re-fetch or revert optimistic update locally here.
      // Re-fetching full state omitted to avoid cyclic dependency for now.
    }
  };

  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    triggerConfirm('Project verwijderen?', `Weet je zeker dat je project '${project?.name}' wilt verwijderen?`, async () => {
      try {
        await pb.collection('projects').delete(id);
        setProjects(prev => prev.filter(p => p.id !== id));
        logActivity('project_deleted', `Project verwijderd: ${project?.name}`);
        addToast('Project verwijderd', 'danger');
      } catch (err) {
        console.error(err);
        addToast('Fout bij verwijderen project', 'danger');
      }
    });
  };

  const handleCreateCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setCustomers(prev => [newCustomer, ...prev]);
    logActivity('customer_created', `Klant toegevoegd: ${newCustomer.name}`);
    addToast('Klant toegevoegd');
  const handleCreateCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      const record = await pb.collection('customers').create(customerData);
      const newCustomer: Customer = { ...customerData, id: record.id, createdAt: record.created };

      setCustomers(prev => [newCustomer, ...prev]);
      logActivity('customer_created', `Klant toegevoegd: ${newCustomer.name}`);
      addToast('Klant toegevoegd');
    } catch (err) {
      console.error(err);
      addToast('Fout bij aanmaken klant', 'danger');
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    try {
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      await pb.collection('customers').update(updatedCustomer.id, {
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        hourlyRate: updatedCustomer.hourlyRate
      });
      addToast('Klant bijgewerkt');
    } catch (err) {
      console.error(err);
      addToast('Fout bij opslaan klant', 'danger');
      // Optimistic revert could be implemented here
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const customer = customers.find(c => c.id === id);
    triggerConfirm('Klant verwijderen?', `Weet je zeker dat je klant '${customer?.name}' wilt verwijderen?`, async () => {
      try {
        await pb.collection('customers').delete(id);
        setCustomers(prev => prev.filter(c => c.id !== id));
        addToast('Klant verwijderd', 'danger');
      } catch (err) {
        console.error(err);
        addToast('Fout bij verwijderen klant', 'danger');
      }
    });
  };

  if (!currentUser) {
    // Check if running in Electron
    const isElectron = navigator.userAgent.toLowerCase().indexOf(' electron/') > -1;
    if (isElectron && users.length > 0) {
      // Auto-login as the first admin user
      const adminUser = users.find(u => u.email === 'wouter@webdroids.nl') || users.find(u => u.role === 'admin') || users[0];
      setCurrentUser(adminUser);
      return null; // Render nothing while state updates
    }
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen bg-[#F8FAFF] dark:bg-dark transition-colors duration-300">
      <Navbar 
        onLogoClick={() => { setSelectedProjectId(null); setActiveView('stats'); }}
        isDarkMode={isDarkMode}
        onToggleMode={() => setIsDarkMode(!isDarkMode)}
        projectName={selectedProject?.name}
        user={currentUser}
        onProfileClick={() => setShowProfileModal(true)}
        onCreateProjectClick={() => { setSelectedProjectId(null); setActiveView('dashboard'); }}
        activeView={activeView}
        onSwitchView={view => { setSelectedProjectId(null); setActiveView(view); }}
      />

      <main className="max-w-[2400px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32 md:pb-12">
        {selectedProjectId && selectedProject ? (
          <ProjectDetails
            project={selectedProject}
            allProjects={projects}
            customers={customers}
            users={users}
            prices={prices}
            onUpdate={handleUpdateProject}
            onBack={() => setSelectedProjectId(null)}
            addToast={addToast}
            triggerConfirm={triggerConfirm}
            logActivity={logActivity}
            deepLink={deepLink}
            onClearDeepLink={() => setDeepLink(null)}
          />
        ) : activeView === 'stats' ? (
          <DashboardStats
            projects={projects}
            customers={customers}
            prices={prices}
            activities={activities}
            users={users}
            onSelectProject={id => { setSelectedProjectId(id); setActiveView('dashboard'); }}
          />
        ) : activeView === 'dashboard' ? (
          <Dashboard 
            projects={projects}
            customers={customers}
            activities={activities}
            users={users}
            prices={prices}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onSelectProject={(id, dl) => { setSelectedProjectId(id); if (dl) setDeepLink(dl); }}
          />
        ) : activeView === 'planning' ? (
          <Planning
            projects={projects}
            customers={customers}
            users={users}
            onUpdateProject={handleUpdateProject}
            onSelectProject={(id) => { setSelectedProjectId(id); }}
            addToast={addToast}
          />
        ) : (
          <CustomerManagement 
            customers={customers}
            projects={projects}
            onCreateCustomer={handleCreateCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onSelectProject={id => { setSelectedProjectId(id); setActiveView('dashboard'); }}
            triggerConfirm={triggerConfirm}
          />
        )}
      </main>

      {/* Toast notifications */}
      <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[9999] space-y-3">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`relative overflow-hidden flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl border-l-4 animate-in slide-in-from-right-10 duration-300 ${
              toast.type === 'success' ? 'bg-white dark:bg-dark-card border-success text-success-hover' :
              toast.type === 'danger' ? 'bg-white dark:bg-dark-card border-danger text-danger' :
              'bg-white dark:bg-dark-card border-info text-info'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : toast.type === 'danger' ? <XCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="text-sm font-black tracking-tight z-10">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-4 opacity-40 hover:opacity-100 transition-opacity z-10"><X className="w-4 h-4" /></button>
            <div
              className={`absolute bottom-0 left-0 h-1 w-full animate-[shrink_3s_linear_forwards] opacity-20 ${
                toast.type === 'success' ? 'bg-success' :
                toast.type === 'danger' ? 'bg-danger' :
                'bg-info'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
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
              <button 
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className="flex-1 py-4 rounded-2xl bg-danger text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-danger/20"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal 
          user={currentUser}
          onSave={updatedUser => { 
            setCurrentUser(updatedUser); 
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u)); 
            setShowProfileModal(false); 
            addToast('Profiel bijgewerkt'); 
          }}
          onClose={() => setShowProfileModal(false)}
          onLogout={handleLogout}
          onOpenAdmin={currentUser.role === 'admin' ? () => { setShowProfileModal(false); setShowAdminSettings(true); } : undefined}
        />
      )}

      {showAdminSettings && (
        <AdminSettings 
          users={users}
          projects={projects}
          prices={prices}
          onUpdatePrices={async (newPrices) => {
            setPrices(newPrices);
            try {
              // Try to find if global prices already exist
              let existingPrices;
              try { existingPrices = await pb.collection('settings').getFirstListItem(`key="global_prices"`); } catch (e) { }

              if (existingPrices) {
                await pb.collection('settings').update(existingPrices.id, { key: 'global_prices', data: newPrices });
              } else {
                await pb.collection('settings').create({ key: 'global_prices', data: newPrices });
              }
              addToast('Prijzen opgeslagen', 'success');
            } catch (err) { console.error('Fout bij opslaan prijzen', err); }
          }}
          onClose={() => setShowAdminSettings(false)}
          onAddUser={u => { const newUser = { ...u, id: crypto.randomUUID() }; setUsers(prev => [...prev, newUser]); addToast('Gebruiker toegevoegd'); }}
          onUpdateUser={u => { setUsers(prev => prev.map(user => user.id === u.id ? u : user)); if (currentUser?.id === u.id) setCurrentUser(u); addToast('Gebruiker bijgewerkt'); }}
          onDeleteUser={id => { setUsers(prev => prev.filter(u => u.id !== id)); addToast('Gebruiker verwijderd', 'danger'); }}
          onAddUser={async (u) => {
            try {
              const pass = u.password || 'Welkom123!';
              const pbUser = {
                username: u.email ? u.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random()*100) : `user${Math.floor(Math.random()*1000)}`,
                email: u.email || '',
                emailVisibility: true,
                password: pass,
                passwordConfirm: pass,
                name: u.name,
                role: u.role,
                title: u.title,
                avatarUrl: u.avatar // we store the avatar url text in avatarUrl as custom field or just map it
              };
              const record = await pb.collection('users').create(pbUser);
              const newUser: User = { ...u, id: record.id, password: u.password };
              setUsers(prev => [...prev, newUser]);
              addToast('Gebruiker toegevoegd');
            } catch (err) { console.error(err); addToast('Fout bij toevoegen gebruiker', 'danger'); }
          }}
          onUpdateUser={async (u) => {
            try {
              setUsers(prev => prev.map(user => user.id === u.id ? u : user));
              if (currentUser?.id === u.id) setCurrentUser(u);

              const updateData: any = {
                name: u.name,
                role: u.role,
                title: u.title,
                email: u.email,
              };
              // Enkel wachtwoord meenemen als het aangepast is (niet leeg)
              if (u.password) {
                updateData.password = u.password;
                updateData.passwordConfirm = u.password;
              }
              await pb.collection('users').update(u.id, updateData);
              addToast('Gebruiker bijgewerkt');
            } catch (err) { console.error(err); addToast('Fout bij opslaan gebruiker', 'danger'); }
          }}
          onDeleteUser={id => {
            triggerConfirm('Gebruiker verwijderen?', `Weet je zeker dat je deze gebruiker wilt verwijderen?`, async () => {
              try {
                await pb.collection('users').delete(id);
                setUsers(prev => prev.filter(u => u.id !== id));
                addToast('Gebruiker verwijderd', 'danger');
              } catch (err) { console.error(err); addToast('Fout bij verwijderen gebruiker', 'danger'); }
            });
          }}
          onUpdateProject={handleUpdateProject}
          onBackup={() => {
            const data = { projects, customers, activities, users };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `projectdroid-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
            a.click();
            addToast('Backup gedownload');
          }}
          onRestore={data => {
            if (data.projects) setProjects(data.projects);
            if (data.customers) setCustomers(data.customers);
            if (data.activities) setActivities(data.activities);
            if (data.users) setUsers(data.users);
            addToast('Database hersteld');
          }}
          triggerConfirm={triggerConfirm}
          getFullState={() => ({ projects, customers, activities, users })}
        />
      )}
    </div>
  );
};

export default App;
