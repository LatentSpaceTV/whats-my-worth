import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Euro,
  Clock,
  Percent
} from 'lucide-react';
import { 
  calculateBeamter, 
  getStartStep,
} from '../../../backend/calculators/beamte';
import { findReverseEquivalence } from '../../../backend/simulation/equivalence';
import { 
  ENTGELT_TABLE,
} from '../../../backend/data/employee';
import {
  HOMETOWN_MIETSTUFEN, 
} from '../../../backend/data/beamte';
import { BESOLDUNG_TABLE } from '../../../backend/data/beamte';
import { PKV_PLAN_COSTS } from '../../../backend/data/pkv';
import { useTranslation } from '../../lib/i18n';
import { formatEuro } from '../../utils/formatters';
import { SharedStateProps } from '../pkvTypes';
import { TabLayout } from '../layout/tabLayout';
import { calculatePKVBreakdown } from '../../../backend/calculators/pkv';

import { PKVSelection } from '../pkv/pkvSelection';

function interpolateColor(
  value: number,
  min: number = 0,
  max: number = 1000
): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  // Clamp value
  const range = max - min;
  const t = range <= 0 ? 0 : Math.max(0, Math.min(1, (value - min) / range));

  // Hue: 145° (emerald green) -> 350° (rose red)
  const hue = 145 + t * (350 - 145);

  // Make close matches darker and stronger
  const lightness = 60 - t * 20;
  const saturation = 70;

  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    borderColor: `hsl(${hue}, ${saturation}%, ${lightness - 5}%)`,
    color: lightness < 50 ? "#fff" : "#1f2937",
  };
}

/**
 * Calculation tab for users switching from Employee (Arbeitnehmer) to Civil Servant (Beamter).
 * It finds the closest Besoldung grade (grade and step) that matches the user's current
 * employee disposable income, considering the structural differences in taxes and social security.
 */
