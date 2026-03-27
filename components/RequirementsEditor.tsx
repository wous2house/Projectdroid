import React, { useState } from 'react';
import { Check, Edit3, MessageSquare } from 'lucide-react';
import { Prices, Project } from '../types';
import { LEVEL2_GROUP, LEVEL3_GROUP, getIndentClass } from '../lib/requirements';

export const calculatePrice = (requirements: string[], notes: Record<string, string>, prices: Prices) => {
  let oneTime = 0;
  let recurring = 0;

  const isLanding = requirements.includes('type_landing');
  const hasMaintenance = requirements.includes('onderhoud');
  const replacePlugins = isLanding && hasMaintenance;

  if (requirements.includes('type_werken_bij')) {
    const size = notes['type_werken_bij_size'];
    if (size === 'Small') oneTime += prices.type_werken_bij_small;
    if (size === 'Medium') oneTime += prices.type_werken_bij_medium;
    if (size === 'Large') oneTime += prices.type_werken_bij_large;
  }

  if (isLanding) {
    const size = notes['type_landing_size'];
    if (size === 'Standaard') oneTime += prices.type_landing_standaard;
    if (size === 'Premium') oneTime += prices.type_landing_premium;
  }

  if (requirements.includes('type_add_website')) {
    oneTime += prices.type_add_website;
  }

  if (requirements.includes('type_edit_website')) {
    oneTime += prices.type_edit_website;
  }

  if (requirements.includes('type_fix_website')) {
    oneTime += prices.type_fix_website;
  }

  if (!isLanding) {
    if (requirements.includes('wp_elementor')) oneTime += prices.wp_elementor;
    if (requirements.includes('wp_forms')) {
      if (hasMaintenance) oneTime += prices.wp_forms;
      else recurring += prices.wp_forms;
    }
    if (requirements.includes('wp_acf')) oneTime += prices.wp_acf;
    if (requirements.includes('wp_code')) oneTime += prices.wp_code;
  }

  let pluginRecurring = 0;
  let pluginOneTime = 0;
  if (requirements.includes('wp_jet')) {
    if (hasMaintenance) pluginOneTime += prices.wp_jet;
    else pluginRecurring += prices.wp_jet;
  }
  if (requirements.includes('wp_smashballoon_pro')) {
    if (hasMaintenance) pluginOneTime += prices.wp_smashballoon_pro;
    else pluginRecurring += prices.wp_smashballoon_pro;
  }
  if (requirements.includes('wp_api_to_posts')) {
    oneTime += prices.wp_api_to_posts_onetime || 650;
    if (hasMaintenance) pluginOneTime += prices.wp_api_to_posts;
    else pluginRecurring += prices.wp_api_to_posts;
  }

  let maintenanceRecurring = 0;
  if (hasMaintenance) {
    const tier = notes['onderhoud_tier'];
    if (tier === 'Licht') maintenanceRecurring += prices.onderhoud_light;
    if (tier === 'Gemiddeld') maintenanceRecurring += prices.onderhoud_medium;
    if (tier === 'Sterk') maintenanceRecurring += prices.onderhoud_strong;
  }

  if (replacePlugins) {
    recurring += maintenanceRecurring;
  } else {
    oneTime += pluginOneTime;
    recurring += pluginRecurring + maintenanceRecurring;
  }

  return { oneTime, recurring, total: oneTime + recurring };
};

