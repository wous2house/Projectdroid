
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, Customer, User, Prices } from '../types';
import { X, Calendar, UserPlus, Info, Check, Briefcase, Clock, Euro, AlignLeft } from 'lucide-react';
import RequirementsEditor, { calculatePrice } from './RequirementsEditor';

interface ProjectModalProps {
  project?: Project;
  customers: Customer[];
  users: User[];
  prices: Prices;
  onSave: (project: Omit<Project, 'id' | 'createdAt'> | Project) => void;
  onClose: () => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, customers, users, prices, onSave, onClose }) => {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status || ProjectStatus.OFFERTE);
  const [customerId, setCustomerId] = useState(project?.customerId || '');
  const [startDate, setStartDate] = useState(project?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(project?.endDate || '');
  const [team, setTeam] = useState<string[]>(project?.team || []);
  const [totalPrice, setTotalPrice] = useState<string>(project?.totalPrice?.toString() || '');
  const [priceNote, setPriceNote] = useState<string>(project?.priceNote || '');
  const [isHourlyRateActive, setIsHourlyRateActive] = useState(project?.isHourlyRateActive || false);
  const [hourlyRate, setHourlyRate] = useState<string>(project?.hourlyRate?.toString() || '');
  const [requirements, setRequirements] = useState<string[]>(project?.requirements || []);
  const [requirementNotes, setRequirementNotes] = useState<Record<string, string>>(project?.requirementNotes || {});

  useEffect(() => {
    if (customerId && isHourlyRateActive) {
      const customer = customers.find(c => c.id === customerId);
      if (customer && customer.hourlyRate && !hourlyRate) {
        setHourlyRate(customer.hourlyRate.toString());
      }
    }
  }, [customerId, isHourlyRateActive, customers, hourlyRate]);

  useEffect(() => {
    const { oneTime } = calculatePrice(requirements, requirementNotes, prices);
    if (oneTime > 0) {
      setTotalPrice(oneTime.toString());
    }
  }, [requirements, requirementNotes, prices]);

  const toggleTeamMember = (userId: string) => {
    setTeam(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSave({
      ...(project || {}),
      name,
      description,
      status,
      customerId: customerId || undefined,
      startDate,
      endDate: endDate || undefined,
      team,
      totalPrice: totalPrice ? parseFloat(totalPrice) : undefined,
      priceNote: priceNote || undefined,
      isHourlyRateActive,
      hourlyRate: isHourlyRateActive && hourlyRate ? parseFloat(hourlyRate) : undefined,
      requirements,
      requirementNotes,
      lockedPrices: project?.lockedPrices || prices,
      phases: project?.phases || [
        { id: 'ph1', name: 'Opstart', order: 0 },
        { id: 'ph2', name: 'Uitvoering', order: 1 }
      ],
      tasks: project?.tasks || [],
      attachments: project?.attachments || [],
      owner: project?.owner || 'Projectdroid System'
    });
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 sm:p-8 bg-dark/90 backdrop-blur-xl animate-in fade-in duration-300 font-sans">
      <div className="bg-white dark:bg-dark-card border border-white/10 rounded-[32px] sm:rounded-[48px] w-full max-w-4xl p-8 sm:p-12 shadow-3xl max-h-[90vh] overflow-y-auto scrollbar-hide flex flex-col">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-text-main dark:text-white tracking-tight">
            {project ? 'Project Bewerken' : 'Nieuw Project'}
          </h2>
          <button onClick={onClose} className="p-2 bg-light dark:bg-dark rounded-full transition-colors hover:text-danger"><X className="w-6 h-6 dark:text-white" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-8 flex-grow">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Projecttitel</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-light dark:bg-dark rounded-2xl px-6 py-4 font-black text-lg sm:text-xl outline-none border border-transparent focus:border-primary transition-all dark:text-white" 
              placeholder="Bijv. Webshop redesign" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Korte Beschrijving</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-light dark:bg-dark rounded-2xl px-6 py-4 font-medium text-sm outline-none border border-transparent focus:border-primary transition-all dark:text-white resize-none h-24" 
              placeholder="Korte omschrijving van het project..." 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Totale Projectprijs (Budget)</label>
              <div className="relative">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <input
                  type="number"
                  value={totalPrice}
                  onChange={e => setTotalPrice(e.target.value)}
                  className="w-full bg-light dark:bg-dark rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <input
                type="text"
                value={priceNote}
                onChange={e => setPriceNote(e.target.value)}
                className="w-full mt-2 bg-light dark:bg-dark rounded-xl px-4 py-2 font-bold text-xs outline-none border border-transparent focus:border-primary dark:text-white"
                placeholder="Notitie bij prijs (optioneel)"
              />
              {parseFloat(totalPrice) > 0 && (
                <div className="ml-2 mt-1.5 text-[10px] font-bold text-primary/80">
                  Berekend: € {calculatePrice(requirements, requirementNotes, prices).oneTime.toFixed(2)} eenmalig
                </div>
              )}
              <div className="flex items-center justify-between mt-4 bg-slate-50 dark:bg-dark/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-80 ml-1">Uurtarief Activeren</label>
                <button
                  type="button"
                  onClick={() => setIsHourlyRateActive(!isHourlyRateActive)}
                  className={`w-10 h-6 rounded-full transition-colors relative shadow-inner ${isHourlyRateActive ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${isHourlyRateActive ? 'left-5' : 'left-1'}`}></div>
                </button>
              </div>
              {isHourlyRateActive && (
                <div className="mt-2 relative">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    className="w-full bg-light dark:bg-dark rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white"
                    placeholder="Uurtarief (€ / uur)"
                  />
                </div>
              )}
            </div>            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as ProjectStatus)} 
                className="w-full bg-light dark:bg-dark rounded-xl px-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white cursor-pointer"
              >
                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Startdatum</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="w-full bg-light dark:bg-dark rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Deadline</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-danger" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="w-full bg-light dark:bg-dark rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2">Klant Koppelen</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-info" />
              <select 
                value={customerId} 
                onChange={e => setCustomerId(e.target.value)} 
                className="w-full bg-light dark:bg-dark rounded-xl pl-12 pr-6 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-primary dark:text-white cursor-pointer"
              >
                <option value="">Geen specifieke klant</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2 flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>Project Team Koppelen</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleTeamMember(u.id)}
                  className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all ${team.includes(u.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-light/30 dark:bg-dark/40 border-transparent text-text-muted dark:text-light/50 hover:bg-light dark:hover:bg-dark'}`}
                >
                  <div className="relative">
                    <img src={u.avatar} className="w-8 h-8 rounded-lg shadow-sm" alt={u.name} />
                    {team.includes(u.id) && (
                      <div className="absolute -top-1 -right-1 bg-primary text-white p-0.5 rounded-full shadow-sm">
                        <Check className="w-2 h-2" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold truncate">{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-muted opacity-60 ml-2 flex items-center space-x-2">
              <AlignLeft className="w-4 h-4" />
              <span>Project Inhoud</span>
            </label>
            <div className="bg-slate-50 dark:bg-dark/40 p-6 md:p-8 rounded-[32px] border border-slate-100 dark:border-white/5">
              <RequirementsEditor 
                requirements={requirements}
                requirementNotes={requirementNotes}
                onChangeRequirements={setRequirements}
                onChangeNotes={setRequirementNotes}
                prices={prices}
                lockedPrices={project?.lockedPrices}
              />
            </div>
          </div>

          <div className="flex space-x-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 py-5 rounded-2xl border dark:border-white/10 font-black text-xs uppercase tracking-widest hover:bg-light dark:hover:bg-dark dark:text-white">Annuleren</button>
            <button type="submit" className="flex-1 py-5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary-hover transition-colors">
              {project ? 'Wijzigingen Opslaan' : 'Project Starten'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
