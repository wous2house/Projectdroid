import React, { useMemo, useState } from 'react';
import { Project, Customer, Prices, ProjectStatus, Activity, User } from '../types';
import { calculatePrice, getExpectedExpenses, getBudgetBreakdown, REQ_LABELS } from './RequirementsEditor';
import { BarChart3, PieChart, TrendingUp, TrendingDown, Euro, Wallet, CheckCircle, Briefcase, Users, Layout, X, ChevronRight, Clock, Download } from 'lucide-react';
import { PROJECT_STATUS_COLORS } from '../constants';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DashboardStatsProps {
  projects: Project[];
  customers: Customer[];
  prices: Prices;
  activities?: Activity[];
  users?: User[];
  onSelectProject?: (id: string) => void;
}

interface DetailModalData {
  title: string;
  items: { project: Project; value?: number; label?: string }[];
  isCurrency?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ projects, customers, prices, activities = [], users = [], onSelectProject }) => {
  const [detailModal, setDetailModal] = useState<DetailModalData | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getCustomerName = (id: string) => {
    if (id === 'Geen klant') return 'Geen klant gekoppeld';
    return customers.find(c => c.id === id)?.name || 'Onbekende Klant';
  };

  const getCategoryName = (key: string) => REQ_LABELS[key] || key;

  const handleExportCSV = () => {
    if (projects.length === 0) return;

    const headers = [
      'Project ID',
      'Naam',
      'Klant',
      'Status',
      'Aangemaakt',
      'Prijs',
      'Periodieke Inkomsten',
      'Uurtarief',
      'Geregistreerde Uren'
    ];

    const rows = projects.map(p => {
      const { projectPrice, projectPeriodicIncome } = getProjectFinancials(p);
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${getCustomerName(p.customerId || 'Geen klant').replace(/"/g, '""')}"`,
        p.status,
        new Date(p.createdAt).toLocaleDateString('nl-NL'),
        `"${projectPrice.toString().replace(/\./g, ',')}"`,
        `"${projectPeriodicIncome.toString().replace(/\./g, ',')}"`,
        `"${(p.hourlyRate || 0).toString().replace(/\./g, ',')}"`,
        `"${((p.trackedSeconds || 0) / 3600).toFixed(2).replace(/\./g, ',')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `projecten_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter the projects to only include active/completed/approved statuses for stats
  const filteredProjects = useMemo(() => {
    return projects.filter(p => [ProjectStatus.GEAKKOORDEERD, ProjectStatus.ACTIEF, ProjectStatus.AFGEROND].includes(p.status));
  }, [projects]);

  const getProjectFinancials = (p: Project) => {
    const breakdown = getBudgetBreakdown(p.requirements || [], p.requirementNotes || {}, p.lockedPrices || prices);
    
    const activeBreakdownOneTime = breakdown.filter(b => !b.isRecurring && b.price > 0 && !(p.ignoredOneTime || []).includes(b.label));
    const calculatedOneTimePrice = activeBreakdownOneTime.reduce((acc, b) => {
        return acc + ((p.overriddenOneTime && p.overriddenOneTime[b.label] !== undefined) ? p.overriddenOneTime[b.label] : b.price);
    }, 0) + (p.customOneTime || []).reduce((acc, c) => acc + c.amount, 0);

    const activeBreakdownRecurring = breakdown.filter(b => b.isRecurring && b.price > 0 && !(p.ignoredRecurring || []).includes(b.label));
    const calculatedRecurringPrice = activeBreakdownRecurring.reduce((acc, b) => {
        return acc + ((p.overriddenRecurring && p.overriddenRecurring[b.label] !== undefined) ? p.overriddenRecurring[b.label] : b.price);
    }, 0) + (p.customRecurring || []).reduce((acc, c) => acc + c.amount, 0);

    const trackedHours = (p.trackedSeconds || 0) / 3600;
    const hourlyRevenue = p.isHourlyRateActive ? trackedHours * (p.hourlyRate || 0) : 0;
    
    const projectPrice = calculatedOneTimePrice + hourlyRevenue;
    const projectPeriodicIncome = calculatedRecurringPrice;

    return { projectPrice, projectPeriodicIncome };
  };

  const financials = useMemo(() => {
    let totalRevenue = 0;
    let billed = 0;
    let received = 0;
    let periodicIncome = 0;
    let periodicExpenses = 0;
    
    const revProjects: {project: Project; value: number}[] = [];
    const billedProjects: {project: Project; value: number}[] = [];
    const receivedProjects: {project: Project; value: number}[] = [];
    const periodicIncomeProjects: {project: Project; value: number}[] = [];
    const periodicExpenseProjects: {project: Project; value: number}[] = [];

    filteredProjects.forEach(p => {
      const { projectPrice, projectPeriodicIncome } = getProjectFinancials(p);
      
      totalRevenue += projectPrice;
      if (projectPrice > 0) revProjects.push({ project: p, value: projectPrice });
      
      // Calculate Periodic Income
      periodicIncome += projectPeriodicIncome;
      if (projectPeriodicIncome > 0) periodicIncomeProjects.push({ project: p, value: projectPeriodicIncome });

      // Invoices
      let projectBilled = 0;
      let projectReceived = 0;
      if (p.invoices) {
        p.invoices.forEach(inv => {
          let amount = inv.type === 'amount' ? inv.amount : (projectPrice * (inv.percentage / 100));
          billed += amount;
          projectBilled += amount;
          if (inv.isReceived) {
            received += amount;
            projectReceived += amount;
          }
        });
      }
      if (projectBilled > 0) billedProjects.push({ project: p, value: projectBilled });
      if (projectReceived > 0) receivedProjects.push({ project: p, value: projectReceived });

      // Expenses
      let projectPeriodicExpenses = 0;
      if (p.expenses) {
        p.expenses.forEach(exp => {
          if (exp.isRecurring) {
            periodicExpenses += exp.amount;
            projectPeriodicExpenses += exp.amount;
          }
        });
      }

      // Default Plugin Expenses
      const expectedExp = getExpectedExpenses(p.requirements || [], prices, filteredProjects);
      expectedExp.forEach(exp => {
        if (exp.isRecurring) {
          periodicExpenses += exp.amount;
          projectPeriodicExpenses += exp.amount;
        }
      });
      
      if (projectPeriodicExpenses > 0) periodicExpenseProjects.push({ project: p, value: projectPeriodicExpenses });
    });

    return { 
      totalRevenue, billed, received, periodicIncome, periodicExpenses,
      revProjects, billedProjects, receivedProjects, periodicIncomeProjects, periodicExpenseProjects
    };
  }, [filteredProjects, prices]);

  const projectsByStatus = useMemo(() => {
    const counts: Record<string, { count: number; projects: Project[] }> = {};
    // Initialize standard filtered statuses
    [ProjectStatus.GEAKKOORDEERD, ProjectStatus.ACTIEF, ProjectStatus.AFGEROND].forEach(s => counts[s] = { count: 0, projects: [] });
    filteredProjects.forEach(p => {
      if (!counts[p.status]) counts[p.status] = { count: 0, projects: [] };
      counts[p.status].count += 1;
      counts[p.status].projects.push(p);
    });
    return Object.entries(counts).filter(([_, data]) => data.count > 0);
  }, [filteredProjects]);

  const projectsByCategory = useMemo(() => {
    const counts: Record<string, { count: number; projects: Project[] }> = {};
    const categories = ['type_landing', 'type_werken_bij', 'type_corporate', 'type_add_website', 'type_edit_website', 'type_fix_website'];       
    filteredProjects.forEach(p => {
      const reqs = p.requirements || [];
      let foundCategory = false;
      categories.forEach(cat => {
        if (reqs.includes(cat)) {
          if (!counts[cat]) counts[cat] = { count: 0, projects: [] };
          counts[cat].count += 1;
          counts[cat].projects.push(p);
          foundCategory = true;
        }
      });
      if (!foundCategory && reqs.includes('bouw_website')) {
        if (!counts['bouw_website']) counts['bouw_website'] = { count: 0, projects: [] };
        counts['bouw_website'].count += 1;
        counts['bouw_website'].projects.push(p);
      }
    });
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  }, [filteredProjects]);

  const projectsByCustomer = useMemo(() => {
    const counts: Record<string, { count: number; projects: Project[] }> = {};
    filteredProjects.forEach(p => {
      const id = p.customerId || 'Geen klant';
      if (!counts[id]) counts[id] = { count: 0, projects: [] };
      counts[id].count += 1;
      counts[id].projects.push(p);
    });
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  }, [filteredProjects]);

  const revenuePerMonth = useMemo(() => {
    const data: Record<string, { total: number; sortKey: string; projects: { project: Project; value: number }[] }> = {};
    filteredProjects.forEach(p => {
      const date = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
      if (isNaN(date.getTime())) return;
      const monthYear = format(date, 'MMM yy', { locale: nl });
      const sortKey = format(date, 'yyyy-MM');
      const { projectPrice: total } = getProjectFinancials(p);

      if (!data[monthYear]) {
        data[monthYear] = { total: 0, sortKey, projects: [] };
      }
      data[monthYear].total += total;
      if (total > 0) {
        data[monthYear].projects.push({ project: p, value: total });
      }
    });
    return Object.entries(data).sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey));
  }, [filteredProjects, prices]);

  const recentProjects = useMemo(() => {
    const projectIds = new Set<string>();
    const recent: Project[] = [];
    
    const sortedActivities = [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const activity of sortedActivities) {
      if (activity.projectId && !projectIds.has(activity.projectId)) {
        const project = projects.find(p => p.id === activity.projectId);
        if (project) {
          projectIds.add(activity.projectId);
          recent.push(project);
          if (recent.length === 3) break;
        }
      }
    }
    
    if (recent.length < 3) {
      const sortedProjects = [...projects].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      for (const project of sortedProjects) {
        if (!projectIds.has(project.id)) {
          projectIds.add(project.id);
          recent.push(project);
          if (recent.length === 3) break;
        }
      }
    }
    
    return recent;
  }, [activities, projects]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-text-main dark:text-white tracking-tighter">Dashboard & Statistieken</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-sm shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div 
          onClick={() => setDetailModal({ title: 'Actieve Projecten', items: filteredProjects.map(p => ({ project: p })), isCurrency: false })}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-primary/10 text-primary rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Briefcase className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Projecten</p>
          <h3 className="text-2xl font-black text-text-main dark:text-white group-hover:text-primary transition-colors">{filteredProjects.length}</h3>
        </div>

        <div 
          onClick={() => setDetailModal({ title: 'Totaal Resultaat', items: financials.revProjects, isCurrency: true })}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-info/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-info/10 text-info rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Euro className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Totaal Resultaat</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full group-hover:text-info transition-colors">{formatCurrency(financials.totalRevenue)}</h3>       
        </div>

        <div 
          onClick={() => setDetailModal({ title: 'Gefactureerd', items: financials.billedProjects, isCurrency: true })}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-warning/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-warning/10 text-warning rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Gefactureerd</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full group-hover:text-warning transition-colors">{formatCurrency(financials.billed)}</h3>
        </div>

        <div 
          onClick={() => setDetailModal({ title: 'Ontvangen', items: financials.receivedProjects, isCurrency: true })}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-success/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-success/10 text-success rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Ontvangen</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full group-hover:text-success transition-colors">{formatCurrency(financials.received)}</h3>
        </div>

        <div 
          onClick={() => setDetailModal({ title: 'Periodieke Inkomsten', items: financials.periodicIncomeProjects, isCurrency: true })}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-success/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-success/10 text-success rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Periodieke Inkomsten</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full group-hover:text-success transition-colors">{formatCurrency(financials.periodicIncome)} <span className="text-[10px] text-text-muted">/jr</span></h3>
        </div>

        <div 
          onClick={() => setDetailModal({ title: 'Periodieke Uitgaven', items: financials.periodicExpenseProjects, isCurrency: true })}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-danger/50 transition-colors cursor-pointer"
        >
          <div className="p-3 bg-danger/10 text-danger rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Periodieke Uitgaven</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full group-hover:text-danger transition-colors">{formatCurrency(financials.periodicExpenses)} <span className="text-[10px] text-text-muted">/jr</span></h3>
        </div>
      </div>

      {recentProjects.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-2">
            <Clock className="w-5 h-5 text-text-muted" />
            <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">Recente projecten</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentProjects.map(project => {
              const customer = customers.find(c => c.id === project.customerId);
              const customerName = customer?.name || 'Geen klant';
              const teamMembers = (project.team || []).map(id => users.find(u => u.id === id)).filter(Boolean);

              return (
                <div 
                  key={project.id}
                  onClick={() => onSelectProject && onSelectProject(project.id)}
                  className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm group hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
                >
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${PROJECT_STATUS_COLORS[project.status as ProjectStatus]}`}>
                        {project.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-text-muted opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                    <h4 className="font-black text-lg text-text-main dark:text-white group-hover:text-primary transition-colors line-clamp-1">{project.name}</h4>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5 mt-auto gap-4">
                    <div className="flex items-center space-x-2 min-w-0">
                      {customer?.logo ? (
                        <img src={customer.logo} alt={customerName} className="w-5 h-5 rounded-md object-cover border border-slate-200 dark:border-white/10 bg-white flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-dark/50 flex items-center justify-center text-[9px] font-black text-text-muted uppercase flex-shrink-0">
                          {customerName.substring(0, 2)}
                        </div>
                      )}
                      <p className="text-xs font-bold text-text-muted uppercase tracking-widest opacity-70 truncate">
                        {customerName}
                      </p>
                    </div>

                    {teamMembers.length > 0 && (
                      <div className="flex -space-x-2">
                        {teamMembers.slice(0, 3).map(u => (
                          <img 
                            key={u!.id} 
                            src={u!.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u!.id}`}
                            className="w-6 h-6 rounded-full border-2 border-white dark:border-dark-card object-cover bg-white shadow-sm"
                            alt={u!.name}
                            title={u!.name}
                          />
                        ))}
                        {teamMembers.length > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-dark-card bg-slate-100 dark:bg-dark/80 text-[9px] font-black flex items-center justify-center text-text-muted">
                            +{teamMembers.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-black text-text-main dark:text-white">Resultaat per Periode</h3>
          </div>
          <div className="h-[300px] flex items-end space-x-4 pt-10">
            {revenuePerMonth.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-text-muted font-bold text-sm">Geen data beschikbaar</div>      
            ) : (
              revenuePerMonth.map(([month, data]) => {
                const maxAmount = Math.max(...revenuePerMonth.map(m => m[1].total)) || 1;
                const heightPercentage = Math.max((data.total / maxAmount) * 100, 5); // min 5% height
                return (
                  <div 
                    key={month} 
                    className="flex-1 flex flex-col items-center group cursor-pointer"
                    onClick={() => setDetailModal({ title: `Projecten in ${month}`, items: data.projects, isCurrency: true })}
                  >
                    <div className="relative w-full flex justify-center h-[200px] items-end">
                      <div className="w-full max-w-[40px] bg-primary/20 group-hover:bg-primary transition-all rounded-t-xl" style={{ height: `${heightPercentage}%` }}></div>
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-dark text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap z-10">
                        {formatCurrency(data.total)}
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-text-muted uppercase mt-4 text-center truncate w-full">{month}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <PieChart className="w-6 h-6 text-info" />
            <h3 className="text-lg font-black text-text-main dark:text-white">Projecten per Status</h3>
          </div>
          <div className="space-y-4">
            {projectsByStatus.map(([status, data]) => {
              const total = filteredProjects.length || 1;
              const percentage = Math.round((data.count / total) * 100);
              return (
                <div 
                  key={status} 
                  className="flex items-center space-x-4 cursor-pointer group p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                  onClick={() => setDetailModal({ title: `Projecten: ${status}`, items: data.projects.map(p => ({ project: p })), isCurrency: false })}
                >
                  <div className="w-32 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${PROJECT_STATUS_COLORS[status as ProjectStatus]}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex-grow bg-slate-100 dark:bg-dark-card rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-primary group-hover:bg-primary-hover rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-black text-text-main dark:text-white group-hover:text-primary transition-colors">{data.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <Layout className="w-6 h-6 text-warning" />
            <h3 className="text-lg font-black text-text-main dark:text-white">Projecten per Categorie</h3>
          </div>
          <div className="space-y-5">
            {projectsByCategory.length === 0 ? (
              <div className="text-center text-text-muted font-bold text-sm py-10">Geen categorie data</div>
            ) : (
              projectsByCategory.map(([category, data]) => (
                <div 
                  key={category} 
                  className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0 cursor-pointer group"
                  onClick={() => setDetailModal({ title: `Projecten: ${getCategoryName(category)}`, items: data.projects.map(p => ({ project: p })), isCurrency: false })}
                >
                  <span className="text-sm font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">{getCategoryName(category)}</span>
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all px-3 py-1 rounded-xl text-xs font-black">{data.count}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-[40px] p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-8">
            <Users className="w-6 h-6 text-success" />
            <h3 className="text-lg font-black text-text-main dark:text-white">Top 5 Klanten (Aantal Projecten)</h3>
          </div>
          <div className="space-y-5">
            {projectsByCustomer.length === 0 ? (
              <div className="text-center text-text-muted font-bold text-sm py-10">Geen klant data</div>
            ) : (
              projectsByCustomer.map(([customerId, data], index) => (
                <div 
                  key={customerId} 
                  className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0 cursor-pointer group"
                  onClick={() => setDetailModal({ title: `Projecten: ${getCustomerName(customerId)}`, items: data.projects.map(p => ({ project: p })), isCurrency: false })}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-[10px] font-black text-text-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">{index + 1}</div>
                    <span className="text-sm font-bold text-text-main dark:text-white truncate max-w-[200px] group-hover:text-primary transition-colors">{getCustomerName(customerId)}</span>
                  </div>
                  <div className="bg-success/10 text-success group-hover:bg-success group-hover:text-white px-3 py-1 rounded-xl text-xs font-black transition-all">{data.count}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {detailModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-dark/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white dark:bg-dark-card border border-white/10 rounded-[40px] p-10 max-w-2xl w-full shadow-3xl animate-in zoom-in-95 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black tracking-tight text-text-main dark:text-white">{detailModal.title}</h3>
              <button onClick={() => setDetailModal(null)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-danger transition-colors text-text-muted">
                <X className="w-6 h-6 dark:text-white" />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-2 space-y-3 scrollbar-hide">
              {detailModal.items.length === 0 ? (
                <p className="text-center text-text-muted font-bold py-10">Geen projecten gevonden.</p>
              ) : (
                detailModal.items.map((item, idx) => (
                  <div 
                    key={`${item.project.id}-${idx}`}
                    onClick={() => {
                      if (onSelectProject) {
                        onSelectProject(item.project.id);
                        setDetailModal(null);
                      }
                    }}
                    className={`flex items-center justify-between p-5 rounded-[24px] border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-dark/50 group transition-all ${onSelectProject ? 'cursor-pointer hover:border-primary/40 hover:bg-primary/5 hover:shadow-md' : ''}`}
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="min-w-0">
                        <h4 className="font-black text-base text-text-main dark:text-white group-hover:text-primary transition-colors truncate">{item.project.name}</h4>
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">
                          {getCustomerName(item.project.customerId || 'Geen klant')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 flex-shrink-0">
                      {item.value !== undefined && (
                        <span className="font-black text-sm text-text-main dark:text-white bg-white dark:bg-dark-card px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                          {detailModal.isCurrency ? formatCurrency(item.value) : item.value}
                        </span>
                      )}
                      {onSelectProject && (
                        <ChevronRight className="w-5 h-5 text-text-muted opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;