export const getBudgetBreakdown = (requirements: string[], notes: Record<string, string>, prices: Prices) => {
  const breakdown: { label: string; price: number; isRecurring: boolean }[] = [];
  const isLanding = requirements.includes('type_landing');
  const hasMaintenance = requirements.includes('onderhoud');

  if (requirements.includes('type_werken_bij')) {
    const size = notes['type_werken_bij_size'];
    if (size === 'Small') breakdown.push({ label: `Werken-bij site (Small)`, price: prices.type_werken_bij_small, isRecurring: false });
    if (size === 'Medium') breakdown.push({ label: `Werken-bij site (Medium)`, price: prices.type_werken_bij_medium, isRecurring: false });
    if (size === 'Large') breakdown.push({ label: `Werken-bij site (Large)`, price: prices.type_werken_bij_large, isRecurring: false });
  }

  if (isLanding) {
    const size = notes['type_landing_size'];
    if (size === 'Standaard') breakdown.push({ label: `Landingspagina (Standaard)`, price: prices.type_landing_standaard, isRecurring: false });
    if (size === 'Premium') breakdown.push({ label: `Landingspagina (Premium)`, price: prices.type_landing_premium, isRecurring: false });
  }

  if (requirements.includes('type_add_website')) {
    breakdown.push({ label: `Toevoeging website`, price: prices.type_add_website, isRecurring: false });
  }

  if (requirements.includes('type_edit_website')) {
    breakdown.push({ label: `Aanpassing website`, price: prices.type_edit_website, isRecurring: false });
  }

  if (requirements.includes('type_fix_website')) {
    breakdown.push({ label: `Fix website`, price: prices.type_fix_website, isRecurring: false });
  }

  if (requirements.includes('wp_api_to_posts')) {
    breakdown.push({ label: 'API to Posts (Eenmalig)', price: prices.wp_api_to_posts_onetime || 650, isRecurring: false });
  }

  if (hasMaintenance) {
    const tier = notes['onderhoud_tier'];
    if (tier === 'Licht') breakdown.push({ label: `Onderhoud (Licht)`, price: prices.onderhoud_light, isRecurring: true });
    if (tier === 'Gemiddeld') breakdown.push({ label: `Onderhoud (Gemiddeld)`, price: prices.onderhoud_medium, isRecurring: true });
    if (tier === 'Sterk') breakdown.push({ label: `Onderhoud (Sterk)`, price: prices.onderhoud_strong, isRecurring: true });
  }

  return breakdown;
};

export const getExpectedExpenses = (requirements: string[], prices: Prices, allProjects: Project[] = [], globalPrices?: Prices) => {
  const expenses: { id: string; description: string; amount: number; isRecurring: boolean }[] = [];
  
  const getCostInfo = (key: keyof Prices, label: string): { amount: number, isRecurring: boolean } | null => {
    if (!requirements.includes(label)) return null;

    const effectiveGlobalPrices = globalPrices || prices;
    const dynamicData = effectiveGlobalPrices.dynamicPricing?.[key as string] || prices.dynamicPricing?.[key as string];
    const isDynamic = dynamicData?.isDynamic || (effectiveGlobalPrices.dynamicCosts || []).includes(key as string) || (prices.dynamicCosts || []).includes(key as string);

    const priceSource = isDynamic ? effectiveGlobalPrices : prices;

    let cost = priceSource[`${key}_cost` as keyof Prices] as number || 0;
    let isRecurring = true;
    
    if (dynamicData && dynamicData.isDynamic) {
      isRecurring = dynamicData.isAnnual ?? true;
      const usageCount = allProjects.filter(p => (p.requirements || []).includes(label)).length || 1;
      cost = cost / usageCount;
    } else if ((priceSource.dynamicCosts || []).includes(key as string)) {
      // Fallback for older data that still uses dynamicCosts array
      const usageCount = allProjects.filter(p => (p.requirements || []).includes(label)).length || 1;
      cost = cost / usageCount;
    }
    return { amount: cost, isRecurring };
  };

  const wp_elementor = getCostInfo('wp_elementor', 'wp_elementor');
  if (wp_elementor) expenses.push({ id: 'gen_wp_elementor', description: 'Licentie Elementor', amount: wp_elementor.amount, isRecurring: wp_elementor.isRecurring });

  const wp_acf = getCostInfo('wp_acf', 'wp_acf');
  if (wp_acf) expenses.push({ id: 'gen_wp_acf', description: 'Licentie Advanced Custom Fields', amount: wp_acf.amount, isRecurring: wp_acf.isRecurring });

  const wp_code = getCostInfo('wp_code', 'wp_code');
  if (wp_code) expenses.push({ id: 'gen_wp_code', description: 'Licentie WP Code', amount: wp_code.amount, isRecurring: wp_code.isRecurring });

  const wp_forms = getCostInfo('wp_forms', 'wp_forms');
  if (wp_forms) expenses.push({ id: 'gen_wp_forms', description: 'Licentie WP Forms', amount: wp_forms.amount, isRecurring: wp_forms.isRecurring });

  const wp_jet = getCostInfo('wp_jet', 'wp_jet');
  if (wp_jet) expenses.push({ id: 'gen_wp_jet', description: 'Licentie Jet Engine', amount: wp_jet.amount, isRecurring: wp_jet.isRecurring });

  const wp_smashballoon_pro = getCostInfo('wp_smashballoon_pro', 'wp_smashballoon_pro');
  if (wp_smashballoon_pro) expenses.push({ id: 'gen_wp_smashballoon_pro', description: 'Licentie SmashBalloon (Pro)', amount: wp_smashballoon_pro.amount, isRecurring: wp_smashballoon_pro.isRecurring });

  const wp_api_to_posts = getCostInfo('wp_api_to_posts', 'wp_api_to_posts');
  if (wp_api_to_posts) expenses.push({ id: 'gen_wp_api_to_posts', description: 'Licentie API to Posts', amount: wp_api_to_posts.amount, isRecurring: wp_api_to_posts.isRecurring });

  return expenses;
};

