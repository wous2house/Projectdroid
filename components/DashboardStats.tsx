import React, { useMemo } from 'react';
import { Project, Customer, Prices, ProjectStatus } from '../types';
import { calculatePrice, getExpectedExpenses, REQ_LABELS } from './RequirementsEditor';
import { BarChart3, PieChart, TrendingUp, TrendingDown, DollarSign, Wallet, CheckCircle, Briefcase, Users, Layout } from 'lucide-react';
import { PROJECT_STATUS_COLORS } from '../constants';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DashboardStatsProps {
  projects: Project[];
  customers: Customer[];
  prices: Prices;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ projects, customers, prices }) => {
  const financials = useMemo(() => {
    let totalRevenue = 0;
    let billed = 0;
    let received = 0;
    let periodicIncome = 0;
    let periodicExpenses = 0;

    projects.forEach(p => {
      const { oneTime, recurring } = calculatePrice(p.requirements || [], p.requirementNotes || {}, prices);
      const projectPrice = p.totalPrice !== undefined ? p.totalPrice : oneTime;
      totalRevenue += projectPrice;
      
      // Calculate Periodic Income
      let projectPeriodicIncome = recurring;
      if (p.customRecurring) {
        p.customRecurring.forEach(cr => { projectPeriodicIncome += cr.amount; });
      }
      periodicIncome += projectPeriodicIncome;

      // Invoices
      if (p.invoices) {
        p.invoices.forEach(inv => {
          let amount = inv.type === 'amount' ? inv.amount : (projectPrice * (inv.percentage / 100));
          billed += amount;
          if (inv.isReceived) {
            received += amount;
          }
        });
      }

      // Expenses
      if (p.expenses) {
        p.expenses.forEach(exp => {
          if (exp.isRecurring) periodicExpenses += exp.amount;
        });
      }

      // Default Plugin Expenses
      const expectedExp = getExpectedExpenses(p.requirements || [], prices, projects);
      expectedExp.forEach(exp => {
        if (exp.isRecurring) periodicExpenses += exp.amount;
      });
    });

    return { totalRevenue, billed, received, periodicIncome, periodicExpenses };
  }, [projects, prices]);

  const projectsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ProjectStatus).forEach(s => counts[s] = 0);
    projects.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const projectsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    const categories = ['type_landing', 'type_werken_bij', 'type_corporate', 'type_add_website', 'type_edit_website', 'type_fix_website'];
    projects.forEach(p => {
      const reqs = p.requirements || [];
      let foundCategory = false;
      categories.forEach(cat => {
        if (reqs.includes(cat)) {
          counts[cat] = (counts[cat] || 0) + 1;
          foundCategory = true;
        }
      });
      if (!foundCategory && reqs.includes('bouw_website')) {
        counts['bouw_website'] = (counts['bouw_website'] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [projects]);

  const projectsByCustomer = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      if (p.customerId) {
        counts[p.customerId] = (counts[p.customerId] || 0) + 1;
      } else {
        counts['Geen klant'] = (counts['Geen klant'] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [projects]);

  const revenuePerMonth = useMemo(() => {
    const data: Record<string, number> = {};
    projects.forEach(p => {
      const date = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
      if (isNaN(date.getTime())) return;
      const monthYear = format(date, 'MMM yy', { locale: nl });
      const { oneTime } = calculatePrice(p.requirements || [], p.requirementNotes || {}, prices);
      const total = p.totalPrice !== undefined ? p.totalPrice : oneTime;
      
      data[monthYear] = (data[monthYear] || 0) + total;
    });
    return Object.entries(data);
  }, [projects, prices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getCustomerName = (id: string) => {
    if (id === 'Geen klant') return 'Geen klant gekoppeld';
    return customers.find(c => c.id === id)?.name || 'Onbekende Klant';
  };

  const getCategoryName = (key: string) => REQ_LABELS[key] || key;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-text-main dark:text-white tracking-tighter">Dashboard & Statistieken</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-colors">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Briefcase className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Projecten</p>
          <h3 className="text-2xl font-black text-text-main dark:text-white">{projects.length}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-info/50 transition-colors">
          <div className="p-3 bg-info/10 text-info rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Totaal Resultaat</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full">{formatCurrency(financials.totalRevenue)}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-warning/50 transition-colors">
          <div className="p-3 bg-warning/10 text-warning rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Wallet className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Gefactureerd</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full">{formatCurrency(financials.billed)}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-success/50 transition-colors">
          <div className="p-3 bg-success/10 text-success rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Ontvangen</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full">{formatCurrency(financials.received)}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-success/50 transition-colors">
          <div className="p-3 bg-success/10 text-success rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Periodieke Inkomsten</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full">{formatCurrency(financials.periodicIncome)} <span className="text-[10px] text-text-muted">/jr</span></h3>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 p-6 rounded-[32px] shadow-sm flex flex-col items-center justify-center text-center group hover:border-danger/50 transition-colors">
          <div className="p-3 bg-danger/10 text-danger rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Periodieke Uitgaven</p>
          <h3 className="text-xl font-black text-text-main dark:text-white truncate w-full">{formatCurrency(financials.periodicExpenses)} <span className="text-[10px] text-text-muted">/jr</span></h3>
        </div>
      </div>

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
              revenuePerMonth.map(([month, amount]) => {
                const maxAmount = Math.max(...revenuePerMonth.map(m => m[1])) || 1;
                const heightPercentage = Math.max((amount / maxAmount) * 100, 5); // min 5% height
                return (
                  <div key={month} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full flex justify-center h-[200px] items-end">
                      <div className="w-full max-w-[40px] bg-primary/20 group-hover:bg-primary transition-all rounded-t-xl" style={{ height: `${heightPercentage}%` }}></div>
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-dark text-white text-[10px] font-bold px-2 py-1 rounded-lg pointer-events-none whitespace-nowrap">
                        {formatCurrency(amount)}
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
            {Object.entries(projectsByStatus).map(([status, count]) => {
              const total = projects.length || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status} className="flex items-center space-x-4">
                  <div className="w-32 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${PROJECT_STATUS_COLORS[status as ProjectStatus]}`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex-grow bg-slate-100 dark:bg-dark-card rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-black text-text-main dark:text-white">{count}</span>
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
              projectsByCategory.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                  <span className="text-sm font-bold text-text-main dark:text-white">{getCategoryName(category)}</span>
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-xl text-xs font-black">{count}</div>
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
              projectsByCustomer.map(([customerId, count], index) => (
                <div key={customerId} className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-[10px] font-black text-text-muted">{index + 1}</div>
                    <span className="text-sm font-bold text-text-main dark:text-white truncate max-w-[200px]">{getCustomerName(customerId)}</span>
                  </div>
                  <div className="bg-success/10 text-success px-3 py-1 rounded-xl text-xs font-black">{count}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
