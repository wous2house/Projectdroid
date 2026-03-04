
import React, { useState, useRef, useEffect } from 'react';
import { Customer, Project } from '../types';
import { Plus, X, Globe, Mail, Phone, MapPin, ExternalLink, Calendar, ChevronRight, Layout, Search, Users, Upload, Image as ImageIcon, Edit2, Trash2, Save, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CustomerManagementProps {
  customers: Customer[];
  projects: Project[];
  onCreateCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectProject: (id: string) => void;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ 
  customers, projects, onCreateCustomer, onUpdateCustomer, onDeleteCustomer, onSelectProject, triggerConfirm 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    name: '', logo: '', email: '', phone: '', address: ''
  });

  // Reset selectie als de klant uit de lijst is verdwenen (bijv. na verwijdering)
  useEffect(() => {
    if (selectedCustomerId && !customers.find(c => c.id === selectedCustomerId)) {
      setSelectedCustomerId(null);
    }
  }, [customers, selectedCustomerId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedCustomerId) {
      const original = customers.find(c => c.id === selectedCustomerId);
      if (original) {
        onUpdateCustomer({ ...original, ...formState });
      }
      setIsEditing(false);
      setShowAddModal(false);
    } else {
      onCreateCustomer(formState);
      setShowAddModal(false);
    }
    setFormState({ name: '', logo: '', email: '', phone: '', address: '' });
  };

  const startEdit = (customer: Customer) => {
    setFormState({
      name: customer.name,
      logo: customer.logo,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || ''
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  // Sorteer klanten op aanmaakdatum (nieuwste eerst) met veilige checks
  const filteredCustomers = [...customers]
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerProjects = projects.filter(p => p.customerId === selectedCustomerId);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-2 gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-[#061637] dark:text-white tracking-tighter">Klanten Portfolio.</h2>
          <div className="flex items-center space-x-3">
             <p className="text-text-muted dark:text-light/70 font-bold text-sm uppercase tracking-widest opacity-80">Beheer je relaties.</p>
             <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black">{customers.length} TOTAAL</span>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsEditing(false);
            setFormState({ name: '', logo: '', email: '', phone: '', address: '' });
            setShowAddModal(true);
          }}
          className="bg-primary text-white px-8 py-4 rounded-[22px] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center justify-center space-x-3 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Nieuwe Klant</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 min-h-[600px]">
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="relative group flex-shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-40" />
            <input 
              type="text" 
              placeholder="Zoek in portfolio..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#061637] border border-primary/5 rounded-[22px] pl-14 pr-6 py-4 outline-none font-bold text-xs shadow-sm focus:border-primary/30 transition-all dark:text-white"
            />
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-2 scroll-smooth scrollbar-hide">
            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`w-full p-6 rounded-[32px] border transition-all flex items-center space-x-5 text-left group ${selectedCustomerId === c.id ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30' : 'bg-white dark:bg-[#061637] border-primary/5 hover:border-primary/20 hover:shadow-lg'}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <img src={c.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`} className="w-full h-full object-cover bg-white" alt={c.name} />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className={`font-black text-lg tracking-tight truncate ${selectedCustomerId === c.id ? 'text-white' : 'dark:text-white group-hover:text-primary'}`}>{c.name}</h4>
                  <p className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${selectedCustomerId === c.id ? 'text-white' : 'text-text-muted dark:text-light/60'}`}>
                    {projects.filter(p => p.customerId === c.id).length} Projecten
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${selectedCustomerId === c.id ? 'opacity-100 translate-x-1' : 'opacity-20'}`} />
              </button>
            )) : (
              <div className="py-24 text-center opacity-30 border-2 border-dashed border-primary/10 rounded-[32px] bg-white/10">
                <Filter className="w-10 h-10 mx-auto mb-4 text-primary" />
                <p className="text-xs font-black uppercase tracking-widest dark:text-white">Geen klanten gevonden</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {selectedCustomer ? (
            <div className="space-y-10 animate-in slide-in-from-right-10 duration-500">
              <div className="bg-white dark:bg-[#061637] p-12 rounded-[50px] border border-primary/5 space-y-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                
                <div className="flex flex-col md:flex-row md:items-start justify-between relative z-10 gap-6">
                  <div className="flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-8">
                    <div className="w-32 h-32 rounded-[32px] bg-white border-4 border-primary/5 shadow-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                       <img src={selectedCustomer.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedCustomer.name}`} className="w-full h-full object-cover bg-white" alt={selectedCustomer.name} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-4xl font-black tracking-tighter text-[#061637] dark:text-white">{selectedCustomer.name}</h3>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center space-x-2 text-text-muted dark:text-light/70 font-bold text-xs font-subtitle"><Mail className="w-3.5 h-3.5 text-primary" /> <span>{selectedCustomer.email}</span></div>
                        <div className="flex items-center space-x-2 text-text-muted dark:text-light/70 font-bold text-xs font-subtitle"><Phone className="w-3.5 h-3.5 text-primary" /> <span>{selectedCustomer.phone}</span></div>
                        {selectedCustomer.address && <div className="flex items-center space-x-2 text-text-muted dark:text-light/70 font-bold text-xs font-subtitle"><MapPin className="w-3.5 h-3.5 text-primary" /> <span>{selectedCustomer.address}</span></div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => startEdit(selectedCustomer)}
                      className="p-4 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-2xl transition-all shadow-sm border border-primary/10"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onDeleteCustomer(selectedCustomer.id)}
                      className="p-4 bg-danger/5 text-danger hover:bg-danger hover:text-white rounded-2xl transition-all shadow-sm border border-danger/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pb-12">
                <h4 className="text-2xl font-black tracking-tight flex items-center space-x-3 dark:text-white">
                   <Layout className="w-6 h-6 text-primary" />
                   <span>Projecten Portfolio ({customerProjects.length})</span>
                </h4>
                
                {customerProjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-subtitle">
                    {customerProjects.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map(p => (
                      <div 
                        key={p.id}
                        onClick={() => onSelectProject(p.id)}
                        className="bg-white dark:bg-[#061637] p-8 rounded-[40px] border border-primary/5 hover:border-primary/20 hover:shadow-2xl cursor-pointer transition-all group"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <span className="bg-primary/5 text-primary px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest">
                            {p.status}
                          </span>
                          <Calendar className="w-4 h-4 text-text-muted opacity-30 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h5 className="text-lg font-black tracking-tight mb-2 group-hover:text-primary transition-colors font-sans dark:text-white">{p.name}</h5>
                        <p className="text-text-muted dark:text-light/60 text-[11px] line-clamp-2 mb-6 font-medium leading-relaxed">{p.description}</p>
                        <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted dark:text-light/40 opacity-60">Sinds</span>
                          <span className="text-[10px] font-black text-text-main dark:text-white uppercase">
                            {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy', { locale: nl }) : 'Onbekend'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center bg-white/40 dark:bg-[#061637]/40 border-2 border-dashed border-primary/10 rounded-[40px]">
                    <p className="text-xs font-black text-text-muted uppercase tracking-widest opacity-40 dark:text-white/40">Geen actieve projecten</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-32 space-y-6 text-center opacity-30 bg-white/20 dark:bg-[#061637]/20 rounded-[50px] border-2 border-dashed border-primary/5">
               <div className="p-10 bg-primary/5 rounded-[60px] border-4 border-dashed border-primary/10">
                 <Users className="w-20 h-20 text-primary" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl font-black tracking-tight dark:text-white">Kies een klant</h3>
                 <p className="text-sm font-bold uppercase tracking-widest font-subtitle dark:text-white">om gegevens te bekijken</p>
               </div>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-8 bg-dark/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#061637] border border-white/10 rounded-[48px] w-full max-w-3xl p-12 shadow-3xl max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-[#061637] dark:text-white tracking-tight">
                {isEditing ? 'Klant Aanpassen' : 'Nieuwe Relatie'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-light dark:bg-dark rounded-full transition-colors hover:text-danger"><X className="w-6 h-6 dark:text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-white/70 font-subtitle ml-2">Bedrijfsnaam</label>
                <input type="text" required value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})} className="w-full bg-light dark:bg-dark rounded-2xl px-6 py-4 font-black text-lg outline-none border-2 border-transparent focus:border-primary transition-all dark:text-white" placeholder="Naam..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-white/70 font-subtitle ml-2">Logo Uploaden</label>
                <input 
                  type="file" 
                  ref={isEditing ? editFileInputRef : fileInputRef}
                  onChange={(e) => handleFileChange(e, isEditing)}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => (isEditing ? editFileInputRef : fileInputRef).current?.click()}
                  className="w-full bg-light dark:bg-dark border-2 border-dashed border-primary/20 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary transition-all group"
                >
                  {formState.logo ? (
                    <div className="relative">
                       <div className="w-24 h-24 rounded-2xl bg-white shadow-lg overflow-hidden flex items-center justify-center">
                          <img src={formState.logo} className="w-full h-full object-cover bg-white" alt="Preview" />
                       </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="p-4 bg-primary/10 rounded-2xl text-primary mx-auto w-fit group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-white/50 font-subtitle">Klik voor logo</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-subtitle">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-white/70 ml-2">E-mail</label>
                  <input type="email" value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})} className="w-full bg-light dark:bg-dark rounded-2xl px-6 py-4 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all dark:text-white" placeholder="info@..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-white/70 ml-2">Telefoon</label>
                  <input type="text" value={formState.phone} onChange={e => setFormState({...formState, phone: e.target.value})} className="w-full bg-light dark:bg-dark rounded-2xl px-6 py-4 font-bold text-sm outline-none border-2 border-transparent focus:border-primary transition-all dark:text-white" placeholder="06..." />
                </div>
              </div>

              <div className="flex space-x-4 pt-4 font-subtitle">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 rounded-2xl border-2 dark:border-white/10 font-black text-xs uppercase tracking-widest transition-colors hover:bg-light dark:text-white">Sluiten</button>
                <button type="submit" className="flex-1 py-5 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-transform hover:scale-[1.02]">
                  {isEditing ? 'Opslaan' : 'Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
