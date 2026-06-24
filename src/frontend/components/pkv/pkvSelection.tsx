/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ShieldCheck, Euro, Baby } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { SharedStateProps, PKVPlan } from '../pkvTypes';
import { PKV_PLAN_COSTS } from '../../../backend/data/pkv';
import { getBesoldung } from '../../../backend/calculators/beamte';
import { Tooltip } from '../layout/tooltip';

export const PKVSelection: React.FC<SharedStateProps> = (props) => {
  const { t } = useTranslation();
  const {
    pkvPlan, setPkvPlan,
    customPkvAdult, setCustomPkvAdult,
    customPflegeAdult, setCustomPflegeAdult,
    customPkvKid, setCustomPkvKid,
    customPflegeKid, setCustomPflegeKid,
    children,
    besoldungGroup,
    besoldungStep
  } = props;

  const getPlanLabel = (key: 'basis' | 'standard' | 'premium' | 'voluntaryGkv') => {
    let adultTotal = 0;
    let kidTotal = 0;

    if (key === 'voluntaryGkv') {
      const gross = getBesoldung(besoldungGroup, besoldungStep);
      const BBG_2025 = 5512.50;
      const cappedGross = Math.min(gross, BBG_2025);
      const health = cappedGross * 0.175;
      const care = cappedGross * (children > 0 ? 0.036 : 0.042);
      adultTotal = health + care;
      kidTotal = 0;
    } else {
      const cost = PKV_PLAN_COSTS[key];
      adultTotal = cost.adult_pkv + cost.adult_pflege;
      kidTotal = cost.kid_pkv + cost.kid_pflege;
    }
    
    const planName = t(`form.pkv.options.${key}`);
    const adultLabel = t('form.pkv.adultLabel');
    const kidLabel = t('form.pkv.kidLabel');

    if (key === 'voluntaryGkv') {
      return `${planName} (${adultLabel}: ${adultTotal.toFixed(2)}€ / ${t('form.pkv.freeKids')})`;
    }

    return `${planName} (${adultLabel}: ${adultTotal.toFixed(2)}€ / ${kidLabel}: ${kidTotal.toFixed(2)}€)`;
  };

  const adultBeihilfeRate = children >= 2 ? 0.7 : 0.5;
  const kidBeihilfeRate = 0.8;

  const currentCosts = useMemo(() => {
    if (pkvPlan === 'individual') {
      return {
        adult_pkv: customPkvAdult,
        adult_pflege: customPflegeAdult,
        kid_pkv: customPkvKid,
        kid_pflege: customPflegeKid
      };
    } else if (pkvPlan === 'voluntaryGkv') {
      const gross = getBesoldung(besoldungGroup, besoldungStep);
      const BBG_2025 = 5512.50;
      const cappedGross = Math.min(gross, BBG_2025);
      return {
        adult_pkv: cappedGross * 0.175,
        adult_pflege: cappedGross * (children > 0 ? 0.036 : 0.042),
        kid_pkv: 0,
        kid_pflege: 0
      };
    } else {
      return PKV_PLAN_COSTS[pkvPlan];
    }
  }, [pkvPlan, customPkvAdult, customPflegeAdult, customPkvKid, customPflegeKid, besoldungGroup, besoldungStep, children]);

  const reducedCosts = {
    adult_pkv: currentCosts.adult_pkv * (1 - adultBeihilfeRate),
    adult_pflege: currentCosts.adult_pflege * (1 - adultBeihilfeRate),
    kid_pkv: currentCosts.kid_pkv * (1 - kidBeihilfeRate),
    kid_pflege: currentCosts.kid_pflege * (1 - kidBeihilfeRate),
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase mb-2">
          {t('form.pkv.label')}
          <Tooltip content={t('form.pkv.hint')} />
        </label>
        <div className="relative group/select">
          <select 
            value={pkvPlan}
            onChange={(e) => setPkvPlan(e.target.value as PKVPlan)}
            className="w-full bg-slate-50 border border-slate-200 group-hover/select:border-indigo-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all pl-9 text-sm font-medium pr-10 appearance-none cursor-pointer"
          >
            <option value="basis">{getPlanLabel('basis')}</option>
            <option value="standard">{getPlanLabel('standard')}</option>
            <option value="premium">{getPlanLabel('premium')}</option>
            <option value="voluntaryGkv">{getPlanLabel('voluntaryGkv')}</option>
            <option value="individual">{t('form.pkv.options.individual')}</option>
          </select>
          <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/select:text-indigo-400 transition-colors" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-indigo-400 transition-colors">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {pkvPlan === 'individual' && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <ShieldCheck size={10} className="text-indigo-500" /> {t('form.pkv.adultHealth')} (100%)
                <Tooltip content={t('form.pkv.adultHealthHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={customPkvAdult}
                  onChange={(e) => setCustomPkvAdult(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 group-hover/input:border-indigo-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold pl-8 transition-all"
                />
                <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <ShieldCheck size={10} className="text-emerald-500" /> {t('form.pkv.adultCare')} (100%)
                <Tooltip content={t('form.pkv.adultCareHint')} />
              </label>
              <div className="relative group/input">
                <input 
                  type="number"
                  value={customPflegeAdult}
                  onChange={(e) => setCustomPflegeAdult(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 group-hover/input:border-emerald-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold pl-8 transition-all"
                />
                <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-emerald-400 transition-colors" />
              </div>
            </div>
          </div>

          {children > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Baby size={10} className="text-indigo-400" /> {t('form.pkv.kidHealth')} (100%)
                  <Tooltip content={t('form.pkv.kidHealthHint')} />
                </label>
                <div className="relative group/input">
                  <input 
                    type="number"
                    value={customPkvKid}
                    onChange={(e) => setCustomPkvKid(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 group-hover/input:border-indigo-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold pl-8 transition-all"
                  />
                  <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-indigo-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <Baby size={10} className="text-emerald-400" /> {t('form.pkv.kidCare')} (100%)
                  <Tooltip content={t('form.pkv.kidCareHint')} />
                </label>
                <div className="relative group/input">
                  <input 
                    type="number"
                    value={customPflegeKid}
                    onChange={(e) => setCustomPflegeKid(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 group-hover/input:border-emerald-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-bold pl-8 transition-all"
                  />
                  <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover/input:text-emerald-400 transition-colors" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('form.pkv.preview')} (100% Beitrag)</span>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{adultBeihilfeRate * 100}% {t('form.pkv.adultLabel')}</span>
            {children > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">80% {t('form.pkv.kidLabel')}</span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-medium border-collapse">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-tighter border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2.5 font-black">{t('form.pkv.previewSum')}</th>
                <th className="text-right px-4 py-2.5">{t('form.pkv.previewHealth')}</th>
                <th className="text-right px-4 py-2.5">{t('form.pkv.previewCare')}</th>
                <th className="text-right px-4 py-2.5 text-indigo-600">{t('form.pkv.previewTotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-2.5 text-slate-800 font-bold">{t('form.pkv.previewAdult')}</td>
                <td className="text-right px-4 py-2.5 text-slate-500">{currentCosts.adult_pkv.toFixed(2)} €</td>
                <td className="text-right px-4 py-2.5 text-slate-500">{currentCosts.adult_pflege.toFixed(2)} €</td>
                <td className="text-right px-4 py-2.5 font-bold text-slate-800 bg-slate-50/30">{(currentCosts.adult_pkv + currentCosts.adult_pflege).toFixed(2)} €</td>
              </tr>
              {Array.from({ length: children }).map((_, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2.5 text-slate-500">{t('form.pkv.previewKidN', { n: idx + 1 }).replace('{n}', (idx + 1).toString())}</td>
                  <td className="text-right px-4 py-2.5 text-slate-400">{currentCosts.kid_pkv.toFixed(2)} €</td>
                  <td className="text-right px-4 py-2.5 text-slate-400">{currentCosts.kid_pflege.toFixed(2)} €</td>
                  <td className="text-right px-4 py-2.5 text-slate-500 font-bold bg-slate-50/30">{(currentCosts.kid_pkv + currentCosts.kid_pflege).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-indigo-50/50 border-t border-indigo-100">
              <tr className="text-indigo-700">
                <td className="px-4 py-3 font-black uppercase tracking-widest">{t('form.pkv.previewSum')}</td>
                <td className="text-right px-4 py-3 font-bold">{ (currentCosts.adult_pkv + (children * currentCosts.kid_pkv)).toFixed(2) } €</td>
                <td className="text-right px-4 py-3 font-bold">{ (currentCosts.adult_pflege + (children * currentCosts.kid_pflege)).toFixed(2) } €</td>
                <td className="text-right px-4 py-3 font-black text-xs text-indigo-900">
                  { (currentCosts.adult_pkv + currentCosts.adult_pflege + (children * (currentCosts.kid_pkv + currentCosts.kid_pflege))).toFixed(2) } €
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
