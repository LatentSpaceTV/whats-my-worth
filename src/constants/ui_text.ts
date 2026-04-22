/**
 * Centralized UI text content for the application.
 */

export const UI_TEXT = {
  header: {
    title: "What's my worth?",
    subtitle: "",
    tabs: {
      beamterToEmployee: "Beamter ⮕ Arbeitnehmer",
      employeeToBeamter: "Arbeitnehmer ⮕ Beamter",
    }
  },
  form: {
    entgeltGroup: "Entgeltgruppe (TV-L)",
    besoldungGroup: "Besoldungsgruppe",
    step: "Stufe",
    stepLabel: "Stufe",
    grossBaseLabel: "Grundgehalt (Brutto)",
    familienzuschlag: "Familienzuschlag",
    employer: "Dienstherr",
    mietstufe: "Mietstufe",
    maritalStatus: "Familienstand",
    maritalOptions: {
      married: "Verheiratet",
      single: "Ledig",
    },
    children: "Kinder",
    childrenLabel: "Kinder",
    pkvLabel: "PKV Beitrag (100%)",
    etfRateLabel: "ETF Rendite (p.a.)",
    customBonusLabel: "Sonstige Zulagen (mtl.)",
    sections: {
      position: "Position & Status",
      health: "Krankenversicherung",
      retirement: "Altersvorsorge",
    },
    breakdown: {
      grossNetBase: "Grundgehalt (Netto-Basis)",
      allowances: "Zulagen (Familie & Ort)",
      pkvDeduction: "Abzug PKV",
      disposableIncome: "Verfügbares Netto",
    },
    benefitsTitle: "Beamten-Vorteile",
    benefitsList: [
      "Unkündbarkeit (Lebenszeit)",
      "Beihilfeanspruch (50-70%)",
      "Familienzuschlag inkludiert",
    ],
  },
  results: {
    hero: {
      title: "Benötigtes Brutto (Arbeitnehmer)",
      yearSuffix: "/ Jahr",
      description: "Um die gleiche Lebensqualität und Altersvorsorge privat zu erreichen.",
      factorLabel: "Brutto-Faktor",
      factorSubtext: "Relativ zum Beamtensold",
      entgeltGroupLabel: "Ca. Entgeltgruppe",
      entgeltGroupSource: "(TV-L)",
    },
    charts: {
      distributionTitle: "Verteilung Arbeitnehmer-Brutto",
      structureTitle: "Kostenstruktur",
      structureLegend: {
        beamter: "Beamter",
        employee: "Arbeitnehmer",
      },
      pieLabels: {
        net: "Netto-Erhalt",
        social: "Sozialabgaben",
        tax: "Steuern",
        pkv: "PKV-Anteil",
        pension: "ETF Depot",
      }
    },
    table: {
      title: "Monatliche Aufschlüsselung",
      subtitle: "Äquivalente Vorsorge",
      columns: {
        category: "Kategorie",
        beamter: "Beamter",
        employee: "Arbeitnehmer",
      },
      rows: {
        pension: {
          label: "ETF Depot Vorsorge",
          beamter: "Inkludiert",
          beamterSub: "Pension",
          employeeSub: "ETF Sparrate",
        },
        health: {
          label: "Private Krankenvers.",
          beamterSub30: "30% Restkosten",
          beamterSub50: "50% Restkosten",
          employeeSub: "100% (minus AG-Zuschuss)",
        },
        bu: {
          label: "Dienstunfähigkeit (BU)",
          beamter: "Teil-Abgesichert",
          beamterSub: "RU/DU Schutz",
          employeeSub: "BU-Versicherung",
        },
        disposable: {
          label: "Netto-Geld im Geldbeutel",
        }
      }
    }
  },
  footer: {
    disclaimer: "HINWEIS: Diese Modellberechnung basiert auf dem Bundesbesoldungsgesetz 2024/25. Regionale Unterschiede in {location} wurden approximiert. Die Altersvorsorge simuliert einen ETF-Sparplan (35 Jahre Anspardauer, 4% Entnahmerate), um die Lücke zur Beamtenpension (Ziel: 71,75%) zu schließen.",
    exportButton: "PDF Export",
    shareButton: "Teilen",
    etfSubtext: "Simulierter Sparplan zur Deckung der Pensionslücke."
  }
};
