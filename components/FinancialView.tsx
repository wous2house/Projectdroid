import React, { useState, useMemo } from 'react';
import { Project, Invoice, Expense, Activity, Prices } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Euro, TrendingUp, TrendingDown, Calendar, Receipt, CreditCard, AlertCircle, Check, PartyPopper, Info, X, Edit3, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { getBudgetBreakdown, getExpectedExpenses } from './RequirementsEditor';

interface FinancialViewProps {
  project: Project;
  allProjects: Project[];
  prices: Prices;
  onUpdate: (project: Project) => void;
  addToast: (message: string, type?: 'success' | 'danger' | 'info') => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
  logActivity: (type: Activity['type'], title: string, options?: { projectId?: string, taskId?: string, phaseId?: string, projectName?: string, details?: string }) => void;
}

const FinancialView: React.FC<FinancialViewProps> = ({ project, allProjects, prices, onUpdate, addToast, triggerConfirm, logActivity }) => {
  const currentYear = new Date().getFullYear();
  const startYear = project.createdAt ? new Date(project.createdAt).getFullYear() : currentYear;
  const availableYears = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [isAddingOneTime, setIsAddingOneTime] = useState(false);
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [showExpectedExpenses, setShowExpectedExpenses] = useState(false);
  const [itemActionMenu, setItemActionMenu] = useState<{ type: 'invoice' | 'expense' | 'recurring' | 'expected_expense'; id: string; data: any } | null>(null);

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState(project.totalPrice?.toString() || '');
  const [editPriceNote, setEditPriceNote] = useState(project.priceNote || '');

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [editingOneTimeId, setEditingOneTimeId] = useState<string | null>(null);

  const [newInvoice, setNewInvoice] = useState({
    description: '',
    type: 'amount' as 'amount' | 'percentage',
    value: '',
    date: new Date().toISOString().split('T')[0],
    isReceived: false
  });

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false
  });

  const [newRecurring, setNewRecurring] = useState({
    description: '',
    amount: ''
  });

  const [newOneTime, setNewOneTime] = useState({
    description: '',
    amount: ''
  });

  const breakdown = useMemo(() => {
    return getBudgetBreakdown(project.requirements || [], project.requirementNotes || {}, project.lockedPrices || prices);
  }, [project.requirements, project.requirementNotes, project.lockedPrices, prices]);

  const expectedExpenses = useMemo(() => {
    return getExpectedExpenses(project.requirements || [], project.lockedPrices || prices, allProjects, prices);
  }, [project.requirements, project.lockedPrices, prices, allProjects]);

  const activeBreakdownOneTime = breakdown.filter(b => !b.isRecurring && b.price > 0 && !(project.ignoredOneTime || []).includes(b.label));

  const oneTimeItems = [
    ...activeBreakdownOneTime.map(b => ({
      id: b.label,
      description: b.label,
      amount: (project.overriddenOneTime && project.overriddenOneTime[b.label] !== undefined) ? project.overriddenOneTime[b.label] : b.price,
      isCustom: false
    })),
    ...(project.customOneTime || []).map(c => ({
      id: c.id,
      description: c.description,
      amount: c.amount,
      isCustom: true
    }))
  ];

  const calculatedOneTimePrice = useMemo(() => {
    return oneTimeItems.reduce((acc, item) => acc + item.amount, 0);
  }, [oneTimeItems]);

  const trackedHours = (project.trackedSeconds || 0) / 3600;
  const hourlyRevenue = project.isHourlyRateActive ? trackedHours * (project.hourlyRate || 0) : 0;

  const totalPrice = calculatedOneTimePrice + hourlyRevenue;
  const invoices = project.invoices || [];
  const expenses = project.expenses || [];

  const expandedExpectedExpenses = useMemo(() => {
    const items: any[] = [];
    expectedExpenses.forEach(exp => {
      if (exp.isRecurring) {
        availableYears.forEach(year => {
          items.push({
            ...exp,
            id: `${exp.id}_${year}`,
            originalId: exp.id,
            description: `${exp.description} (${year})`,
            year
          });
        });
      } else {
        items.push({
          ...exp,
          id: `${exp.id}_${startYear}`,
          originalId: exp.id,
          description: exp.description,
          year: startYear
        });
      }
    });
    return selectedYear === 'all' ? items : items.filter(i => i.year === selectedYear);
  }, [expectedExpenses, availableYears, selectedYear, startYear]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => selectedYear === 'all' || new Date(inv.date).getFullYear() === selectedYear);
  }, [invoices, selectedYear]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => selectedYear === 'all' || new Date(exp.date).getFullYear() === selectedYear);
  }, [expenses, selectedYear]);

  const financialSummary = useMemo(() => {
    const isStartYear = selectedYear === 'all' || selectedYear === startYear;
    const currentTotalPrice = isStartYear ? totalPrice : 0;

    const invoiced = filteredInvoices.reduce((acc, inv) => {
      const amount = inv.type === 'amount' ? inv.amount : (inv.percentage / 100) * totalPrice;
      return acc + amount;
    }, 0);

    const received = filteredInvoices.reduce((acc, inv) => {
      if (!inv.isReceived) return acc;
      const amount = inv.type === 'amount' ? inv.amount : (inv.percentage / 100) * totalPrice;
      return acc + amount;
    }, 0);

    const activeExpectedExpenses = expandedExpectedExpenses.filter(e => !(project.ignoredOneTime || []).includes(e.originalId || e.id));
    const expectedExpensesAmount = activeExpectedExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0) + expectedExpensesAmount;

    const receivedPercentage = currentTotalPrice > 0 ? (received / currentTotalPrice) * 100 : (received > 0 ? 100 : 0);
    const isFullyPaid = receivedPercentage >= 99.9;

    return { invoiced, received, totalExpenses, isFullyPaid, receivedPercentage, currentTotalPrice };
  }, [filteredInvoices, filteredExpenses, expandedExpectedExpenses, totalPrice, selectedYear, startYear, project.ignoredOneTime]);

  const handleAddInvoice = () => {
    if (!newInvoice.description || !newInvoice.value) return;

    const val = parseFloat(newInvoice.value);
    const invoice: Invoice = {
      id: editingInvoiceId || Math.random().toString(36).substring(2, 11),
      description: newInvoice.description,
      type: newInvoice.type,
      amount: newInvoice.type === 'amount' ? val : 0,
      percentage: newInvoice.type === 'percentage' ? val : 0,
      date: newInvoice.date,
      isReceived: newInvoice.isReceived
    };

    if (editingInvoiceId) {
      onUpdate({ ...project, invoices: invoices.map(i => i.id === editingInvoiceId ? invoice : i) });
      logActivity('budget_updated', `Factuur aangepast: ${invoice.description}`, { projectId: project.id, projectName: project.name });
    } else {
      onUpdate({ ...project, invoices: [...invoices, invoice] });
      logActivity('budget_updated', `Factuur toegevoegd: ${invoice.description} (€${invoice.amount || (invoice.percentage + '%')})`, { projectId: project.id, projectName: project.name });
    }
    
    setIsAddingInvoice(false);
    setEditingInvoiceId(null);
    setNewInvoice({ description: '', type: 'amount', value: '', date: new Date().toISOString().split('T')[0], isReceived: false });
    addToast(editingInvoiceId ? 'Factuur bijgewerkt' : 'Factuurmoment toegevoegd');
  };

  const startEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setNewInvoice({
      description: inv.description,
      type: inv.type,
      value: inv.type === 'amount' ? inv.amount.toString() : inv.percentage.toString(),
      date: inv.date,
      isReceived: inv.isReceived
    });
    setIsAddingInvoice(true);
  };

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;

    const expense: Expense = {
      id: editingExpenseId || Math.random().toString(36).substring(2, 11),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: newExpense.date,
      isRecurring: newExpense.isRecurring
    };

    if (editingExpenseId) {
      onUpdate({ ...project, expenses: expenses.map(e => e.id === editingExpenseId ? expense : e) });
      logActivity('budget_updated', `Uitgave aangepast: ${expense.description}`, { projectId: project.id, projectName: project.name });
    } else {
      onUpdate({ ...project, expenses: [...expenses, expense] });
      logActivity('budget_updated', `Uitgave toegevoegd: ${expense.description} (€${expense.amount})`, { projectId: project.id, projectName: project.name });
    }

    setIsAddingExpense(false);
    setEditingExpenseId(null);
    setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0], isRecurring: false });
    addToast(editingExpenseId ? 'Uitgave bijgewerkt' : 'Uitgave toegevoegd');
  };

  const startEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setNewExpense({
      description: exp.description,
      amount: exp.amount.toString(),
      date: exp.date,
      isRecurring: exp.isRecurring
    });
    setIsAddingExpense(true);
  };

  const handleAddRecurring = () => {
    if (!newRecurring.description || !newRecurring.amount) return;
    const val = parseFloat(newRecurring.amount);

    if (editingRecurringId) {
      const isGenerated = breakdown.some(b => b.label === editingRecurringId);
      if (isGenerated) {
         onUpdate({ 
           ...project, 
           overriddenRecurring: { ...(project.overriddenRecurring || {}), [editingRecurringId]: val } 
         });
      } else {
         const customList = project.customRecurring || [];
         onUpdate({
           ...project,
           customRecurring: customList.map(c => c.id === editingRecurringId ? { ...c, description: newRecurring.description, amount: val } : c)
         });
      }
    } else {
      const customList = project.customRecurring || [];
      onUpdate({
        ...project,
        customRecurring: [...customList, { id: Math.random().toString(36).substring(2, 11), description: newRecurring.description, amount: val }]
      });
    }
    setIsAddingRecurring(false);
    setEditingRecurringId(null);
    setNewRecurring({ description: '', amount: '' });
    addToast('Periodieke inkomsten opgeslagen');
  };

  const startEditRecurring = (rec: { id: string, description: string, amount: number, isCustom: boolean }) => {
    setEditingRecurringId(rec.id);
    setNewRecurring({
      description: rec.description,
      amount: rec.amount.toString()
    });
    setIsAddingRecurring(true);
  };

  const deleteRecurring = (id: string, isCustom: boolean) => {
    triggerConfirm('Verwijderen?', 'Weet je zeker dat je dit periodieke onderdeel wilt verwijderen?', () => {
      if (isCustom) {
         onUpdate({ ...project, customRecurring: (project.customRecurring || []).filter(c => c.id !== id) });
      } else {
         onUpdate({ ...project, ignoredRecurring: [...(project.ignoredRecurring || []), id] });
      }
      addToast('Onderdeel verwijderd', 'danger');
    });
  };

  const handleAddOneTime = () => {
    if (!newOneTime.description || !newOneTime.amount) return;
    const val = parseFloat(newOneTime.amount);

    if (editingOneTimeId) {
      const isGenerated = breakdown.some(b => b.label === editingOneTimeId && !b.isRecurring);
      if (isGenerated) {
         onUpdate({ 
           ...project, 
           overriddenOneTime: { ...(project.overriddenOneTime || {}), [editingOneTimeId]: val } 
         });
      } else {
         const customList = project.customOneTime || [];
         onUpdate({
           ...project,
           customOneTime: customList.map(c => c.id === editingOneTimeId ? { ...c, description: newOneTime.description, amount: val } : c)
         });
      }
    } else {
      const customList = project.customOneTime || [];
      onUpdate({
        ...project,
        customOneTime: [...customList, { id: Math.random().toString(36).substring(2, 11), description: newOneTime.description, amount: val }]
      });
    }
    setIsAddingOneTime(false);
    setEditingOneTimeId(null);
    setNewOneTime({ description: '', amount: '' });
    addToast('Onderdeel opgeslagen');
  };

  const startEditOneTime = (item: { id: string, description: string, amount: number, isCustom: boolean }) => {
    setEditingOneTimeId(item.id);
    setNewOneTime({
      description: item.description,
      amount: item.amount.toString()
    });
    setIsAddingOneTime(true);
  };

  const deleteOneTime = (id: string, isCustom: boolean) => {
    triggerConfirm('Verwijderen?', 'Weet je zeker dat je dit eenmalige onderdeel wilt verwijderen?', () => {
      if (isCustom) {
         onUpdate({ ...project, customOneTime: (project.customOneTime || []).filter(c => c.id !== id) });
      } else {
         onUpdate({ ...project, ignoredOneTime: [...(project.ignoredOneTime || []), id] });
      }
      addToast('Onderdeel verwijderd', 'danger');
    });
  };

  const toggleInvoiceReceived = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    const updated = invoices.map(inv => inv.id === id ? { ...inv, isReceived: !inv.isReceived } : inv);
    onUpdate({ ...project, invoices: updated });
    
    if (inv && !inv.isReceived) {
      logActivity('budget_updated', `Factuur ontvangen: ${inv.description}`, { projectId: project.id, projectName: project.name });
    }
    
    addToast('Status bijgewerkt');
  };

  const deleteInvoice = (id: string) => {
    const inv = invoices.find(i => i.id === id);
    triggerConfirm('Verwijderen?', 'Weet je zeker dat je deze factuur wilt verwijderen?', () => {
      onUpdate({ ...project, invoices: invoices.filter(inv => inv.id !== id) });
      logActivity('budget_updated', `Factuur verwijderd: ${inv?.description}`, { projectId: project.id, projectName: project.name });
      addToast('Factuur verwijderd', 'danger');
    });
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    triggerConfirm('Verwijderen?', 'Weet je zeker dat je deze uitgave wilt verwijderen?', () => {
      onUpdate({ ...project, expenses: expenses.filter(exp => exp.id !== id) });
      logActivity('budget_updated', `Uitgave verwijderd: ${exp?.description}`, { projectId: project.id, projectName: project.name });
      addToast('Uitgave verwijderd', 'danger');
    });
  };

  const handleSavePrice = () => {
    const val = parseFloat(editPriceValue);
    onUpdate({ ...project, totalPrice: isNaN(val) ? undefined : val, priceNote: editPriceNote || undefined });
    logActivity('budget_updated', `Projectprijs handmatig aangepast`, { projectId: project.id, projectName: project.name });
    setIsEditingPrice(false);
    addToast('Projectprijs bijgewerkt');
  };

  const activeBreakdownRecurring = breakdown.filter(b => b.isRecurring && b.price > 0 && !(project.ignoredRecurring || []).includes(b.label));

  const baseRecurringItems = [
    ...activeBreakdownRecurring.map(b => ({
      id: b.label,
      description: b.label,
      amount: (project.overriddenRecurring && project.overriddenRecurring[b.label] !== undefined) ? project.overriddenRecurring[b.label] : b.price,
      isCustom: false
    })),
    ...(project.customRecurring || []).map(c => ({
      id: c.id,
      description: c.description,
      amount: c.amount,
      isCustom: true
    }))
  ];

  const recurringItems = useMemo(() => {
    const items: any[] = [];
    baseRecurringItems.forEach(item => {
      availableYears.forEach(year => {
        const descriptionWithYear = `${item.description} (${year})`;
        const isInvoiced = project.invoices?.some(inv => inv.description === descriptionWithYear);
        items.push({
          ...item,
          id: `${item.id}_${year}`,
          originalId: item.id,
          description: descriptionWithYear,
          year,
          isInvoiced
        });
      });
    });
    return selectedYear === 'all' ? items : items.filter(i => i.year === selectedYear);
  }, [baseRecurringItems, availableYears, selectedYear, project.invoices]);
  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-12">
      <div className="flex justify-end mb-4">
        <div className="bg-white dark:bg-dark-card border border-primary/10 rounded-xl overflow-hidden flex items-center p-1 shadow-sm">
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedYear === 'all' ? 'bg-primary text-white shadow' : 'text-text-muted hover:bg-light dark:hover:bg-dark'}`}
          >
            Alles
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedYear === year ? 'bg-primary text-white shadow' : 'text-text-muted hover:bg-light dark:hover:bg-dark'}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Health Summary */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${project.isHourlyRateActive ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 md:gap-6`}>
        <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-3xl border border-primary/5 shadow-sm relative group">
          <div className="flex items-center justify-between text-text-muted dark:text-light/50 font-black text-[10px] uppercase tracking-widest mb-4">
            <div className="flex items-center space-x-2">
              <span>Prijs project</span>
              <button 
                onClick={() => setShowBudgetBreakdown(true)}
                className="text-primary hover:text-primary-hover transition-colors"
                title="Bekijk onderbouwing"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <Euro className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-2xl md:text-3xl font-black text-text-main dark:text-white">€{calculatedOneTimePrice.toLocaleString()}</p>
            {project.priceNote && (
              <p className="text-xs font-bold text-text-muted dark:text-light/60">{project.priceNote}</p>
            )}
          </div>
        </div>

        {project.isHourlyRateActive && (
          <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-3xl border border-primary/5 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-primary font-black text-[10px] uppercase tracking-widest">
              <span>Uren Inkomsten</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl md:text-3xl font-black text-primary">€{hourlyRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
            <p className="text-xs font-bold text-text-muted dark:text-light/60">{trackedHours.toFixed(2)} uur geregistreerd</p>
          </div>
        )}

        <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-3xl border border-primary/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-primary font-black text-[10px] uppercase tracking-widest">
            <span>Gefactureerd</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-primary">€{financialSummary.invoiced.toLocaleString()}</p>
          <div className="w-full bg-light dark:bg-dark h-1.5 rounded-full overflow-hidden">
             <div className="bg-primary h-full" style={{ width: `${Math.min(100, (financialSummary.invoiced / (totalPrice || 1)) * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-3xl border border-primary/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-success font-black text-[10px] uppercase tracking-widest">
            <span>Ontvangen</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl md:text-3xl font-black text-success">€{financialSummary.received.toLocaleString()}</p>
          <div className="w-full bg-light dark:bg-dark h-1.5 rounded-full overflow-hidden">
             <div className="bg-success h-full" style={{ width: `${Math.min(100, financialSummary.receivedPercentage)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-3xl border border-primary/5 shadow-sm space-y-4">
          <div className={`flex items-center justify-between font-black text-[10px] uppercase tracking-widest ${financialSummary.received - financialSummary.totalExpenses >= 0 ? 'text-success' : 'text-danger'}`}>
            <span>Resultaat</span>
            {financialSummary.received - financialSummary.totalExpenses >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <p className={`text-2xl md:text-3xl font-black ${financialSummary.received - financialSummary.totalExpenses >= 0 ? 'text-success' : 'text-danger'}`}>€{(financialSummary.received - financialSummary.totalExpenses).toLocaleString()}</p>
        </div>
      </div>

      {/* 100% Paid Celebration */}
      {financialSummary.isFullyPaid && totalPrice > 0 && (
        <div className="bg-success/10 border-2 border-dashed border-success p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-6 animate-bounce">
          <PartyPopper className="w-10 h-10 text-success" />
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black text-success uppercase tracking-tight">Project 100% Betaald!</h3>
            <p className="text-sm font-bold text-success/80 font-subtitle">Alle facturen voor dit project zijn succesvol ontvangen.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Invoices Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center space-x-3 dark:text-white">
              <Euro className="w-6 h-6 text-primary" />
              <span>Inkomsten</span>
            </h3>
            {!isAddingInvoice && (
              <button onClick={() => { setEditingInvoiceId(null); setNewInvoice({ description: '', type: 'amount', value: '', date: new Date().toISOString().split('T')[0], isReceived: false }); setIsAddingInvoice(true); }} className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {isAddingInvoice && (
            <div className="bg-white dark:bg-dark-card border-2 border-primary/20 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Omschrijving</label>
                  <input type="text" value={newInvoice.description} onChange={e => setNewInvoice({...newInvoice, description: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-primary px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="Bijv. Aanbetaling 50%" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Type</label>
                  <select value={newInvoice.type} onChange={e => setNewInvoice({...newInvoice, type: e.target.value as 'amount' | 'percentage'})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-primary px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white">
                    <option value="amount">Vast Bedrag (€)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Waarde</label>
                  <input type="number" value={newInvoice.value} onChange={e => setNewInvoice({...newInvoice, value: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-primary px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Datum</label>
                  <input type="date" value={newInvoice.date} onChange={e => setNewInvoice({...newInvoice, date: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-primary px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" />
                </div>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button onClick={() => { setIsAddingInvoice(false); setEditingInvoiceId(null); }} className="px-4 py-2 text-[10px] font-black uppercase text-text-muted dark:text-white/40">Annuleren</button>
                <button onClick={handleAddInvoice} className="flex-grow py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">{editingInvoiceId ? 'Opslaan' : 'Toevoegen'}</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {filteredInvoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(inv => {
              const amount = inv.type === 'amount' ? inv.amount : (inv.percentage / 100) * totalPrice;
              return (
                <div 
                  key={inv.id} 
                  onClick={() => setItemActionMenu({ type: 'invoice', id: inv.id, data: inv })}
                  className={`bg-white dark:bg-dark-card border border-primary/5 p-5 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-primary/20 transition-all ${editingInvoiceId === inv.id ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-xl transition-all ${inv.isReceived ? 'bg-success text-white' : 'bg-light dark:bg-dark text-text-muted opacity-40'}`}>
                      {inv.isReceived ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{inv.description}</h4>
                      <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                        {format(new Date(inv.date), 'dd MMM yyyy', { locale: nl })} • {inv.type === 'percentage' ? `${inv.percentage}%` : 'Vast'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-sm font-black ${inv.isReceived ? 'text-success' : 'text-text-main dark:text-white opacity-60'}`}>€{amount.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
            {filteredInvoices.length === 0 && !isAddingInvoice && (
              <div className="py-12 text-center bg-light/30 dark:bg-dark/20 border-2 border-dashed border-primary/10 rounded-3xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">Nog geen factuurmomenten</p>
              </div>
            )}
          </div>
        </div>

        {/* Expenses Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center space-x-3 dark:text-white">
              <CreditCard className="w-6 h-6 text-danger" />
              <span>Uitgaven</span>
            </h3>
            {!isAddingExpense && (
              <button onClick={() => { setEditingExpenseId(null); setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0], isRecurring: false }); setIsAddingExpense(true); }} className="p-2.5 bg-danger/10 text-danger rounded-xl hover:bg-danger hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {isAddingExpense && (
            <div className="bg-white dark:bg-dark-card border-2 border-danger/20 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Omschrijving</label>
                  <input type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-danger px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="Bijv. Licentie Miro" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Bedrag (€)</label>
                  <input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-danger px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Datum</label>
                  <input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-danger px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" />
                </div>
                <div className="flex items-center space-x-3 h-full pt-4">
                   <input type="checkbox" checked={newExpense.isRecurring} onChange={e => setNewExpense({...newExpense, isRecurring: e.target.checked})} className="w-4 h-4 rounded-md" />
                   <span className="text-[9px] font-black uppercase text-text-muted dark:text-white/60">Terugkerend</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }} className="px-4 py-2 text-[10px] font-black uppercase text-text-muted dark:text-white/40">Annuleren</button>
                <button onClick={handleAddExpense} className="flex-grow py-3 bg-danger text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-danger/20">{editingExpenseId ? 'Opslaan' : 'Toevoegen'}</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {expandedExpectedExpenses.filter(e => !(project.ignoredOneTime || []).includes(e.originalId || e.id)).length > 0 && (() => {
              const activeExpected = expandedExpectedExpenses.filter(e => !(project.ignoredOneTime || []).includes(e.originalId || e.id));
              const totalAmount = activeExpected.reduce((acc, exp) => acc + exp.amount, 0);
              return (
                <div className="bg-white dark:bg-dark-card border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setShowExpectedExpenses(!showExpectedExpenses)}
                    className="w-full flex items-center justify-between p-5 hover:bg-light/50 dark:hover:bg-dark/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-xl bg-danger/10 text-danger">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-sm dark:text-white leading-none mb-1">
                          Automatische Uitgaven <span className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full ml-2">{activeExpected.length}</span>
                        </h4>
                        <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                          Periodieke plugin / server kosten
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-black text-danger">
                        €{totalAmount.toLocaleString()}
                      </span>
                      {showExpectedExpenses ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                    </div>
                  </button>
                  
                  {showExpectedExpenses && (
                    <div className="border-t border-primary/10 bg-light/30 dark:bg-dark/20 p-4 space-y-3">
                      {activeExpected.map(exp => (
                        <div 
                          key={exp.id} 
                          onClick={() => setItemActionMenu({ type: 'expected_expense', id: exp.id, data: exp })}
                          className="bg-white dark:bg-dark-card border border-primary/5 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`p-2.5 rounded-lg bg-danger/5 text-danger`}>
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{exp.description}</h4>
                              <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                                Automatisch • {exp.isRecurring ? 'Jaarlijks' : 'Eenmalig'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm font-black text-danger">€{exp.amount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {filteredExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
              <div 
                key={exp.id} 
                onClick={() => setItemActionMenu({ type: 'expense', id: exp.id, data: exp })}
                className={`bg-white dark:bg-dark-card border border-primary/5 p-5 rounded-2xl flex items-center justify-between group cursor-pointer hover:border-danger/20 transition-all ${editingExpenseId === exp.id ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-danger/10 text-danger`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{exp.description}</h4>
                    <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                      {format(new Date(exp.date), 'dd MMM yyyy', { locale: nl })} {exp.isRecurring && '• Maandelijks'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-black text-danger">€{exp.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {filteredExpenses.length === 0 && expandedExpectedExpenses.length === 0 && !isAddingExpense && (
              <div className="py-12 text-center bg-light/30 dark:bg-dark/20 border-2 border-dashed border-danger/10 rounded-3xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">Geen uitgaven geregistreerd</p>
              </div>
            )}
          </div>
        </div>

        {/* Recurring Revenue Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight flex items-center space-x-3 dark:text-white">
              <Calendar className="w-6 h-6 text-info" />
              <span>Periodieke inkomsten</span>
            </h3>
            {!isAddingRecurring && (
              <button onClick={() => { setEditingRecurringId(null); setNewRecurring({ description: '', amount: '' }); setIsAddingRecurring(true); }} className="p-2.5 bg-info/10 text-info rounded-xl hover:bg-info hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {isAddingRecurring && (
            <div className="bg-white dark:bg-dark-card border-2 border-info/20 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Omschrijving</label>
                  <input type="text" value={newRecurring.description} onChange={e => setNewRecurring({...newRecurring, description: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-info px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="Bijv. Hosting" disabled={editingRecurringId !== null && !project.customRecurring?.some(c => c.id === editingRecurringId)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Bedrag (€)</label>
                  <input type="number" value={newRecurring.amount} onChange={e => setNewRecurring({...newRecurring, amount: e.target.value})} className="w-full bg-light dark:bg-dark border border-transparent focus:border-info px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="0.00" />
                </div>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button onClick={() => { setIsAddingRecurring(false); setEditingRecurringId(null); }} className="px-4 py-2 text-[10px] font-black uppercase text-text-muted dark:text-white/40">Annuleren</button>
                <button onClick={handleAddRecurring} className="flex-grow py-3 bg-info text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-info/20">{editingRecurringId ? 'Opslaan' : 'Toevoegen'}</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {recurringItems.length > 0 ? (
              recurringItems.map((item, idx) => (
                <div 
                  key={item.id || idx} 
                  onClick={() => setItemActionMenu({ type: 'recurring', id: item.id, data: item })}
                  className={`bg-white dark:bg-dark-card border-2 p-5 rounded-2xl flex items-center justify-between group cursor-pointer transition-all ${item.isInvoiced ? 'border-primary/5' : 'border-success/20 shadow-sm shadow-success/5'} ${editingRecurringId === item.id ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-xl ${item.isInvoiced ? 'bg-info/10 text-info' : 'bg-success/10 text-success'}`}>
                      {item.isInvoiced ? <Calendar className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{item.description} {item.isCustom && <span className="text-[9px] text-info bg-info/10 px-1.5 py-0.5 rounded ml-2">Aangepast</span>}</h4>
                      <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                        Jaarlijks {!item.isInvoiced && '• Actie vereist'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-black ${item.isInvoiced ? 'text-info' : 'text-success'}`}>€{item.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center bg-light/30 dark:bg-dark/20 border-2 border-dashed border-info/10 rounded-3xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-40">Geen periodieke inkomsten</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Item Action Menu Modal */}
      {itemActionMenu && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setItemActionMenu(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-text-main dark:text-white leading-tight">{itemActionMenu.data.description}</h3>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Beheer onderdeel</p>
                </div>
                <button onClick={() => setItemActionMenu(null)} className="p-2 bg-slate-100 dark:bg-dark text-text-muted hover:text-primary rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {itemActionMenu.type === 'invoice' && (
                  <button
                    onClick={() => { toggleInvoiceReceived(itemActionMenu.id); setItemActionMenu(null); }}
                    className={`flex items-center space-x-4 p-4 rounded-2xl transition-all ${itemActionMenu.data.isReceived ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'} hover:scale-[1.02]`}
                  >
                    <div className={`p-2 rounded-lg ${itemActionMenu.data.isReceived ? 'bg-warning/20' : 'bg-success/20'}`}>
                      {itemActionMenu.data.isReceived ? <Circle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-sm">{itemActionMenu.data.isReceived ? 'Markeer als niet ontvangen' : 'Markeer als ontvangen'}</span>
                  </button>
                )}

                {itemActionMenu.type === 'recurring' && !itemActionMenu.data.isInvoiced && (
                  <button
                    onClick={() => {
                      setNewInvoice({ description: itemActionMenu.data.description, type: 'amount', value: itemActionMenu.data.amount.toString(), date: new Date().toISOString().split('T')[0], isReceived: false });
                      setIsAddingInvoice(true);
                      setItemActionMenu(null);
                    }}
                    className="flex items-center space-x-4 p-4 bg-success text-white rounded-2xl transition-all hover:scale-[1.02] shadow-lg shadow-success/20"
                  >
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">Direct factureren</span>
                  </button>
                )}

                {(itemActionMenu.type === 'invoice' || itemActionMenu.type === 'expense' || itemActionMenu.type === 'recurring') && (
                  <button
                    onClick={() => {
                      if (itemActionMenu.type === 'invoice') startEditInvoice(itemActionMenu.data);
                      if (itemActionMenu.type === 'expense') startEditExpense(itemActionMenu.data);
                      if (itemActionMenu.type === 'recurring') startEditRecurring(itemActionMenu.data);
                      setItemActionMenu(null);
                    }}
                    className="flex items-center space-x-4 p-4 bg-light dark:bg-dark/60 text-text-main dark:text-white rounded-2xl transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    <div className="p-2 bg-white dark:bg-dark-card rounded-lg shadow-sm">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">Bewerken</span>
                  </button>
                )}

                {itemActionMenu.type === 'expected_expense' && (
                  <button
                    onClick={() => {
                      triggerConfirm('Verbergen?', 'Weet je zeker dat je deze automatische uitgave wilt verbergen?', () => {
                        onUpdate({ ...project, ignoredOneTime: [...(project.ignoredOneTime || []), itemActionMenu.data.originalId || itemActionMenu.data.id] });
                        addToast('Automatische uitgave verborgen', 'info');
                      });
                      setItemActionMenu(null);
                    }}
                    className="flex items-center space-x-4 p-4 bg-danger/10 text-danger rounded-2xl transition-all hover:bg-danger hover:text-white"
                  >
                    <div className="p-2 bg-danger/20 rounded-lg">
                      <X className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">Verbergen</span>
                  </button>
                )}

                {itemActionMenu.type !== 'expected_expense' && (
                  <button
                    onClick={() => {
                      if (itemActionMenu.type === 'invoice') deleteInvoice(itemActionMenu.id);
                      if (itemActionMenu.type === 'expense') deleteExpense(itemActionMenu.id);
                      if (itemActionMenu.type === 'recurring') deleteRecurring(itemActionMenu.data.originalId || itemActionMenu.id, itemActionMenu.data.isCustom);
                      setItemActionMenu(null);
                    }}
                    className="flex items-center space-x-4 p-4 bg-danger/10 text-danger rounded-2xl transition-all hover:bg-danger hover:text-white"
                  >
                    <div className="p-2 bg-danger/20 rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm">Verwijderen</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Breakdown Modal */}
      {showBudgetBreakdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setShowBudgetBreakdown(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-text-main dark:text-white">Prijs Onderbouwing</h3>
              <div className="flex items-center space-x-2">
                {!isAddingOneTime && (
                  <button onClick={() => { setEditingOneTimeId(null); setNewOneTime({ description: '', amount: '' }); setIsAddingOneTime(true); }} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => setShowBudgetBreakdown(false)} className="p-2 bg-slate-100 dark:bg-dark text-text-muted hover:text-primary rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-grow">
              {isAddingOneTime && (
                <div className="bg-light dark:bg-dark/40 border-2 border-primary/20 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 mb-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Omschrijving</label>
                      <input type="text" value={newOneTime.description} onChange={e => setNewOneTime({...newOneTime, description: e.target.value})} className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="Bijv. Maatwerk component" disabled={editingOneTimeId !== null && !project.customOneTime?.some(c => c.id === editingOneTimeId)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-text-muted opacity-60">Bedrag (€)</label>
                      <input type="number" value={newOneTime.amount} onChange={e => setNewOneTime({...newOneTime, amount: e.target.value})} className="w-full bg-white dark:bg-dark border border-transparent focus:border-primary px-4 py-2.5 rounded-xl outline-none font-bold text-xs dark:text-white" placeholder="0.00" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 pt-2">
                    <button onClick={() => { setIsAddingOneTime(false); setEditingOneTimeId(null); }} className="px-4 py-2 text-[10px] font-black uppercase text-text-muted dark:text-white/40">Annuleren</button>
                    <button onClick={handleAddOneTime} className="flex-grow py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">{editingOneTimeId ? 'Opslaan' : 'Toevoegen'}</button>
                  </div>
                </div>
              )}

              {oneTimeItems.length === 0 ? (
                <p className="text-sm text-text-muted text-center italic">Geen eenmalige onderdelen gevonden.</p>
              ) : (
                <div className="space-y-4">
                  {oneTimeItems.sort((a, b) => b.amount - a.amount).map((item, idx) => (
                    <div key={item.id || idx} className={`flex items-center justify-between p-4 bg-slate-50 dark:bg-dark/40 rounded-2xl border border-slate-100 dark:border-white/5 group ${editingOneTimeId === item.id ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-main dark:text-white">{item.description} {item.isCustom && <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-2">Aangepast</span>}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-black text-text-main dark:text-white">€{item.amount.toLocaleString()}</span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditOneTime(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteOneTime(item.id, item.isCustom)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-widest text-text-main dark:text-white">Totaal Berekend</span>
                    <span className="text-lg font-black text-primary">€{calculatedOneTimePrice.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialView;