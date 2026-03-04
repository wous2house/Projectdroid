import React, { useState, useMemo } from 'react';
import { Project, Invoice, Expense, Activity, Prices } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Euro, TrendingUp, TrendingDown, Calendar, Receipt, CreditCard, AlertCircle, Check, PartyPopper, Info, X, Edit3 } from 'lucide-react';
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
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingRecurring, setIsAddingRecurring] = useState(false);
  const [isAddingOneTime, setIsAddingOneTime] = useState(false);
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);

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
    return getExpectedExpenses(project.requirements || [], project.lockedPrices || prices, allProjects);
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

  const totalPrice = calculatedOneTimePrice;
  const invoices = project.invoices || [];
  const expenses = project.expenses || [];

  const financialSummary = useMemo(() => {
    const invoiced = invoices.reduce((acc, inv) => {
      const amount = inv.type === 'amount' ? inv.amount : (inv.percentage / 100) * totalPrice;
      return acc + amount;
    }, 0);

    const received = invoices.reduce((acc, inv) => {
      if (!inv.isReceived) return acc;
      const amount = inv.type === 'amount' ? inv.amount : (inv.percentage / 100) * totalPrice;
      return acc + amount;
    }, 0);

    const activeExpectedExpenses = expectedExpenses.filter(e => !(project.ignoredOneTime || []).includes(e.id)); // Using ignoredOneTime as generic ignore list for now, or maybe ignoredRecurring since they are recurring expenses? Let's not ignore them for now.
    const expectedExpensesAmount = expectedExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0) + expectedExpensesAmount;

    const receivedPercentage = totalPrice > 0 ? (received / totalPrice) * 100 : 0;
    const isFullyPaid = receivedPercentage >= 99.9; // Account for floating point

    return { invoiced, received, totalExpenses, isFullyPaid, receivedPercentage };
  }, [invoices, expenses, expectedExpenses, totalPrice]);

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
  
  const recurringItems = [
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-12">
      {/* Financial Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
            <p className="text-2xl md:text-3xl font-black text-text-main dark:text-white">€{totalPrice.toLocaleString()}</p>
            {project.priceNote && (
              <p className="text-xs font-bold text-text-muted dark:text-light/60">{project.priceNote}</p>
            )}
          </div>
        </div>

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

      {!project.totalPrice && (
        <div className="bg-warning/5 border border-warning/20 p-6 rounded-3xl flex items-center space-x-4">
          <AlertCircle className="w-6 h-6 text-warning" />
          <p className="text-sm font-bold text-warning-hover font-subtitle">Er is nog geen totaal budget ingesteld. Pas de projectinstellingen aan om budgetbeheer te activeren.</p>
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
            {invoices.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(inv => {
              const amount = inv.type === 'amount' ? inv.amount : (inv.percentage / 100) * totalPrice;
              return (
                <div key={inv.id} className={`bg-white dark:bg-dark-card border border-primary/5 p-5 rounded-2xl flex items-center justify-between group ${editingInvoiceId === inv.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <button onClick={() => toggleInvoiceReceived(inv.id)} className={`p-2 rounded-xl transition-all ${inv.isReceived ? 'bg-success text-white' : 'bg-light dark:bg-dark text-text-muted opacity-40 hover:opacity-100'}`}>
                      {inv.isReceived ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{inv.description}</h4>
                      <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                        {format(new Date(inv.date), 'dd MMM yyyy', { locale: nl })} • {inv.type === 'percentage' ? `${inv.percentage}%` : 'Vast'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-black mr-3 ${inv.isReceived ? 'text-success' : 'text-text-main dark:text-white opacity-60'}`}>€{amount.toLocaleString()}</span>
                    <button onClick={() => startEditInvoice(inv)} className="p-2 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 rounded-lg">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {invoices.length === 0 && !isAddingInvoice && (
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
            {expectedExpenses.filter(e => !(project.ignoredOneTime || []).includes(e.id)).map(exp => (
              <div key={exp.id} className="bg-white dark:bg-dark-card border border-primary/5 p-5 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-danger/10 text-danger`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{exp.description} <span className="text-[9px] text-danger bg-danger/10 px-1.5 py-0.5 rounded ml-2">Automatisch</span></h4>
                    <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                      Jaarlijks
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-black text-danger mr-3">€{exp.amount.toLocaleString()}</span>
                  <button onClick={() => {
                    triggerConfirm('Verbergen?', 'Weet je zeker dat je deze automatische uitgave wilt verbergen?', () => {
                      onUpdate({ ...project, ignoredOneTime: [...(project.ignoredOneTime || []), exp.id] });
                      addToast('Automatische uitgave verborgen', 'info');
                    });
                  }} className="p-2 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
              <div key={exp.id} className={`bg-white dark:bg-dark-card border border-primary/5 p-5 rounded-2xl flex items-center justify-between group ${editingExpenseId === exp.id ? 'opacity-50 pointer-events-none' : ''}`}>
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
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-black text-danger mr-3">€{exp.amount.toLocaleString()}</span>
                  <button onClick={() => startEditExpense(exp)} className="p-2 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 rounded-lg">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteExpense(exp.id)} className="p-2 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && expectedExpenses.length === 0 && !isAddingExpense && (
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
                <div key={item.id || idx} className={`bg-white dark:bg-dark-card border border-primary/5 p-5 rounded-2xl flex items-center justify-between group ${editingRecurringId === item.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-info/10 text-info rounded-xl">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{item.description} {item.isCustom && <span className="text-[9px] text-info bg-info/10 px-1.5 py-0.5 rounded ml-2">Aangepast</span>}</h4>
                      <p className="text-[9px] font-bold text-text-muted dark:text-light/40 uppercase tracking-widest">
                        Jaarlijks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-info mr-3">€{item.amount.toLocaleString()}</span>
                    <button onClick={() => startEditRecurring(item)} className="p-2 text-info opacity-0 group-hover:opacity-100 transition-all hover:bg-info/10 rounded-lg">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteRecurring(item.id, item.isCustom)} className="p-2 text-danger opacity-0 group-hover:opacity-100 transition-all hover:bg-danger/10 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
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