/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Share2,
  Check,
  Info
} from 'lucide-react';
import { 
  HOMETOWN_MIETSTUFEN, 
} from '../backend/data/beamte';
import { BESOLDUNG_TABLE } from '../backend/data/beamte';
import { ENTGELT_TABLE } from '../backend/data/employee';
import { getStartStep } from '../backend/calculators/beamte';
import { PKV_PLAN_COSTS } from '../backend/data/pkv';
import { PKVPlan } from './components/pkvTypes';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tabs
import { BeamterToEmployeeTab } from './components/tabs/beamterToEmployee';
import { EmployeeToBeamterTab } from './components/tabs/employeeToBeamter';
import { CareerPathTab } from './components/tabs/careerPath';

import { TranslationProvider, useTranslation } from './lib/i18n';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'beamterToEmployee' | 'employeeToBeamter';

function AppContent() {
  const { t, language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('beamterToEmployee');
  
  // Beamter specific state
  const [besoldungGroup, setBesoldungGroup] = useState<string>('A13');
  const [besoldungStep, setBesoldungStep] = useState<number>(5);

  // Employee specific state
  const [entgeltGroup, setEntgeltGroup] = useState<string>('E 13');
  const [entgeltStep, setEntgeltStep] = useState<number>(5);
  const [employeeGrossType, setEmployeeGrossType] = useState<'custom' | 'tarif'>('custom');
  const [customEmployeeGross, setCustomEmployeeGross] = useState<number>(5000);

  // PKV selection state
  const [pkvPlan, setPkvPlan] = useState<PKVPlan>('standard');
  const [customPkvAdult, setCustomPkvAdult] = useState<number>(650);
  const [customPflegeAdult, setCustomPflegeAdult] = useState<number>(75);
  const [customPkvKid, setCustomPkvKid] = useState<number>(220);
  const [customPflegeKid, setCustomPflegeKid] = useState<number>(15);

  const [children, setChildren] = useState<number>(0);
  const [location, setLocation] = useState<string>('NRW');
  const [hometown, setHometown] = useState<string>('Standard (Land)');
  const [isMarried, setIsMarried] = useState<boolean>(false);
  const [etfRate, setEtfRate] = useState<number>(6);
  const [customBonus, setCustomBonus] = useState<number>(0);
  const [companyPension, setCompanyPension] = useState<number>(0);

  // Derived PKV Cost
  const pkvCostBreakdown = useMemo(() => {
    if (pkvPlan === 'individual') {
      return {
        health: customPkvAdult + (children * customPkvKid),
        care: customPflegeAdult + (children * customPflegeKid)
      };
    }
    const costs = PKV_PLAN_COSTS[pkvPlan];
    return {
      health: costs.adult_pkv + (children * costs.kid_pkv),
      care: costs.adult_pflege + (children * costs.kid_pflege)
    };
  }, [pkvPlan, customPkvAdult, customPflegeAdult, customPkvKid, customPflegeKid, children]);

  const pkvCost = pkvCostBreakdown.health + pkvCostBreakdown.care;

  const [showShareToast, setShowShareToast] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  // Load state from URL on mount
  useEffect(() => {
    // Check if welcome message was already dismissed
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome_v1');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'beamterToEmployee' || tabParam === 'employeeToBeamter') setActiveTab(tabParam as TabType);
    
    const bg = params.get('bg');
    if (bg && BESOLDUNG_TABLE[bg]) setBesoldungGroup(bg);
    
    const bs = params.get('bs');
    if (bs) setBesoldungStep(Number(bs));
    
    const eg = params.get('eg');
    if (eg && ENTGELT_TABLE[eg]) setEntgeltGroup(eg);
    
    const es = params.get('es');
    if (es) setEntgeltStep(Number(es));

    const egt = params.get('egt');
    if (egt === 'custom' || egt === 'tarif') setEmployeeGrossType(egt as 'custom' | 'tarif');

    const egr = params.get('egr');
    if (egr) setCustomEmployeeGross(Number(egr));
    
    // PKV params
    const plan = params.get('plan');
    if (plan && ['basis', 'standard', 'premium', 'individual', 'voluntaryGkv'].includes(plan)) setPkvPlan(plan as PKVPlan);
    
    const cpkvA = params.get('cpkvA');
    if (cpkvA) setCustomPkvAdult(Number(cpkvA));

    const cpvA = params.get('cpvA');
    if (cpvA) setCustomPflegeAdult(Number(cpvA));

    const cpkvK = params.get('cpkvK');
    if (cpkvK) setCustomPkvKid(Number(cpkvK));

    const cpvK = params.get('cpvK');
    if (cpvK) setCustomPflegeKid(Number(cpvK));
    
    const ch = params.get('ch');
    if (ch) setChildren(Number(ch));
    
    const loc = params.get('loc');
    if (loc) setLocation(loc);
    
    const ht = params.get('ht');
    if (ht && HOMETOWN_MIETSTUFEN[ht]) setHometown(ht);
    
    const m = params.get('m');
    if (m !== null) setIsMarried(m === '1');

    const etf = params.get('etf');
    if (etf) setEtfRate(Number(etf));

    const cb = params.get('cb');
    if (cb) setCustomBonus(Number(cb));

    const cp = params.get('cp');
    if (cp) setCompanyPension(Number(cp));
  }, []);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('bg', besoldungGroup);
    params.set('bs', besoldungStep.toString());
    params.set('eg', entgeltGroup);
    params.set('es', entgeltStep.toString());
    params.set('egt', employeeGrossType);
    params.set('egr', customEmployeeGross.toString());
    params.set('plan', pkvPlan);
    params.set('cpkvA', customPkvAdult.toString());
    params.set('cpvA', customPflegeAdult.toString());
    params.set('cpkvK', customPkvKid.toString());
    params.set('cpvK', customPflegeKid.toString());
    params.set('ch', children.toString());
    params.set('loc', location);
    params.set('ht', hometown);
    params.set('m', isMarried ? '1' : '0');
    params.set('etf', etfRate.toString());
    params.set('cb', customBonus.toString());
    params.set('cp', companyPension.toString());
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }, [activeTab, besoldungGroup, besoldungStep, entgeltGroup, entgeltStep, employeeGrossType, customEmployeeGross, pkvPlan, customPkvAdult, customPflegeAdult, customPkvKid, customPflegeKid, children, location, hometown, isMarried, etfRate, customBonus, companyPension]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: t('header.title'),
        url: url
      }).catch(() => {
        navigator.clipboard.writeText(url);
      });
    } else {
      navigator.clipboard.writeText(url);
    }
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  }, [t]);

  // Sync steps logic for Beamter
  useEffect(() => {
    const startStep = getStartStep(besoldungGroup);
    const maxSteps = BESOLDUNG_TABLE[besoldungGroup]?.length || 1;
    const maxStep = startStep + maxSteps - 1;
    
    if (besoldungStep < startStep || besoldungStep > maxStep) {
      setBesoldungStep(startStep);
    }
  }, [besoldungGroup]);

  const sharedProps = {
    besoldungGroup, setBesoldungGroup,
    besoldungStep, setBesoldungStep,
    entgeltGroup, setEntgeltGroup,
    entgeltStep, setEntgeltStep,
    employeeGrossType, setEmployeeGrossType,
    customEmployeeGross, setCustomEmployeeGross,
    pkvPlan, setPkvPlan,
    customPkvAdult, setCustomPkvAdult,
    customPflegeAdult, setCustomPflegeAdult,
    customPkvKid, setCustomPkvKid,
    customPflegeKid, setCustomPflegeKid,
    pkvCost,
    pkvCostBreakdown,
    children, setChildren,
    location, setLocation,
    hometown, setHometown,
    isMarried, setIsMarried,
    etfRate, setEtfRate,
    customBonus, setCustomBonus,
    companyPension, setCompanyPension,
  };

  const handleDismissWelcome = () => {
    localStorage.setItem('hasSeenWelcome_v1', 'true');
    setShowWelcome(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-100 relative">
      <AnimatePresence>
        {showLegal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowLegal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative scrollbar-hide"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setShowLegal(false)}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors shadow-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5L5 15M5 5l10 10"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-10">
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">{t('legal.title')}</h2>
                  <div className="h-1.5 w-20 bg-indigo-600 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">{t('legal.operator')}</h3>
                    <div className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-5 rounded-3xl border border-slate-100 italic">
                      Maximilian Schmidt FinTech e.K.<br />
                      Rheinstraße 15b<br />
                      50676 Köln, Deutschland
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">{t('legal.contact')}</h3>
                    <div className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-5 rounded-3xl border border-slate-100 italic">
                      Email: kontakt@schmidt-finanzrechner.de<br />
                      Web: www.schmidt-finanzrechner.de
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">{t('legal.disclaimerTitle')}</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    {t('legal.disclaimerText')}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest">{t('legal.privacyTitle')}</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    {t('legal.privacyText')}
                  </p>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setShowLegal(false)}
                  className="bg-slate-900 text-white px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                >
                  {t('welcome.cta')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] p-8 md:p-10 max-w-lg w-full shadow-2xl relative overflow-hidden ring-1 ring-black/5"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-indigo-600" />
              
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
                  <Info size={32} strokeWidth={1.5} />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    {t('welcome.title')}
                  </h2>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    {t('welcome.message')}
                  </p>
                </div>

                <button 
                  onClick={handleDismissWelcome}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200"
                >
                  {t('welcome.cta')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10"
          >
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest leading-none">{t('shareToast')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1">
        {/* Header Section */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col md:flex-row justify-between items-center max-w-[1600px] 2xl:max-w-screen-2xl mx-auto w-full gap-4 sm:gap-6">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 underline decoration-indigo-500 decoration-4 underline-offset-4">{t('header.title')}</h1>
              <p className="text-slate-500 mt-1 text-xs sm:text-sm italic font-medium tracking-wide uppercase">{t('header.subtitle')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Language Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-fit">
                <button 
                  onClick={() => setLanguage('de')}
                  className={cn(
                    "px-2 py-1 rounded-lg text-lg flex items-center justify-center transition-all duration-200",
                    language === 'de' ? "bg-white shadow-sm scale-110" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                  )}
                  title="Deutsch"
                >
                  🇩🇪
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-2 py-1 rounded-lg text-lg flex items-center justify-center transition-all duration-200",
                    language === 'en' ? "bg-white shadow-sm scale-110" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                  )}
                  title="English"
                >
                  🇬🇧
                </button>
              </div>

              {/* Enhanced Tabs */}
              <div className="bg-slate-100 p-1.5 rounded-[20px] flex gap-2 border border-slate-200 shadow-inner overflow-x-auto max-w-[calc(100vw-2rem)]">
                {(['beamterToEmployee', 'employeeToBeamter'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-6 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-widest transition-all duration-300",
                      activeTab === tab 
                        ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100 border border-slate-200" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {t(`header.tabs.${tab}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'beamterToEmployee' && <BeamterToEmployeeTab {...sharedProps} />}
        {activeTab === 'employeeToBeamter' && <EmployeeToBeamterTab {...sharedProps} />}

        <footer className="mt-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-slate-100 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 max-w-[1600px] 2xl:max-w-screen-2xl mx-auto w-full relative">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-900/10">
              <Calculator size={22} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-slate-500 max-w-3xl font-medium leading-relaxed italic">
                {t('footer.disclaimer', { location })}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
              <button 
                onClick={handleShare}
                className="bg-indigo-600 text-white px-12 py-3.5 rounded-[18px] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 grow text-center flex items-center justify-center gap-2"
              >
                <Share2 size={16} />
                {t('footer.shareButton')}
              </button>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowLegal(true)}
                  className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold uppercase tracking-wider transition-colors"
                >
                  {t('footer.legal')}
                </button>
                <span className="text-[10px] font-bold text-slate-300">|</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Build v1.2.6</span>
              </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TranslationProvider>
      <AppContent />
    </TranslationProvider>
  );
}
