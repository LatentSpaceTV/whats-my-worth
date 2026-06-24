import React, { useMemo } from 'react';
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
  getBesoldung, 
  getStartStep,
} from '../../../backend/calculators/beamte';
import { findEquivalence } from '../../../backend/simulation/equivalence';
import { 
  HOMETOWN_MIETSTUFEN,
} from '../../../backend/data/beamte';
import { findApproximateEntgelt } from '../../../backend/data/employee';
import { BESOLDUNG_TABLE } from '../../../backend/data/beamte';
import { PKV_PLAN_COSTS } from '../../../backend/data/pkv';
import { useTranslation } from '../../lib/i18n';
import { formatEuro } from '../../utils/formatters';
import { SharedStateProps } from '../pkvTypes';
import { TabLayout } from '../layout/tabLayout';
import { calculatePKVBreakdown } from '../../../backend/calculators/pkv';
import { Tooltip } from '../layout/tooltip';

import { PKVSelection } from '../pkv/pkvSelection';

/**
 * Calculation tab for users switching from Civil Servant (Beamter) to Employee (Arbeitnehmer).
 * It calculates the "Equivalence Gross" — the gross salary an employee needs to earn
 * to have the same disposable income as a civil servant, accounting for additional 
 * private insurance, pension gaps, and disability insurance costs.
 */
