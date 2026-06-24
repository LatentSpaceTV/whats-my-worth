import React, { useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  ShieldCheck, 
  Euro,
  Clock,
  Info,
  Percent
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  getStartStep,
} from '../../../backend/calculators/beamte';
import { calculateCareerPath } from '../../../backend/simulation/career';
import { 
  HOMETOWN_MIETSTUFEN, 
} from '../../../backend/data/beamte';
import { BESOLDUNG_TABLE } from '../../../backend/data/beamte';
import { ENTGELT_TABLE } from '../../../backend/data/employee';
import { PKV_PLAN_COSTS } from '../../../backend/data/pkv';
import { useTranslation } from '../../lib/i18n';
import { formatEuro } from '../../utils/formatters';
import { SharedStateProps } from '../pkvTypes';
import { TabLayout } from '../layout/tabLayout';
import { Tooltip as AppTooltip } from '../layout/tooltip';

import { PKVSelection } from '../pkv/pkvSelection';

/**
 * Long-term career projection tab.
 * Compares the cumulative (lifetime) net earnings of a Civil Servant vs. an Employee over 40 years.
 * Accounts for automatic salary step increases (Stufenaufstiege) based on realistic time intervals
 * for both public sector and general employment.
 */
export const CareerPathTab: React.FC<SharedStateProps> = (props) => {
  const { t } = useTranslation();
  const {
    besoldungGroup, setBesoldungGroup,
    setBesoldungStep,
    pkvCostBreakdown,
    children, setChildren,
    location, setLocation,
    hometown, setHometown,
    isMarried, setIsMarried,
    etfRate, setEtfRate,
    customBonus, setCustomBonus,
    companyPension, setCompanyPension,
  } = props;

  const findMatchedEntgeltGroup = (bGroup: string) => {
    const match = bGroup.match(/(?:A|E|R)\s*(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (bGroup.startsWith('R')) return `E 15`;
      return `E ${num}`;
    }
    if (bGroup.startsWith('B')) return 'E 15';
    return 'E 13';
  };

  const careerResult = useMemo(() => {
    const matchedGroup = findMatchedEntgeltGroup(besoldungGroup);
    
    let pkvAdultHealth = 0;
    let pkvKidHealth = 0;
    let pkvAdultCare = 0;
    let pkvKidCare = 0;

    if (props.pkvPlan === 'individual') {
      pkvAdultHealth = props.customPkvAdult;
      pkvKidHealth = props.customPkvKid;
      pkvAdultCare = props.customPflegeAdult;
      pkvKidCare = props.customPflegeKid;
    } else if (props.pkvPlan !== 'voluntaryGkv') {
      const costs = PKV_PLAN_COSTS[props.pkvPlan] || PKV_PLAN_COSTS.standard;
      pkvAdultHealth = costs.adult_pkv;
      pkvKidHealth = costs.kid_pkv;
      pkvAdultCare = costs.adult_pflege;
      pkvKidCare = costs.kid_pflege;
    }
    // For voluntaryGkv, we pass 0 as the simulator handles it dynamically based on income

    return calculateCareerPath(
      besoldungGroup,
      getStartStep(besoldungGroup),
      matchedGroup,
      pkvAdultHealth,
      pkvKidHealth,
      location,
      children,
      hometown,
      isMarried,
      etfRate,
      customBonus,
      companyPension,
      40,
      pkvAdultCare,
      pkvKidCare,
      props.pkvPlan !== 'voluntaryGkv'
    );
  }, [
    besoldungGroup, 
    props.pkvPlan, props.customPkvAdult, props.customPkvKid, props.customPflegeAdult, props.customPflegeKid,
    location, children, hometown, isMarried, etfRate, customBonus, companyPension
  ]);

  const careerData = careerResult.path;

  const careerMetrics = useMemo(() => {
    if (!careerData || !careerData.length) return null;
    const last = careerData[careerData.length - 1];
    const years = careerData.length;
    return {
      beamterTotal: last.beamterCumulative,
      employeeTotal: last.employeeCumulative,
      beamterAvgYearly: last.beamterCumulative / years,
      employeeAvgYearly: last.employeeCumulative / years,
      matchedGroup: findMatchedEntgeltGroup(besoldungGroup),
      retirement: careerResult.retirement
    };
  }, [careerData, careerResult.retirement, besoldungGroup]);

  const leftColumn = (
    <div className="bg-white p-6 md:p-7 rounded-2xl shadow-sm border border-slate-200 lg:flex-1">
      <div className="space-y-8">
        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Calculator size={14} className="text-indigo-500" /> {t('form.sections.position')}
          </h4>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                {t('form.career.pathLabel')}
                <AppTooltip content={t('form.career.pathInfo')} />
              </label>
              <select 
                value={besoldungGroup}
                onChange={(e) => {
                  setBesoldungGroup(e.target.value);
                  setBesoldungStep(getStartStep(e.target.value));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-sm font-medium cursor-pointer"
              >
                {['höherer Dienst', 'gehobener Dienst', 'mittlerer Dienst'].map(key => {
                   const categoryKey = key === 'höherer Dienst' ? 'hoher' : key === 'gehobener Dienst' ? 'gehobener' : 'mittlerer';
                   return (
                    <optgroup key={key} label={t(`form.careerPaths.${categoryKey}.title`)}>
                      {categoryKey === 'hoher' && [
                        { group: 'A13', label: t('form.careerPaths.hoher.roles.0.label') },
                        { group: 'A14', label: t('form.careerPaths.hoher.roles.1.label') },
                        { group: 'A15', label: t('form.careerPaths.hoher.roles.2.label') },
                        { group: 'A16', label: t('form.careerPaths.hoher.roles.3.label') },
                        { group: 'A16', label: t('form.careerPaths.hoher.roles.4.label') },
                        { group: 'A16', label: t('form.careerPaths.hoher.roles.5.label') },
                        { group: 'A16', label: t('form.careerPaths.hoher.roles.6.label') },
                        { group: 'A16', label: t('form.careerPaths.hoher.roles.7.label') },
                      ].map((role, idx) => (
                        <option key={`${role.group}-${idx}`} value={role.group}>
                          {role.label} ({role.group === 'A16' && !role.label.includes('A16') ? 'hD' : role.group})
                        </option>
                      ))}
                      {categoryKey === 'gehobener' && [
                        { group: 'A9', label: t('form.careerPaths.gehobener.roles.0.label') },
                        { group: 'A10', label: t('form.careerPaths.gehobener.roles.1.label') },
                        { group: 'A11', label: t('form.careerPaths.gehobener.roles.2.label') },
                        { group: 'A12', label: t('form.careerPaths.gehobener.roles.3.label') },
                        { group: 'A13', label: t('form.careerPaths.gehobener.roles.4.label') },
                      ].map((role, idx) => (
                        <option key={`${role.group}-${idx}`} value={role.group}>
                          {role.label} ({role.group})
                        </option>
                      ))}
                      {categoryKey === 'mittlerer' && [
                        { group: 'A7', label: t('form.careerPaths.mittlerer.roles.0.label') },
                        { group: 'A8', label: t('form.careerPaths.mittlerer.roles.1.label') },
                        { group: 'A9', label: t('form.careerPaths.mittlerer.roles.2.label') },
                      ].map((role, idx) => (
                        <option key={`${role.group}-${idx}`} value={role.group}>
                          {role.label} ({role.group})
                        </option>
                      ))}
                    </optgroup>
                   );
                })}
              </select>
              <div className="mt-3 flex items-start gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <Info size={12} className="text-indigo-600 mt-0.5" />
                <p className="text-[10px] text-indigo-700 font-medium">
                  {t('form.career.pathInfo')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                  {t('form.employer')}
                  <AppTooltip content={t('form.employerHint')} />
                </label>
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-sm font-medium cursor-pointer"
                >
                  {['NRW'].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                  {t('form.mietstufe')}
                  <AppTooltip content={t('form.mietstufeHint')} />
                </label>
                <select 
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-sm font-medium cursor-pointer"
                >
                  {Object.keys(HOMETOWN_MIETSTUFEN).map(town => <option key={town} value={town}>{town}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                  {t('form.maritalStatus')}
                  <AppTooltip content={t('form.maritalStatusHint')} />
                </label>
                <select 
                  value={isMarried ? 'married' : 'single'}
                  onChange={(e) => setIsMarried(e.target.value === 'married')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-sm font-medium cursor-pointer"
                >
                  <option value="married">{t('form.maritalOptions.married')}</option>
                  <option value="single">{t('form.maritalOptions.single')}</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                  {t('form.children')}
                  <AppTooltip content={t('form.childrenHint')} />
                </label>
                <select 
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 hover:border-indigo-300 outline-none transition-all text-sm font-medium cursor-pointer"
                >
                  {[0, 1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} {t('form.childrenLabel')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                {t('form.customBonusLabel')}
                <AppTooltip content={t('form.customBonusHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={customBonus}
                  onChange={(e) => setCustomBonus(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 group-hover/input:border-indigo-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium"
                />
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> {t('form.sections.health')}
          </h4>
          <PKVSelection {...props} />
        </section>

        <section>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-500" /> {t('form.sections.retirement')}
          </h4>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                {t('form.etfRateLabel')}
                <AppTooltip content={t('form.etfRateHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={etfRate}
                  step="0.5"
                  onChange={(e) => setEtfRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 group-hover/input:border-indigo-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium"
                />
                <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
                {t('form.companyPensionLabel')}
                <AppTooltip content={t('form.companyPensionHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={companyPension}
                  onChange={(e) => setCompanyPension(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 group-hover/input:border-indigo-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium"
                />
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  const rightColumn = (
    <div className="space-y-8">
      {/* Career Path Chart */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h4 className="text-xl font-bold text-slate-800 uppercase tracking-tight leading-none">{t('form.career.title')}</h4>
            <p className="text-xs font-medium text-slate-400 mt-2 tracking-wide uppercase">{t('form.career.subtitle')}</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <span className="text-slate-600">{t('form.career.beamterLabel')}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <span className="text-slate-400">{t('form.career.employeeLabel')}</span>
            </div>
          </div>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={careerData} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="year" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                dy={15}
                interval={4}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '12px'
                }}
                formatter={(val: number) => [formatEuro(val), '']}
              />
              <Line 
                type="monotone" 
                dataKey="beamterCumulative" 
                stroke="#4f46e5" 
                strokeWidth={4} 
                dot={false}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="employeeCumulative" 
                stroke="#cbd5e1" 
                strokeWidth={4} 
                dot={false}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-8 flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <Clock size={12} className="text-indigo-600" />
          </div>
          <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">
            {t('form.career.disclaimer')}
          </p>
        </div>
      </div>

        {/* Lifetime Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-100 flex flex-col justify-between">
          <div className="absolute -bottom-6 -right-6 text-white/5 pointer-events-none transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-700 z-0">
            <Euro size={160} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('form.career.lifetimeLabel')}</p>
                <div className="text-3xl sm:text-4xl font-black tracking-tighter">{formatEuro(careerMetrics?.beamterTotal || 0)}</div>
              </div>
              <div className="text-right">
                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('form.career.statusLabel')}</p>
                <div className="text-xs font-bold bg-indigo-800/50 px-3 py-1.5 rounded-full border border-indigo-700/50 inline-block shadow-sm">{besoldungGroup}</div>
              </div>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-indigo-800/50">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-300">
                <span>{t('form.career.averageLabel')}</span>
                <span className="text-white text-sm font-black bg-indigo-800/30 px-2 py-0.5 rounded">{formatEuro(careerMetrics?.beamterAvgYearly || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 relative overflow-hidden group shadow-sm flex flex-col justify-between">
          <div className="absolute -bottom-6 -right-6 text-slate-100/30 pointer-events-none transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-700 z-0">
            <Euro size={160} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('form.career.lifetimeLabel')}</p>
                <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter">{formatEuro(careerMetrics?.employeeTotal || 0)}</div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('form.career.matchedLabel')}</p>
                <div className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 inline-block shadow-sm">{careerMetrics?.matchedGroup}</div>
              </div>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>{t('form.career.averageLabel')}</span>
                <span className="text-slate-800 text-sm font-black bg-slate-50 px-2 py-0.5 rounded">{formatEuro(careerMetrics?.employeeAvgYearly || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Retirement Projection */}
      <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm mt-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <TrendingUp size={20} className="text-indigo-600" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 tracking-tight">{t('results.retirement.title')}</h4>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">{t('results.retirement.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="pb-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded-xl p-2 -m-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('results.retirement.beamterLabel')}</p>
              <div className="text-3xl font-black text-indigo-600">{formatEuro(careerResult.retirement.beamterMonthly)}</div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                {t('results.retirement.beamterDescription')}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pb-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors rounded-xl p-2 -m-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('results.retirement.employeeTotalLabel')}</p>
              <div className="text-3xl font-black text-slate-800">{formatEuro(careerResult.retirement.employeeTotalMonthly)}</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium tracking-tight uppercase">{t('results.retirement.employeeGesetzlichLabel')}</span>
                  <span className="text-slate-800 font-bold">{formatEuro(careerResult.retirement.employeeMonthlyGesetzlich)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium tracking-tight uppercase">{t('results.retirement.employeePrivateLabel')}</span>
                  <span className="text-slate-800 font-bold">{formatEuro(careerResult.retirement.employeeMonthlyPrivate)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 hover:scale-[1.02] transition-transform">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('results.retirement.employeeCapitalLabel')}</p>
                <div className="text-emerald-700 font-black text-lg">{formatEuro(careerResult.retirement.employeeCapital)}</div>
              </div>
              <p className="text-[10px] text-emerald-800 font-medium opacity-80 mt-1">
                {t('results.retirement.employeeCapitalDescription', { rate: etfRate.toString() })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return <TabLayout leftColumn={leftColumn} rightColumn={rightColumn} />;
};
