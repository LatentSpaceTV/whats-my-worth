/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRightLeft,
  Euro,
  Clock,
  PieChart as PieChartIcon,
  Share2,
  Check,
  Percent
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { 
  calculateBeamter, 
  findEquivalence, 
  findReverseEquivalence,
  LOCATION_OFFSETS, 
  BESOLDUNG_TABLE, 
  ENTGELT_TABLE,
  getBesoldung, 
  findApproximateEntgelt, 
  HOMETOWN_MIETSTUFEN, 
  getStartStep
} from './lib/calculator/index';

import { UI_TEXT } from './constants/ui_text';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'beamterToEmployee' | 'employeeToBeamter';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('beamterToEmployee');
  
  // Beamter specific state
  const [besoldungGroup, setBesoldungGroup] = useState<string>('A13');
  const [besoldungStep, setBesoldungStep] = useState<number>(5);

  // Employee specific state
  const [entgeltKey, setEntgeltKey] = useState<string>('E 13/5');

  const [pkvCost, setPkvCost] = useState<number>(800);
  const [children, setChildren] = useState<number>(0);
  const [location, setLocation] = useState<string>('NRW');
  const [hometown, setHometown] = useState<string>('Standard (Land)');
  const [isMarried, setIsMarried] = useState<boolean>(false);
  const [etfRate, setEtfRate] = useState<number>(6);
  const [customBonus, setCustomBonus] = useState<number>(0);

  // UI State
  const contentRef = useRef<HTMLDivElement>(null);
  const [showShareToast, setShowShareToast] = useState(false);

  // Load state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'beamterToEmployee' || t === 'employeeToBeamter') setActiveTab(t);
    
    const bg = params.get('bg');
    if (bg && BESOLDUNG_TABLE[bg]) setBesoldungGroup(bg);
    
    const bs = params.get('bs');
    if (bs) setBesoldungStep(Number(bs));
    
    const ek = params.get('ek');
    if (ek && ENTGELT_TABLE[ek]) setEntgeltKey(ek);
    
    const pkv = params.get('pkv');
    if (pkv) setPkvCost(Number(pkv));
    
    const ch = params.get('ch');
    if (ch) setChildren(Number(ch));
    
    const loc = params.get('loc');
    if (loc && LOCATION_OFFSETS[loc]) setLocation(loc);
    
    const ht = params.get('ht');
    if (ht && HOMETOWN_MIETSTUFEN[ht]) setHometown(ht);
    
    const m = params.get('m');
    if (m !== null) setIsMarried(m === '1');

    const etf = params.get('etf');
    if (etf) setEtfRate(Number(etf));

    const cb = params.get('cb');
    if (cb) setCustomBonus(Number(cb));
  }, []);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    params.set('bg', besoldungGroup);
    params.set('bs', besoldungStep.toString());
    params.set('ek', entgeltKey);
    params.set('pkv', pkvCost.toString());
    params.set('ch', children.toString());
    params.set('loc', location);
    params.set('ht', hometown);
    params.set('m', isMarried ? '1' : '0');
    params.set('etf', etfRate.toString());
    params.set('cb', customBonus.toString());
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }, [activeTab, besoldungGroup, besoldungStep, entgeltKey, pkvCost, children, location, hometown, isMarried, etfRate, customBonus]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: UI_TEXT.header.title,
        url: url
      }).catch(() => {
        navigator.clipboard.writeText(url);
      });
    } else {
      navigator.clipboard.writeText(url);
    }
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  }, []);

  // Sync steps logic for Beamter
  useEffect(() => {
    const startStep = getStartStep(besoldungGroup);
    const maxSteps = BESOLDUNG_TABLE[besoldungGroup]?.length || 1;
    const maxStep = startStep + maxSteps - 1;
    
    if (besoldungStep < startStep || besoldungStep > maxStep) {
      setBesoldungStep(startStep);
    }
  }, [besoldungGroup]);

  // Combined Results
  const beamterToEmployeeResult = useMemo(() => {
    const gross = getBesoldung(besoldungGroup, besoldungStep);
    const beamterCalc = calculateBeamter(gross, pkvCost, location, children, hometown, isMarried, besoldungGroup, customBonus);
    return findEquivalence(beamterCalc, children, pkvCost, etfRate);
  }, [besoldungGroup, besoldungStep, pkvCost, location, children, hometown, isMarried, etfRate, customBonus]);

  const employeeToBeamterResult = useMemo(() => {
    const gross = ENTGELT_TABLE[entgeltKey] || 0;
    return findReverseEquivalence(gross, pkvCost, children, isMarried, location, hometown, etfRate, customBonus);
  }, [entgeltKey, pkvCost, location, children, hometown, isMarried, etfRate, customBonus]);

  const currentResult = activeTab === 'beamterToEmployee' 
    ? {
        main: beamterToEmployeeResult.result, // employee calculation
        base: calculateBeamter(getBesoldung(besoldungGroup, besoldungStep), pkvCost, location, children, hometown, isMarried, besoldungGroup, customBonus),
        equivLabel: findApproximateEntgelt(beamterToEmployeeResult.requiredGross),
        factor: (beamterToEmployeeResult.requiredGross / getBesoldung(besoldungGroup, besoldungStep)),
        requiredMonthly: beamterToEmployeeResult.requiredGross,
        benefitCost: beamterToEmployeeResult.benefitCost
      }
    : {
        main: employeeToBeamterResult.result, // beamter calculation
        base: employeeToBeamterResult.employeeResult, // employee calculation
        equivLabel: `${employeeToBeamterResult.closestRank.group} • Stufe ${getStartStep(employeeToBeamterResult.closestRank.group) + employeeToBeamterResult.closestRank.step}`,
        factor: (ENTGELT_TABLE[entgeltKey] / employeeToBeamterResult.result.gross),
        requiredMonthly: employeeToBeamterResult.result.gross,
        benefitCost: { bu: employeeToBeamterResult.employeeResult.additionalCosts.bu, pension: employeeToBeamterResult.employeeResult.additionalCosts.privatePension }
      };

  const chartData = [
    {
      name: 'Beamter',
      Netto: Math.round(activeTab === 'beamterToEmployee' ? currentResult.base.disposableIncome : currentResult.main.disposableIncome),
      Steuer: Math.round(activeTab === 'beamterToEmployee' ? currentResult.base.tax : currentResult.main.tax),
      PKV: Math.round(activeTab === 'beamterToEmployee' ? currentResult.base.pkv || 0 : currentResult.main.pkv || 0),
      Sozial: 0,
      Vorsorge: 0,
    },
    {
      name: 'Arbeitnehmer',
      Netto: Math.round(activeTab === 'beamterToEmployee' ? currentResult.main.disposableIncome : currentResult.base.disposableIncome),
      Steuer: Math.round(activeTab === 'beamterToEmployee' ? currentResult.main.tax : currentResult.base.tax),
      PKV: Math.round(activeTab === 'beamterToEmployee' ? currentResult.main.pkv || 0 : currentResult.base.pkv || 0),
      Sozial: Math.round(activeTab === 'beamterToEmployee' ? currentResult.main.social.total : currentResult.base.social.total),
      Vorsorge: Math.round(activeTab === 'beamterToEmployee' ? currentResult.main.additionalCosts.total : currentResult.base.additionalCosts.total),
    },
  ];

  const pieDataCalculationResult = activeTab === 'beamterToEmployee' ? currentResult.main : currentResult.base;
  const pieData = [
    { name: UI_TEXT.results.charts.pieLabels.net, value: Math.round(pieDataCalculationResult.disposableIncome), color: '#4F46E5' },
    { name: UI_TEXT.results.charts.pieLabels.social, value: Math.round(pieDataCalculationResult.social.total), color: '#3B82F6' },
    { name: UI_TEXT.results.charts.pieLabels.tax, value: Math.round(pieDataCalculationResult.tax), color: '#E2E8F0' },
    { name: UI_TEXT.results.charts.pieLabels.pkv, value: Math.round(pieDataCalculationResult.pkv || 0), color: '#F43F5E' },
    { name: UI_TEXT.results.charts.pieLabels.pension, value: Math.round(pieDataCalculationResult.additionalCosts.total), color: '#10B981' },
  ];

  const formatEuro = (val: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-100 relative">
      <AnimatePresence>
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
            <span className="text-sm font-bold uppercase tracking-widest leading-none">Link kopiert!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={contentRef} className="flex flex-col flex-1">
        {/* Header Section */}
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 underline decoration-indigo-500 decoration-4 underline-offset-4">{UI_TEXT.header.title}</h1>
            <p className="text-slate-500 mt-1 text-sm italic font-medium tracking-wide uppercase">{UI_TEXT.header.subtitle}</p>
          </div>
          
          {/* Enhanced Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-[20px] flex gap-2 border border-slate-200 shadow-inner">
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
                {UI_TEXT.header.tabs[tab]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 grid grid-cols-12 gap-8 max-w-7xl mx-auto w-full mb-12">
        {/* Left Column: Input & Base Comparison */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <div className="bg-white p-6 md:p-7 rounded-2xl shadow-sm border border-slate-200 lg:flex-1">
            <div className="space-y-8">
              {/* Position Section */}
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Calculator size={14} className="text-indigo-500" /> {UI_TEXT.form.sections.position}
                </h4>
                <div className="space-y-4">
                  {activeTab === 'beamterToEmployee' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.besoldungGroup}</label>
                        <select 
                          value={besoldungGroup}
                          onChange={(e) => setBesoldungGroup(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
                        >
                          {Object.keys(BESOLDUNG_TABLE).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.step}</label>
                        <select 
                          value={besoldungStep}
                          onChange={(e) => setBesoldungStep(Number(e.target.value))}
                          disabled={BESOLDUNG_TABLE[besoldungGroup]?.length === 1}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {(BESOLDUNG_TABLE[besoldungGroup] || []).map((_, i) => {
                            const stepValue = getStartStep(besoldungGroup) + i;
                            return (
                              <option key={stepValue} value={stepValue}>{UI_TEXT.form.stepLabel} {stepValue}</option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.entgeltGroup}</label>
                      <select 
                        value={entgeltKey}
                        onChange={(e) => setEntgeltKey(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
                      >
                        {Object.keys(ENTGELT_TABLE).sort().map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.employer}</label>
                      <select 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
                      >
                        {Object.keys(LOCATION_OFFSETS).map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.mietstufe}</label>
                      <select 
                        value={hometown}
                        onChange={(e) => setHometown(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
                      >
                        {Object.keys(HOMETOWN_MIETSTUFEN).map(town => <option key={town} value={town}>{town}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.maritalStatus}</label>
                      <select 
                        value={isMarried ? 'married' : 'single'}
                        onChange={(e) => setIsMarried(e.target.value === 'married')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
                      >
                        <option value="married">{UI_TEXT.form.maritalOptions.married}</option>
                        <option value="single">{UI_TEXT.form.maritalOptions.single}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.children}</label>
                      <select 
                        value={children}
                        onChange={(e) => setChildren(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-medium"
                      >
                        {[0, 1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} {UI_TEXT.form.childrenLabel}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.customBonusLabel}</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={customBonus}
                        onChange={(e) => setCustomBonus(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium"
                      />
                      <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Health Section */}
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-500" /> {UI_TEXT.form.sections.health}
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.pkvLabel}</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={pkvCost}
                      onChange={(e) => setPkvCost(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium"
                    />
                    <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </section>

              {/* Retirement Section */}
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" /> {UI_TEXT.form.sections.retirement}
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{UI_TEXT.form.etfRateLabel}</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={etfRate}
                      step="0.5"
                      onChange={(e) => setEtfRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium"
                    />
                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>{activeTab === 'beamterToEmployee' ? 'Grundgehalt' : 'Brutto'}</span>
                <span className="font-bold text-slate-900">{formatEuro(activeTab === 'beamterToEmployee' ? currentResult.base.baseGross : currentResult.base.gross)}</span>
              </div>
              
              {activeTab === 'beamterToEmployee' && (
                <>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>Zulagen</span>
                    <span className="font-bold text-emerald-600">+ {formatEuro(currentResult.base.bonuses.total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-50">
                    <span className="font-bold text-slate-500">Gesamt-Brutto</span>
                    <span className="font-black text-slate-900">{formatEuro(currentResult.base.gross)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>Abzug PKV</span>
                <span className="font-bold text-red-500">- {formatEuro(currentResult.base.pkv || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-indigo-100 mt-2">
                <span className="text-sm font-black uppercase tracking-widest text-indigo-600">{UI_TEXT.form.breakdown.disposableIncome}</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{formatEuro(currentResult.base.disposableIncome)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Result Hero & Charts */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          {/* The Big Number Hero */}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-indigo-900 rounded-[32px] p-10 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-2xl shadow-indigo-200/50 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <p className="text-indigo-200 text-sm font-bold uppercase tracking-[0.2em] mb-3">
                {activeTab === 'beamterToEmployee' ? UI_TEXT.results.hero.title : 'Benötigtes Äquivalent (Beamter)'}
              </p>
              <h3 className="text-5xl md:text-7xl font-black mt-2 tracking-tighter">
                {new Intl.NumberFormat('de-DE').format(Math.round(currentResult.requiredMonthly * 12))} € 
                <span className="text-2xl md:text-3xl font-light text-indigo-300 ml-2">{UI_TEXT.results.hero.yearSuffix}</span>
              </h3>
              <div className="flex items-center gap-4 mt-6">
                <p className="text-indigo-200/80 text-sm max-w-xs leading-relaxed font-medium italic">
                  {UI_TEXT.results.hero.description}
                </p>
              </div>
            </div>
            <div className="mt-8 sm:mt-0 relative z-10 flex flex-col gap-4">
              <div className="bg-white/10 hover:bg-white/20 transition-all rounded-3xl px-6 py-4 backdrop-blur-md border border-white/10 text-center min-w-[180px]">
                <div className="text-[10px] uppercase font-black text-indigo-200 tracking-widest">
                  {activeTab === 'beamterToEmployee' ? UI_TEXT.results.hero.entgeltGroupLabel : 'Besoldungsgruppe'}
                </div>
                <div className="text-2xl font-black">{currentResult.equivLabel}</div>
                <div className="text-[8px] text-indigo-300 uppercase font-bold mt-1 text-center">
                  {activeTab === 'beamterToEmployee' ? UI_TEXT.results.hero.entgeltGroupSource : '(NRW)'}
                </div>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          </motion.div>

          {/* Visualization Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pie Chart Card */}
            <div className="bg-white p-7 rounded-[24px] border border-slate-200 shadow-sm flex flex-col">
              <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2 uppercase tracking-wider">
                <PieChartIcon size={16} className="text-indigo-600" /> {UI_TEXT.results.charts.distributionTitle}
              </h4>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}
                      formatter={(value) => formatEuro(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 rounded-full h-2 shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Bar Chart */}
            <div className="bg-white p-7 rounded-[24px] border border-slate-200 shadow-sm flex flex-col">
                <h4 className="font-bold text-slate-800 text-sm mb-6 flex items-center gap-2 uppercase tracking-wider">
                    <ArrowRightLeft size={16} className="text-indigo-600" /> {UI_TEXT.results.charts.structureTitle}
                </h4>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" hide />
                            <Tooltip formatter={(value) => formatEuro(Number(value))} />
                            <Bar dataKey="Netto" fill="#4F46E5" stackId="a" />
                            <Bar dataKey="Sozial" fill="#3B82F6" stackId="a" />
                            <Bar dataKey="PKV" fill="#F43F5E" stackId="a" />
                            <Bar dataKey="Vorsorge" fill="#10B981" stackId="a" />
                            <Bar dataKey="Steuer" fill="#E2E8F0" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between px-2">
                    <div className="text-center">
                        <div className="text-[10px] font-black text-slate-400 mb-1">{UI_TEXT.results.charts.structureLegend.beamter}</div>
                        <div className="text-sm font-bold text-indigo-600">
                          {formatEuro(activeTab === 'beamterToEmployee' ? currentResult.base.gross : currentResult.main.gross)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] font-black text-slate-400 mb-1">{UI_TEXT.results.charts.structureLegend.employee}</div>
                        <div className="text-sm font-bold text-slate-900">
                           {formatEuro(activeTab === 'beamterToEmployee' ? currentResult.main.gross : currentResult.base.gross)}
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                <Clock size={16} className="text-indigo-600" /> {UI_TEXT.results.table.title}
              </h4>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">{UI_TEXT.results.table.subtitle}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[600px] md:min-w-0">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 md:px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest leading-loose">{UI_TEXT.results.table.columns.category}</th>
                    <th className="px-6 md:px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">{UI_TEXT.results.table.columns.beamter}</th>
                    <th className="px-6 md:px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">{UI_TEXT.results.table.columns.employee}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  <tr>
                    <td className="px-6 md:px-8 py-5 text-slate-600">{UI_TEXT.results.table.rows.pension.label}</td>
                    <td className="px-6 md:px-8 py-5 text-emerald-600 font-bold">{UI_TEXT.results.table.rows.pension.beamter} <span className="text-[10px] font-medium block">{UI_TEXT.results.table.rows.pension.beamterSub}</span></td>
                    <td className="px-6 md:px-8 py-5 text-red-500 font-bold">+ {formatEuro(currentResult.benefitCost.pension)} <span className="text-[10px] font-medium text-slate-400 block">{UI_TEXT.results.table.rows.pension.employeeSub}</span></td>
                  </tr>
                  <tr>
                    <td className="px-6 md:px-8 py-5 text-slate-600">{UI_TEXT.results.table.rows.health.label}</td>
                    <td className="px-6 md:px-8 py-5 text-red-500 font-bold">
                      - {formatEuro((activeTab === 'beamterToEmployee' ? currentResult.base.pkv : currentResult.main.pkv) || 0)} 
                      <span className="text-[10px] font-medium text-slate-400 block">{children >= 2 ? UI_TEXT.results.table.rows.health.beamterSub30 : UI_TEXT.results.table.rows.health.beamterSub50}</span>
                    </td>
                    <td className="px-6 md:px-8 py-5 text-red-500 font-bold">
                      - {formatEuro((activeTab === 'beamterToEmployee' ? currentResult.main.pkv : currentResult.base.pkv) || 0)} 
                      <span className="text-[10px] font-medium text-slate-400 block">{UI_TEXT.results.table.rows.health.employeeSub}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 md:px-8 py-5 text-slate-600">{UI_TEXT.results.table.rows.bu.label}</td>
                    <td className="px-6 md:px-8 py-5 text-emerald-600 font-bold">{UI_TEXT.results.table.rows.bu.beamter} <span className="text-[10px] font-medium block">{UI_TEXT.results.table.rows.bu.beamterSub}</span></td>
                    <td className="px-6 md:px-8 py-5 text-red-500 font-bold">+ {formatEuro(currentResult.benefitCost.bu)} <span className="text-[10px] font-medium text-slate-400 block">{UI_TEXT.results.table.rows.bu.employeeSub}</span></td>
                  </tr>
                  <tr>
                    <td className="px-6 md:px-8 py-5 text-slate-900 font-bold">{UI_TEXT.results.table.rows.disposable.label}</td>
                    <td className="px-6 md:px-8 py-5 font-black text-slate-900 border-l-4 border-indigo-500 pl-7">
                      {formatEuro(activeTab === 'beamterToEmployee' ? currentResult.base.disposableIncome : currentResult.main.disposableIncome)}
                    </td>
                    <td className="px-6 md:px-8 py-5 font-black text-slate-900 border-l-4 border-slate-200 pl-7">
                      {formatEuro(activeTab === 'beamterToEmployee' ? currentResult.main.disposableIncome : currentResult.base.disposableIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto px-8 py-10 bg-slate-100 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-10 max-w-7xl mx-auto w-full relative">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-900/10">
            <Calculator size={22} />
          </div>
          <p className="text-[11px] text-slate-500 max-w-3xl font-medium leading-relaxed italic">
            {UI_TEXT.footer.disclaimer.replace('{location}', location)}
          </p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
            <button 
              onClick={handleShare}
              className="bg-indigo-600 text-white px-12 py-3.5 rounded-[18px] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 grow text-center flex items-center justify-center gap-2"
            >
              <Share2 size={16} />
              {UI_TEXT.footer.shareButton}
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Build v1.2.4</span>
        </div>
      </footer>
    </div>
  </div>
  );
}