export const EmployeeToBeamterTab: React.FC<SharedStateProps> = (props) => {
  const { t } = useTranslation();
  const {
    entgeltGroup, setEntgeltGroup,
    entgeltStep, setEntgeltStep,
    employeeGrossType, setEmployeeGrossType,
    customEmployeeGross, setCustomEmployeeGross,
    pkvCostBreakdown,
    pkvPlan,
    customPkvAdult,
    customPflegeAdult,
    customPkvKid,
    customPflegeKid,
    children, setChildren,
    location, setLocation,
    hometown, setHometown,
    isMarried, setIsMarried,
    etfRate, setEtfRate,
    customBonus, setCustomBonus,
    companyPension, setCompanyPension,
  } = props;

  const employeeToBeamterResult = useMemo(() => {
    const steps = ENTGELT_TABLE[entgeltGroup];
    const baseGross = steps ? (steps[entgeltStep] || steps[Object.keys(steps).length]) : 0;
    const gross = employeeGrossType === 'custom' ? customEmployeeGross : baseGross;
    
    let pkvAdultHealth = 0;
    let pkvKidHealth = 0;
    let pkvAdultCare = 0;
    let pkvKidCare = 0;

    if (pkvPlan === 'individual') {
      pkvAdultHealth = customPkvAdult;
      pkvKidHealth = customPkvKid;
      pkvAdultCare = customPflegeAdult;
      pkvKidCare = customPflegeKid;
    } else {
      const costs = PKV_PLAN_COSTS[pkvPlan as keyof typeof PKV_PLAN_COSTS] || PKV_PLAN_COSTS.standard;
      pkvAdultHealth = costs.adult_pkv;
      pkvKidHealth = costs.kid_pkv;
      pkvAdultCare = costs.adult_pflege;
      pkvKidCare = costs.kid_pflege;
    }

    return findReverseEquivalence(
      gross, 
      pkvAdultHealth, 
      pkvKidHealth, 
      children, 
      isMarried, 
      location, 
      hometown, 
      etfRate, 
      customBonus, 
      companyPension, 
      pkvAdultCare, 
      pkvKidCare
    );
  }, [
    entgeltGroup, entgeltStep, employeeGrossType, customEmployeeGross, children, isMarried, location, hometown, etfRate, 
    customBonus, companyPension, pkvPlan, customPkvAdult, customPkvKid, customPflegeAdult, customPflegeKid
  ]);

  const pkvBreakdown = useMemo(() => calculatePKVBreakdown(pkvPlan, children, { 
    adultPkv: customPkvAdult, 
    adultPflege: customPflegeAdult, 
    kidPkv: customPkvKid, 
    kidPflege: customPflegeKid 
  }), [pkvPlan, children, customPkvAdult, customPflegeAdult, customPkvKid, customPflegeKid]);

  const currentResult = {
    main: employeeToBeamterResult.result, // beamter calculation
    base: employeeToBeamterResult.employeeResult, // employee calculation
    equivLabel: `${employeeToBeamterResult.closestRank.group} • Stufe ${getStartStep(employeeToBeamterResult.closestRank.group) + employeeToBeamterResult.closestRank.step}`,
    requiredMonthly: employeeToBeamterResult.result.gross,
    benefitCost: { bu: employeeToBeamterResult.employeeResult.additionalCosts.bu, pension: employeeToBeamterResult.employeeResult.additionalCosts.privatePension }
  };

  const groupsToDisplay = useMemo(() => ['A16', 'A15', 'A14', 'A13', 'A12', 'A11', 'A10', 'A9', 'A8', 'A7', 'A6', 'A5'], []);
  const stepsToDisplay = useMemo(() => [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], []);

  const bestMatchGroup = employeeToBeamterResult.closestRank.group;
  const bestMatchStep = getStartStep(bestMatchGroup) + employeeToBeamterResult.closestRank.step;

  const [selectedCell, setSelectedCell] = useState<{ group: string; step: number } | null>(null);

  useEffect(() => {
    setSelectedCell({ group: bestMatchGroup, step: bestMatchStep });
  }, [bestMatchGroup, bestMatchStep]);

  const heatmapData = useMemo(() => {
    let pkvAdultHealth = 0;
    let pkvKidHealth = 0;
    let pkvAdultCare = 0;
    let pkvKidCare = 0;

    if (pkvPlan === 'individual') {
      pkvAdultHealth = customPkvAdult;
      pkvKidHealth = customPkvKid;
      pkvAdultCare = customPflegeAdult;
      pkvKidCare = customPflegeKid;
    } else {
      const costs = PKV_PLAN_COSTS[pkvPlan as keyof typeof PKV_PLAN_COSTS] || PKV_PLAN_COSTS.standard;
      pkvAdultHealth = costs.adult_pkv;
      pkvKidHealth = costs.kid_pkv;
      pkvAdultCare = costs.adult_pflege;
      pkvKidCare = costs.kid_pflege;
    }

    const gridCells: Record<string, Record<number, {
      available: boolean;
      baseGross: number;
      gross: number;
      net: number;
      disposable: number;
      diff: number;
      tax: number;
      bonuses: { familie: number; total: number };
      pkv: number;
      pkvPv: number;
    }>> = {};

    for (const group of groupsToDisplay) {
      gridCells[group] = {};
      const startStep = getStartStep(group);
      const groupData = BESOLDUNG_TABLE[group];
      
      for (const step of stepsToDisplay) {
        const index = step - startStep;
        if (index >= 0 && index < groupData.length) {
          const baseGross = groupData[index];
          const result = calculateBeamter(
            baseGross,
            pkvAdultHealth,
            pkvKidHealth,
            location,
            children,
            hometown,
            isMarried,
            group,
            customBonus,
            pkvAdultCare,
            pkvKidCare
          );
          const diff = result.disposableIncome - currentResult.base.disposableIncome;

          gridCells[group][step] = {
            available: true,
            baseGross,
            gross: result.gross,
            net: result.net,
            disposable: result.disposableIncome,
            diff,
            tax: result.tax,
            bonuses: result.bonuses,
            pkv: result.pkv,
            pkvPv: result.pkvPv,
          };
        } else {
          gridCells[group][step] = {
            available: false,
            baseGross: 0,
            gross: 0,
            net: 0,
            disposable: 0,
            diff: 0,
            tax: 0,
            bonuses: { familie: 0, total: 0 },
            pkv: 0,
            pkvPv: 0,
          };
        }
      }
    }

    return gridCells;
  }, [
    hometown, pkvPlan, customPkvAdult, customPkvKid, customPflegeAdult, customPflegeKid,
    location, children, isMarried, customBonus, currentResult.base.disposableIncome,
    groupsToDisplay, stepsToDisplay
  ]);

  const { minAbsDiff, maxAbsDiff } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let hasData = false;
    for (const group of groupsToDisplay) {
      for (const step of stepsToDisplay) {
        const cell = heatmapData[group]?.[step];
        if (cell && cell.available) {
          const absDiff = Math.abs(cell.diff);
          if (absDiff < min) min = absDiff;
          if (absDiff > max) max = absDiff;
          hasData = true;
        }
      }
    }
    return {
      minAbsDiff: hasData ? min : 0,
      maxAbsDiff: hasData ? max : 1000
    };
  }, [heatmapData, groupsToDisplay, stepsToDisplay]);

  const steps = ENTGELT_TABLE[entgeltGroup];
  const baseGross = steps ? (steps[entgeltStep] || steps[Object.keys(steps).length]) : 0;
  const currentGross = employeeGrossType === 'custom' ? customEmployeeGross : baseGross;



  const leftColumn = (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 lg:flex-1 hover:shadow-md transition-shadow">
      <div className="space-y-5">
        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calculator size={14} className="text-indigo-500" /> {t('form.sections.position')}
          </h4>
          <div className="space-y-3">
            {/* Input Type Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-0.5">
              <button
                type="button"
                onClick={() => setEmployeeGrossType('custom')}
                className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  employeeGrossType === 'custom'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Gehaltseingabe Brutto
              </button>
              <button
                type="button"
                onClick={() => setEmployeeGrossType('tarif')}
                className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  employeeGrossType === 'tarif'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                TV-L Eingruppierung
              </button>
            </div>

            {employeeGrossType === 'custom' ? (
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase leading-none mb-1">
                  Bruttogehalt (Monatlich)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">€</span>
                  <input
                    type="number"
                    value={customEmployeeGross}
                    onChange={(e) => setCustomEmployeeGross(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm font-black text-slate-800"
                    placeholder="e.g. 5000"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.entgeltGroup')}</label>
                  <select 
                    value={entgeltGroup}
                    onChange={(e) => setEntgeltGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                  >
                    {Object.keys(ENTGELT_TABLE).sort().map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.step')}</label>
                  <select 
                    value={entgeltStep}
                    onChange={(e) => setEntgeltStep(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                  >
                    {ENTGELT_TABLE[entgeltGroup] && Object.keys(ENTGELT_TABLE[entgeltGroup]).map(s => (
                      <option key={s} value={s}>Stufe {s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.employer')}</label>
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                >
                  {['Bund', 'NRW'].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.mietstufe')}</label>
                <select 
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                >
                  {Object.keys(HOMETOWN_MIETSTUFEN).map(town => <option key={town} value={town}>{town}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.maritalStatus')}</label>
                <select 
                  value={isMarried ? 'married' : 'single'}
                  onChange={(e) => setIsMarried(e.target.value === 'married')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                >
                  <option value="married">{t('form.maritalOptions.married')}</option>
                  <option value="single">{t('form.maritalOptions.single')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.children')}</label>
                <select 
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                >
                  {[0, 1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} {t('form.childrenLabel')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.customBonusLabel')}</label>
              <div className="relative">
                <input 
                  type="number"
                  value={customBonus}
                  onChange={(e) => setCustomBonus(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                />
                <Euro size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> {t('form.sections.health')}
          </h4>
          <PKVSelection {...props} />
        </section>

        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-500" /> {t('form.sections.retirement')}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.etfRateLabel')}</label>
              <div className="relative">
                <input 
                  type="number"
                  value={etfRate}
                  step="0.5"
                  onChange={(e) => setEtfRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                />
                <Percent size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('form.companyPensionLabel')}</label>
              <div className="relative">
                <input 
                  type="number"
                  value={companyPension}
                  onChange={(e) => setCompanyPension(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                />
                <Euro size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const rightColumn = (
    <>
      <motion.div 
        key="employeeToBeamterResult"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-indigo-900 rounded-[32px] p-6 sm:p-10 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-2xl shadow-indigo-200/50 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <p className="text-indigo-200 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] mb-3">
            {t('results.hero.titleBeamter')}
          </p>
          <h3 className="text-4xl sm:text-5xl md:text-7xl font-black mt-2 tracking-tighter">
            {new Intl.NumberFormat('de-DE').format(Math.round(currentResult.requiredMonthly * 12))} € 
            <span className="text-2xl md:text-3xl font-light text-indigo-300 ml-2">{t('results.hero.yearSuffix')}</span>
          </h3>
          <div className="flex items-center gap-4 mt-6">
            <p className="text-indigo-200/80 text-sm max-w-xs leading-relaxed font-medium italic">
              {t('results.hero.description')}
            </p>
          </div>
        </div>
        <div className="mt-8 sm:mt-0 relative z-10 flex flex-col gap-4">
          <div className="bg-white/10 hover:bg-white/20 transition-all rounded-3xl px-6 py-4 backdrop-blur-md border border-white/10 text-center min-w-[180px]">
            <div className="text-[10px] uppercase font-black text-indigo-200 tracking-widest">
              Besoldungsgruppe
            </div>
            <div className="text-2xl font-black">{currentResult.equivLabel}</div>
            <div className="text-[8px] text-indigo-300 uppercase font-bold mt-1 text-center">
              (NRW)
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
      </motion.div>



      {/* Heatmap Section */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <Calculator size={18} className="text-indigo-600" /> {t('results.heatmap.title')}
          </h4>
          <p className="text-slate-500 text-[11px] mt-1 leading-normal">
            {t('results.heatmap.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Heatmap Grid on Left */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-inner bg-slate-50/20 p-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-1 border border-slate-100 text-[9px] font-bold text-slate-400 text-center uppercase tracking-wider w-10 bg-slate-100/50">Bes.Gr.</th>
                    {stepsToDisplay.map(step => (
                      <th key={step} className="p-1 border border-slate-100 text-[9px] font-bold text-slate-500 text-center whitespace-nowrap min-w-[42px]">
                        St. {step}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupsToDisplay.map(group => (
                    <tr key={group}>
                      <td className="p-1 border border-slate-100 text-[10px] font-black text-slate-700 bg-slate-50 text-center">{group}</td>
                      {stepsToDisplay.map(step => {
                        const cell = heatmapData[group]?.[step];
                        const isBestMatch = group === bestMatchGroup && step === bestMatchStep;
                        const isSelected = selectedCell?.group === group && selectedCell?.step === step;
                        
                        if (!cell || !cell.available) {
                           return (
                             <td key={step} className="p-1 border border-slate-100 text-center text-[9px] text-slate-300 bg-slate-50/50 font-mono">-</td>
                           );
                        }

                        const absDiff = Math.abs(cell.diff);
                        const cellColors = interpolateColor(absDiff, minAbsDiff, maxAbsDiff);

                        // Border styling if selected or best
                        let borderStyle = "border ";
                        if (isSelected) {
                          borderStyle = "ring-2 ring-indigo-500 ring-offset-1 z-10 scale-102 shadow-md font-bold ";
                        } else if (isBestMatch) {
                          borderStyle = "border-2 border-dashed border-indigo-500 ";
                        }

                        return (
                          <td 
                            key={step} 
                            onClick={() => setSelectedCell({ group, step })}
                            className={`p-1 relative text-center text-[9px] font-mono font-medium transition-all duration-150 cursor-pointer select-none ${borderStyle}`}
                            style={{
                              backgroundColor: cellColors.backgroundColor,
                              borderColor: cellColors.borderColor,
                              color: cellColors.color
                            }}
                            title={`${group} Stufe ${step}: ${formatEuro(cell.disposable)} (Abweichung: ${Math.round(cell.diff) > 0 ? '+' : ''}${Math.round(cell.diff)}€)`}
                          >
                            <span className="relative z-10">{Math.round(absDiff)}</span>
                            {isBestMatch && (
                              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-indigo-500 rounded-full shadow-sm animate-pulse z-20" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend underneath Heatmap */}
            <div className="mt-2 flex items-center justify-center text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-2 bg-slate-50/50 p-2 rounded-xl">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded border border-dashed bg-white border-indigo-500" />
                <span className="text-indigo-600 uppercase tracking-wider text-[8px] font-black">{t('results.heatmap.legend.bestMatch')}</span>
              </div>
            </div>
          </div>

          {/* Details Card on Right */}
          <div className="lg:col-span-1">
            {(() => {
              const selectedGroup = selectedCell?.group || bestMatchGroup;
              const selectedStep = selectedCell?.step || bestMatchStep;
              const details = heatmapData[selectedGroup]?.[selectedStep];
              
              if (!details) {
                return (
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200 text-slate-400 text-xs">
                    {t('results.heatmap.details.noDetails')}
                  </div>
                );
              }

              const isBest = selectedGroup === bestMatchGroup && selectedStep === bestMatchStep;

              return (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col h-full justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingUp size={10} /> {t('results.heatmap.selectedDetails')}
                      </span>
                      {isBest && (
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          {t('results.heatmap.legend.bestMatch')}
                        </span>
                      )}
                    </div>

                    <h5 className="text-base font-black text-slate-800 tracking-tight">
                      {selectedGroup} <span className="text-slate-400 font-medium text-xs">{t('form.step')} {selectedStep}</span>
                    </h5>
                    
                    <div className="space-y-1.5 mt-2.5">
                      <div className="flex justify-between items-center text-[11px] border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500 font-medium">{t('results.heatmap.details.basicGross')}</span>
                        <span className="font-bold text-slate-800">{formatEuro(details.baseGross)}</span>
                      </div>
                      {details.bonuses.familie > 0 && (
                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200/50 pb-1">
                          <span className="text-slate-500 font-medium">{t('results.heatmap.details.familyAllowance')}</span>
                          <span className="font-bold text-indigo-600">+ {formatEuro(details.bonuses.familie)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[11px] border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500 font-medium">{t('results.heatmap.details.tax')}</span>
                        <span className="font-bold text-red-500">- {formatEuro(details.tax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500 font-medium">{t('results.heatmap.details.healthCare')}</span>
                        <span className="font-bold text-red-500">- {formatEuro(details.pkv + details.pkvPv)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500 font-medium">{t('results.heatmap.details.payoutNet')}</span>
                        <span className="font-bold text-slate-800">{formatEuro(details.gross - details.tax)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 mt-1">
                        <span className="text-slate-900 font-black">{t('results.heatmap.details.disposableNet')}</span>
                        <span className="font-black text-indigo-600 text-sm">{formatEuro(details.disposable)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profit or loss indicator */}
                  <div className={`p-2 rounded-xl flex flex-col gap-0.5 text-center justify-center ${
                    details.diff >= 0 ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'
                  }`}>
                    <span className="text-[9px] font-black uppercase tracking-wider">{t('results.heatmap.details.comparisonLabel')}</span>
                    <span className="text-sm font-black tracking-tight leading-tight">
                      {details.diff >= 0 ? '+' : ''}{formatEuro(details.diff)} / mtl.
                    </span>
                    <span className="text-[8px] font-medium opacity-85 leading-tight">
                      {details.diff >= 0 
                        ? t('results.heatmap.details.gainText')
                        : t('results.heatmap.details.lossText')}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <Clock size={16} className="text-indigo-600" /> {t('results.table.title')}
          </h4>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">{t('results.table.subtitle')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="px-4 py-2 font-bold text-slate-400 uppercase text-[9px] tracking-widest leading-loose w-1/3">{t('results.table.columns.category')}</th>
                <th className="px-4 py-2 font-bold text-slate-400 uppercase text-[9px] tracking-widest w-1/3">{t('results.table.columns.beamter')}</th>
                <th className="px-4 py-2 font-bold text-slate-400 uppercase text-[9px] tracking-widest w-1/3">{t('results.table.columns.employee')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-[11px]">
              {/* Gross Salary Section */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.gross')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.base_salary.label')}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.main.baseGross)}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.base.gross)}</td>
              </tr>
              {currentResult.main.bonuses.familie > 0 && (
                <tr>
                   <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.family_bonus.label')}</td>
                   <td className="px-4 py-1.5 text-emerald-600 font-bold text-left">+ {formatEuro(currentResult.main.bonuses.familie)}</td>
                   <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                </tr>
              )}
              {currentResult.base.agZuschuss && currentResult.base.agZuschuss.kv > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8 italic">{t('results.table.rows.ag_subsidy_kv.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-emerald-600">+ {formatEuro(currentResult.base.agZuschuss.kv)}</td>
                </tr>
              )}
              {currentResult.base.agZuschuss && currentResult.base.agZuschuss.pv > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8 italic">{t('results.table.rows.ag_subsidy_pv.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-emerald-600">+ {formatEuro(currentResult.base.agZuschuss.pv)}</td>
                </tr>
              )}
              <tr className="bg-indigo-50/10">
                <td className="px-4 py-1.5 text-indigo-600 pl-8 font-black uppercase text-[9px] tracking-widest">{t('results.table.rows.gross.label')}</td>
                <td className="px-4 py-1.5 text-indigo-600 font-black">{formatEuro(currentResult.main.gross)}</td>
                <td className="px-4 py-1.5 text-indigo-600 font-black">{formatEuro(currentResult.base.gross + (currentResult.base.agZuschuss?.total || 0))}</td>
              </tr>
              
              {/* Deductions: Social Security */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.social')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.pension_insurance.label')}</td>
                <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.base.social.pensionInsurance)}</td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.health_insurance.label')}</td>
                <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.base.social.healthInsurance)}</td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.care_insurance.label')}</td>
                <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.base.social.careInsurance)}</td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.unemployment_insurance.label')}</td>
                <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.base.social.unemploymentInsurance)}</td>
              </tr>

              {/* Deductions: Taxes */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.taxes')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.tax.label')}</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.main.tax)}</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.base.tax)}</td>
              </tr>

              {/* Net Income */}
              <tr className="border-t-2 border-slate-100 font-bold">
                <td className="px-4 py-1.5 text-slate-900 font-bold">{t('results.table.rows.net.label')}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.main.net)}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.base.net)}</td>
              </tr>

              {/* Private costs / Supplemental */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.additional')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.health.label')}</td>
                <td className="px-4 py-1.5 text-red-500">
                  - {formatEuro(pkvBreakdown.adultPkvReduced + pkvBreakdown.kidPkvReducedTotal)} 
                  <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">{children >= 2 ? t('results.table.rows.health.beamterSub30') : t('results.table.rows.health.beamterSub50')}</span>
                </td>
                <td className="px-4 py-1.5 text-red-500">
                   {currentResult.base.pkvFull ? `- ${formatEuro(currentResult.base.pkvFull)}` : '0,00 €'}
                   {currentResult.base.pkvFull ? (
                     <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">{t('form.pkv.preview')} (100%)</span>
                   ) : null}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.pv.label')}</td>
                <td className="px-4 py-1.5 text-red-500">
                  - {formatEuro(pkvBreakdown.adultPflegeReduced + pkvBreakdown.kidPflegeReducedTotal)} 
                  <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">{t('results.table.rows.pv.beamterSub')}</span>
                </td>
                <td className="px-4 py-1.5 text-red-500">
                  {currentResult.base.pkvPvFull ? `- ${formatEuro(currentResult.base.pkvPvFull)}` : '0,00 €'}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.retirement_gap.label')}</td>
                <td className="px-4 py-1.5 text-emerald-600 font-bold italic">{t('results.table.rows.pension.beamter')}</td>
                <td className="px-4 py-1.5 text-red-500">
                  - {formatEuro(currentResult.benefitCost.pension)} 
                  {companyPension > 0 && <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">inkl. {formatEuro(companyPension)} bAV</span>}
                  <span className="text-[10px] font-medium text-slate-400 block mt-0.5 leading-tight">{t('results.table.rows.pension.employeeSub')}</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.bu.label')}</td>
                <td className="px-4 py-1.5 text-emerald-600 font-bold italic">{t('results.table.rows.bu.beamter')}</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.benefitCost.bu)} <span className="text-[10px] font-medium text-slate-400 block mt-0.5 leading-tight">{t('results.table.rows.bu.employeeSub')}</span></td>
              </tr>

              {/* Final Disposable Income */}
              <tr className="bg-indigo-50/30">
                <td className="px-4 py-3 text-slate-900 font-black text-xs uppercase tracking-wider">{t('results.table.rows.disposable.label')}</td>
                <td className="px-4 py-3 text-indigo-600 text-base font-black">
                  {formatEuro(currentResult.main.disposableIncome)}
                </td>
                <td className="px-4 py-3 text-slate-900 text-base font-black">
                  {formatEuro(currentResult.base.disposableIncome)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  return <TabLayout leftColumn={leftColumn} rightColumn={rightColumn} />;
};