export const BeamterToEmployeeTab: React.FC<SharedStateProps> = (props) => {
  const { t } = useTranslation();
  const {
    besoldungGroup, setBesoldungGroup,
    besoldungStep, setBesoldungStep,
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

  const beamterToEmployeeResult = useMemo(() => {
    const gross = getBesoldung(besoldungGroup, besoldungStep);
    
    // Calculate breakdown first to get dynamic voluntary GKV costs if needed
    const breakdown = calculatePKVBreakdown(pkvPlan, children, { 
      adultPkv: customPkvAdult, 
      adultPflege: customPflegeAdult, 
      kidPkv: customPkvKid, 
      kidPflege: customPflegeKid 
    }, gross);

    const beamterCalc = calculateBeamter(
      gross, 
      breakdown.adultPkv, 
      children > 0 ? breakdown.kidPkvTotal / children : 0, 
      location, 
      children, 
      hometown, 
      isMarried, 
      besoldungGroup, 
      customBonus, 
      breakdown.adultPflege, 
      children > 0 ? breakdown.kidPflegeTotal / children : 0,
      pkvPlan !== 'voluntaryGkv'
    );

    return findEquivalence(
      beamterCalc, 
      children, 
      breakdown.adultPkv, 
      children > 0 ? breakdown.kidPkvTotal / children : 0, 
      etfRate, 
      companyPension, 
      breakdown.adultPflege, 
      children > 0 ? breakdown.kidPflegeTotal / children : 0
    );
  }, [
    besoldungGroup, besoldungStep, location, children, hometown, isMarried, etfRate, 
    customBonus, companyPension, pkvPlan, customPkvAdult, customPkvKid, customPflegeAdult, customPflegeKid
  ]);

  const pkvBreakdown = useMemo(() => {
    const gross = getBesoldung(besoldungGroup, besoldungStep);
    return calculatePKVBreakdown(pkvPlan, children, { 
      adultPkv: customPkvAdult, 
      adultPflege: customPflegeAdult, 
      kidPkv: customPkvKid, 
      kidPflege: customPflegeKid 
    }, gross);
  }, [pkvPlan, children, customPkvAdult, customPflegeAdult, customPkvKid, customPflegeKid, besoldungGroup, besoldungStep]);

  const currentResult = useMemo(() => {
    const gross = getBesoldung(besoldungGroup, besoldungStep);
    
    // Use breakdown values for consistency (per child values needed for calculation)
    const pkvKidHealth = children > 0 ? pkvBreakdown.kidPkvTotal / children : 0;
    const pkvKidCare = children > 0 ? pkvBreakdown.kidPflegeTotal / children : 0;

    return {
      main: beamterToEmployeeResult.result, // employee calculation
      base: calculateBeamter(
        gross, 
        pkvBreakdown.adultPkv, 
        pkvKidHealth,
        location, 
        children, 
        hometown, 
        isMarried, 
        besoldungGroup, 
        customBonus, 
        pkvBreakdown.adultPflege,
        pkvKidCare,
        pkvPlan !== 'voluntaryGkv'
      ),
      equivLabel: (() => {
        const equiv = findApproximateEntgelt(beamterToEmployeeResult.requiredGross);
        const [group, step] = equiv.split('/');
        return `${group} • Stufe ${step}`;
      })(),
      requiredMonthly: beamterToEmployeeResult.requiredGross,
      benefitCost: beamterToEmployeeResult.benefitCost
    };
  }, [
    besoldungGroup, besoldungStep, location, children, hometown, isMarried, customBonus, 
    pkvPlan, customPkvAdult, customPkvKid, customPflegeAdult, customPflegeKid, beamterToEmployeeResult, pkvBreakdown
  ]);

  const leftColumn = (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 lg:flex-1 hover:shadow-md transition-shadow">
      <div className="space-y-5">
        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calculator size={14} className="text-indigo-500" /> {t('form.sections.position')}
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('form.besoldungGroup')}
                  <Tooltip content={t('form.besoldungGroupHint')} />
                </label>
                <select 
                  value={besoldungGroup}
                  onChange={(e) => setBesoldungGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-xs font-medium cursor-pointer"
                >
                  {Object.keys(BESOLDUNG_TABLE).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('form.step')}
                  <Tooltip content={t('form.stepHint')} />
                </label>
                <select 
                  value={besoldungStep}
                  onChange={(e) => setBesoldungStep(Number(e.target.value))}
                  disabled={BESOLDUNG_TABLE[besoldungGroup]?.length === 1}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {(BESOLDUNG_TABLE[besoldungGroup] || []).map((_, i) => {
                    const stepValue = getStartStep(besoldungGroup) + i;
                    return (
                      <option key={stepValue} value={stepValue}>{t('form.stepLabel')} {stepValue}</option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('form.employer')}
                  <Tooltip content={t('form.employerHint')} />
                </label>
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-xs font-medium cursor-pointer"
                >
                  {['NRW'].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('form.mietstufe')}
                  <Tooltip content={t('form.mietstufeHint')} />
                </label>
                <select 
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-xs font-medium cursor-pointer"
                >
                  {Object.keys(HOMETOWN_MIETSTUFEN).map(town => <option key={town} value={town}>{town}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('form.maritalStatus')}
                  <Tooltip content={t('form.maritalStatusHint')} />
                </label>
                <select 
                  value={isMarried ? 'married' : 'single'}
                  onChange={(e) => setIsMarried(e.target.value === 'married')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-xs font-medium cursor-pointer"
                >
                  <option value="married">{t('form.maritalOptions.married')}</option>
                  <option value="single">{t('form.maritalOptions.single')}</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {t('form.children')}
                  <Tooltip content={t('form.childrenHint')} />
                </label>
                <select 
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-xs font-medium cursor-pointer"
                >
                  {[0, 1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} {t('form.childrenLabel')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t('form.customBonusLabel')}
                <Tooltip content={t('form.customBonusHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={customBonus}
                  onChange={(e) => setCustomBonus(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 group-hover/input:border-indigo-300 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                />
                <Euro size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
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
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t('form.etfRateLabel')}
                <Tooltip content={t('form.etfRateHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={etfRate}
                  step="0.5"
                  onChange={(e) => setEtfRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 group-hover/input:border-indigo-300 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                />
                <Percent size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                {t('form.companyPensionLabel')}
                <Tooltip content={t('form.companyPensionHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={companyPension}
                  onChange={(e) => setCompanyPension(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 group-hover/input:border-indigo-300 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-xs font-medium"
                />
                <Euro size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
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
        key="beamterToEmployeeResult"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-900 rounded-[32px] p-8 sm:p-12 text-white flex flex-col items-center justify-center text-center shadow-2xl shadow-indigo-500/20 relative overflow-hidden group"
      >
        <div className="relative z-10 max-w-3xl">
          <p className="text-indigo-300 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] mb-6 opacity-80">
            {t('results.hero.titleEmployee')}
          </p>
          <h3 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none flex flex-wrap justify-center items-baseline gap-2 sm:gap-4">
            <span>{new Intl.NumberFormat('de-DE').format(Math.round(currentResult.requiredMonthly * 12))} €</span>
            <span className="text-xl sm:text-3xl md:text-4xl font-light text-indigo-400 tracking-normal">{t('results.hero.yearSuffix')}</span>
          </h3>
          <div className="flex flex-col items-center gap-4 mt-8">
            <p className="text-indigo-100/60 text-sm sm:text-base max-w-xl leading-relaxed font-medium italic">
              {t('results.hero.description')}
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
      </motion.div>

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
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.base.baseGross)}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.main.gross)}</td>
              </tr>
              {currentResult.base.bonuses.familie > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.family_bonus.label')}</td>
                  <td className="px-4 py-1.5 text-emerald-600 font-bold">+ {formatEuro(currentResult.base.bonuses.familie)}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                </tr>
              )}
              {currentResult.main.agZuschuss && currentResult.main.agZuschuss.kv > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8 italic">{t('results.table.rows.ag_subsidy_kv.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-emerald-600">+ {formatEuro(currentResult.main.agZuschuss.kv)}</td>
                </tr>
              )}
              {currentResult.main.agZuschuss && currentResult.main.agZuschuss.pv > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8 italic">{t('results.table.rows.ag_subsidy_pv.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-emerald-600">+ {formatEuro(currentResult.main.agZuschuss.pv)}</td>
                </tr>
              )}
              <tr className="bg-indigo-50/10">
                <td className="px-4 py-1.5 text-indigo-600 pl-8 font-black uppercase text-[9px] tracking-widest">{t('results.table.rows.gross.label')}</td>
                <td className="px-4 py-1.5 text-indigo-600 font-black">{formatEuro(currentResult.base.gross)}</td>
                <td className="px-4 py-1.5 text-indigo-600 font-black">{formatEuro(currentResult.main.gross + (currentResult.main.agZuschuss?.total || 0))}</td>
              </tr>
              
              {/* Deductions: Social Security */}
              {(currentResult.main.social.total > 0) && (
                <tr className="bg-slate-50/20">
                  <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.social')}</td>
                  <td className="px-4 py-1.5"></td>
                  <td className="px-4 py-1.5"></td>
                </tr>
              )}
              {currentResult.main.social.pensionInsurance > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.pension_insurance.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.main.social.pensionInsurance)}</td>
                </tr>
              )}
              {currentResult.main.social.unemploymentInsurance > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.unemployment_insurance.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.main.social.unemploymentInsurance)}</td>
                </tr>
              )}

              {/* Deductions: Health & Care Insurance */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.health')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
              {currentResult.main.social.healthInsurance > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.health_insurance.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.main.social.healthInsurance)}</td>
                </tr>
              )}
              {currentResult.main.social.careInsurance > 0 && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.care_insurance.label')}</td>
                  <td className="px-4 py-1.5 text-slate-400">0,00 €</td>
                  <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.main.social.careInsurance)}</td>
                </tr>
              )}
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.health.label')}</td>
                <td className="px-4 py-1.5 text-red-500">
                  - {formatEuro(pkvBreakdown.adultPkvReduced + pkvBreakdown.kidPkvReducedTotal)} 
                  <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">{children >= 2 ? t('results.table.rows.health.beamterSub30') : t('results.table.rows.health.beamterSub50')}</span>
                  {children > 0 && (
                    <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">20% {t('form.pkv.kidLabel')}</span>
                    )
                  }
                </td>
                <td className="px-4 py-1.5 text-red-500">
                   {currentResult.main.pkvFull ? `- ${formatEuro(currentResult.main.pkvFull)}` : '0,00 €'}
                   {currentResult.main.pkvFull ? (
                     <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">{t('form.pkv.preview')} (100%)</span>
                   ) : null}
                </td>
              </tr>
              { (pkvBreakdown.adultPflegeReduced + pkvBreakdown.kidPflegeReducedTotal > 0 || currentResult.main.pkvPvFull > 0) && (
                <tr>
                  <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.pv.label')}</td>
                  <td className="px-4 py-1.5 text-red-500">
                    - {formatEuro(pkvBreakdown.adultPflegeReduced + pkvBreakdown.kidPflegeReducedTotal)} 
                    <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">{children >= 2 ? t('results.table.rows.health.beamterSub30') : t('results.table.rows.health.beamterSub50')}</span>
                    {children > 0 && (
                      <span className="text-[10px] font-medium text-slate-400 block tracking-tight leading-tight mt-0.5">20% {t('form.pkv.kidLabel')}</span>
                      )
                    }
                  </td>
                  <td className="px-4 py-1.5 text-red-500">
                    {currentResult.main.pkvPvFull ? `- ${formatEuro(currentResult.main.pkvPvFull)}` : '0,00 €'}
                  </td>
                </tr>
              )}

              {/* Deductions: Taxes */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.taxes')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-400 pl-8 text-[10px] uppercase font-bold tracking-wider">{t('results.table.rows.taxable_gross.label')}</td>
                <td className="px-4 py-1.5 text-slate-400 italic text-[11px] font-medium">{formatEuro(currentResult.base.taxableGross)}</td>
                <td className="px-4 py-1.5 text-slate-400 italic text-[11px] font-medium">{formatEuro(currentResult.main.taxableGross)}</td>
              </tr>
              <tr>
                <td className="px-4 py-1.5 text-slate-600 pl-8">{t('results.table.rows.tax.label')}</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.base.tax)}</td>
                <td className="px-4 py-1.5 text-red-500">- {formatEuro(currentResult.main.tax)}</td>
              </tr>

              {/* Net Income */}
              <tr className="border-t-2 border-slate-100 font-bold">
                <td className="px-4 py-1.5 text-slate-900 font-bold">{t('results.table.rows.net.label')}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.base.net)}</td>
                <td className="px-4 py-1.5 text-slate-900 font-bold">{formatEuro(currentResult.main.net)}</td>
              </tr>

              {/* Private costs / Supplemental */}
              <tr className="bg-slate-50/20">
                <td className="px-4 py-1.5 text-slate-900 font-bold uppercase text-[9px] tracking-wider">{t('results.table.sections.additional')}</td>
                <td className="px-4 py-1.5"></td>
                <td className="px-4 py-1.5"></td>
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
                  {formatEuro(currentResult.base.disposableIncome)}
                </td>
                <td className="px-4 py-3 text-slate-900 text-base font-black">
                  {formatEuro(currentResult.main.disposableIncome)}
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
