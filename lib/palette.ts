// Paletas categóricas validadas para daltonismo (all-pairs) contra as superfícies
// clara e escura — geradas com o validador de paleta; não trocar valores a olho.
// Ordem dos setores = ordem de company.json; ordem das teorias = fixa abaixo.

export const TEAM_PALETTE = {
  light: ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#e11d48"],
  dark: ["#8b5cf6", "#0284c7", "#c98500", "#059669", "#e34948"],
};

export const THEORY_ORDER = ["Lencioni", "Edmondson", "Belbin", "Practice"] as const;

export const THEORY_PALETTE = {
  light: ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981"],
  dark: ["#8b5cf6", "#0284c7", "#c98500", "#059669"],
};