export const REQ_LABELS: Record<string, string> = {
  bouw_website: 'Bouw website',
  type_add_website: 'Toevoeging website',
  type_edit_website: 'Aanpassing website',
  type_fix_website: 'Fix website',
  type_werken_bij: 'Werken-bij site',
  type_landing: 'Landingspagina',
  type_corporate: 'Corporate website',
  cms_eigen: 'Eigen CMS',
  cms_wp: 'Wordpress',
  eigen_recruitee: 'Recruitee',
  wp_elementor: 'Elementor',
  wp_acf: 'Advanced Custom Fields',
  wp_code: 'WP Code',
  wp_forms: 'WP Forms',
  wp_jet: 'Jet Engine',
  wp_smashballoon_pro: 'SmashBalloon (Pro)',
  wp_api_to_posts: 'API to Posts',
  onderhoud: 'Onderhoud website',
  wp_rocket: 'WP Rocket',
  wp_umbrella: 'WP Umbrella',
  wp_wordfence: 'Wordfence free',
  wp_wordfence_premium: 'Wordfence Premium'
};

export const REQ_ORDER = [
  'bouw_website',
  'type_add_website',
  'type_edit_website',
  'type_fix_website',
  'type_werken_bij',
  'type_landing',
  'type_corporate',
  'cms_wp',
  'wp_elementor',
  'wp_acf',
  'wp_code',
  'wp_forms',
  'wp_jet',
  'wp_smashballoon_pro',
  'wp_api_to_posts',
  'cms_eigen',
  'eigen_recruitee',
  'onderhoud',
  'wp_rocket',
  'wp_umbrella',
  'wp_wordfence',
  'wp_wordfence_premium'
];


interface RequirementsEditorProps {
  requirements: string[];
  requirementNotes: Record<string, string>;
  onChangeRequirements: (reqs: string[]) => void;
  onChangeNotes: (notes: Record<string, string>) => void;
  prices: Prices;
  lockedPrices?: Prices;
}

const RequirementsEditor: React.FC<RequirementsEditorProps> = ({ requirements, requirementNotes, onChangeRequirements, onChangeNotes, prices, lockedPrices }) => {
  const [activeNoteFields, setActiveNoteFields] = useState<Record<string, boolean>>({});

  const hasReq = (req: string) => requirements.includes(req);
  const hasAnyType = hasReq('type_werken_bij') || hasReq('type_landing') || hasReq('type_corporate');

  const toggleRequirement = (req: string) => {
    let newReqs = [...requirements];
    
    if (newReqs.includes(req)) {
      // Unchecking
      newReqs = newReqs.filter(r => r !== req);
      
      // Uncheck children logic
      if (req === 'bouw_website') {
        newReqs = newReqs.filter(r => ![
          ...LEVEL2_GROUP, ...LEVEL3_GROUP, 'eigen_recruitee', 'wp_elementor', 'wp_forms', 'wp_acf', 'wp_code', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts'
        ].includes(r));
      } else if (LEVEL2_GROUP.includes(req)) {
        // Since it's radio, unchecking it means no type is selected
        newReqs = newReqs.filter(r => ![
          ...LEVEL3_GROUP, 'eigen_recruitee', 'wp_elementor', 'wp_forms', 'wp_acf', 'wp_code', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts'
        ].includes(r));
      } else if (req === 'cms_eigen') {
        newReqs = newReqs.filter(r => !['eigen_recruitee'].includes(r));
      } else if (req === 'cms_wp') {
        newReqs = newReqs.filter(r => !['wp_elementor', 'wp_forms', 'wp_acf', 'wp_code', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts'].includes(r));
      } else if (req === 'onderhoud') {
        newReqs = newReqs.filter(r => !['wp_rocket', 'wp_umbrella', 'wp_wordfence', 'wp_wordfence_premium'].includes(r));
      }
    } else {
      // Checking
      if (LEVEL2_GROUP.includes(req)) {
        // Remove others in LEVEL2_GROUP
        newReqs = newReqs.filter(r => !LEVEL2_GROUP.includes(r));
      } else if (LEVEL3_GROUP.includes(req)) {
        // Remove others in LEVEL3_GROUP
        newReqs = newReqs.filter(r => !LEVEL3_GROUP.includes(r));
        // Remove children of the old CMS
        if (req === 'cms_eigen') {
          newReqs = newReqs.filter(r => !['wp_elementor', 'wp_forms', 'wp_acf', 'wp_code', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts'].includes(r));
        } else if (req === 'cms_wp') {
          newReqs = newReqs.filter(r => !['eigen_recruitee'].includes(r));
        }
      }
      newReqs.push(req);
      
      // Auto-check defaults for Wordpress
      if (req === 'cms_wp') {
        if (!newReqs.includes('wp_elementor')) newReqs.push('wp_elementor');
        if (!newReqs.includes('wp_acf')) newReqs.push('wp_acf');
        if (!newReqs.includes('wp_code')) newReqs.push('wp_code');
      }
    }
    onChangeRequirements(newReqs);
  };

  const updateNote = (req: string, note: string) => {
    onChangeNotes({ ...requirementNotes, [req]: note });
  };

  const toggleNoteField = (id: string) => {
    setActiveNoteFields(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOnderhoudTierChange = (tier: string) => {
    onChangeNotes({ ...requirementNotes, onderhoud_tier: tier });
    
    let newReqs = [...requirements];
    
    // First remove all maintenance plugins to reset
    newReqs = newReqs.filter(r => !['wp_rocket', 'wp_umbrella', 'wp_wordfence', 'wp_wordfence_premium'].includes(r));
    
    if (tier === 'Licht') {
      newReqs.push('wp_rocket');
    } else if (tier === 'Gemiddeld') {
      newReqs.push('wp_rocket', 'wp_umbrella', 'wp_wordfence');
    } else if (tier === 'Sterk') {
      newReqs.push('wp_rocket', 'wp_umbrella', 'wp_wordfence_premium');
    }
    
    onChangeRequirements(newReqs);
  };

  const renderReqCheckbox = (id: string, label?: string, isBold = false, isRadio = false) => {
    const checked = hasReq(id);
    const showNoteField = activeNoteFields[id] || (requirementNotes[id] && requirementNotes[id].trim() !== '');
    const displayLabel = label || REQ_LABELS[id] || id;

    return (
      <div className="group flex flex-col space-y-2.5 animate-in fade-in duration-300">
        <div className="flex items-center space-x-4">
          <button 
            type="button"
            onClick={() => toggleRequirement(id)}
            className={`flex-shrink-0 w-6 h-6 ${isRadio ? 'rounded-full' : 'rounded-lg'} border-2 flex items-center justify-center transition-all ${checked ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' : 'bg-white dark:bg-dark border-slate-300 dark:border-slate-600 text-transparent hover:border-primary'}`}
          >
            {isRadio ? (
              <div className={`w-2 h-2 rounded-full bg-white ${checked ? 'opacity-100' : 'opacity-0'}`} />
            ) : (
              <Check className="w-4 h-4" strokeWidth={3} />
            )}
          </button>
          <span 
            onClick={() => toggleRequirement(id)}
            className={`text-sm cursor-pointer select-none transition-colors flex items-center space-x-2 ${isBold ? 'font-bold text-text-main dark:text-white' : 'font-medium text-text-muted dark:text-slate-300'} ${checked ? 'text-primary dark:text-primary' : 'group-hover:text-primary'}`}
          >
            <span>{displayLabel}</span>
          </span>
          {checked && (
            <button 
              type="button"
              onClick={() => toggleNoteField(id)}
              className={`p-1.5 rounded-lg transition-all ${showNoteField ? 'bg-primary/10 text-primary' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/5'}`}
              title="Notitie toevoegen"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        {checked && showNoteField && (
          <div className="ml-10 pr-4 animate-in slide-in-from-top-2 duration-200">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary opacity-40" />
              </div>
              <input 
                type="text"
                value={requirementNotes[id] || ''}
                onChange={(e) => updateNote(id, e.target.value)}
                placeholder="Notitie toevoegen..."
                autoFocus={!requirementNotes[id]}
                className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none transition-all dark:text-white shadow-sm"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderReqCheckbox("bouw_website", undefined, true)}
        {renderReqCheckbox("type_add_website", undefined, true)}
        {renderReqCheckbox("type_edit_website", undefined, true)}
        {renderReqCheckbox("type_fix_website", undefined, true)}
      </div>
    
      {hasReq('bouw_website') && (
        <div className="ml-3 pl-7 py-2 border-l-2 border-slate-200 dark:border-white/10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {renderReqCheckbox("type_werken_bij", undefined, false, true)}
              {hasReq('type_werken_bij') && (
                <div className="ml-10 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <select
                    value={requirementNotes['type_werken_bij_size'] || ''}
                    onChange={(e) => onChangeNotes({ ...requirementNotes, type_werken_bij_size: e.target.value })}
                    className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all dark:text-white shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Selecteer grootte...</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              {renderReqCheckbox("type_landing", undefined, false, true)}
              {hasReq('type_landing') && (
                <div className="ml-10 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <select
                    value={requirementNotes['type_landing_size'] || ''}
                    onChange={(e) => onChangeNotes({ ...requirementNotes, type_landing_size: e.target.value })}
                    className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all dark:text-white shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Selecteer type...</option>
                    <option value="Standaard">Standaard</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
              )}
            </div>
            <div>{renderReqCheckbox("type_corporate", undefined, false, true)}</div>
          </div>
          
          {hasAnyType && (
            <div className="pt-4 space-y-6">
              <div className="space-y-4">
                {renderReqCheckbox("cms_wp", undefined, true, true)}
                {hasReq('cms_wp') && (
                  <div className="ml-3 pl-7 py-2 border-l-2 border-slate-200 dark:border-white/10 space-y-4">
                    {renderReqCheckbox("wp_elementor")}
                    {renderReqCheckbox("wp_acf")}
                    {renderReqCheckbox("wp_code")}
                    {renderReqCheckbox("wp_forms")}
                    {renderReqCheckbox("wp_jet")}
                    {renderReqCheckbox("wp_smashballoon_pro")}
                    <div>
                      {renderReqCheckbox("wp_api_to_posts")}
                      {hasReq('wp_api_to_posts') && (
                        <div className="ml-10 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <select
                            value={requirementNotes['wp_api_to_posts_type'] || ''}
                            onChange={(e) => onChangeNotes({ ...requirementNotes, wp_api_to_posts_type: e.target.value })}
                            className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all dark:text-white shadow-sm cursor-pointer"
                          >
                            <option value="" disabled>Selecteer API type...</option>
                            {(prices.apiToPostsOptions || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {renderReqCheckbox("cms_eigen", undefined, true, true)}
                {hasReq('cms_eigen') && (
                  <div className="ml-3 pl-7 py-2 border-l-2 border-slate-200 dark:border-white/10 space-y-4">
                    {renderReqCheckbox("eigen_recruitee")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {renderReqCheckbox("onderhoud", undefined, true)}
      {hasReq('onderhoud') && (
        <div className="ml-3 pl-7 py-2 border-l-2 border-slate-200 dark:border-white/10 space-y-4">
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <select
              value={requirementNotes['onderhoud_tier'] || ''}
              onChange={(e) => handleOnderhoudTierChange(e.target.value)}
              className="w-full max-w-xs bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none transition-all dark:text-white shadow-sm cursor-pointer"
            >
              <option value="" disabled>Selecteer pakket...</option>
              <option value="Licht">Licht</option>
              <option value="Gemiddeld">Gemiddeld</option>
              <option value="Sterk">Sterk</option>
            </select>
          </div>
          {renderReqCheckbox("wp_rocket")}
          {renderReqCheckbox("wp_umbrella")}
          {renderReqCheckbox("wp_wordfence")}
          {renderReqCheckbox("wp_wordfence_premium")}
        </div>
      )}
    </div>
  );
};

export default RequirementsEditor;
