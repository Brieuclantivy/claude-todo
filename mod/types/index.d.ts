export type Statut = 'ouverte' | 'ajoutee' | 'faite' | 'modifiee'

export type EntreeVue = {
  id: number
  type: 'tache' | 'question'
  texte: string
  prio: boolean
  echeance: string | null
  statut: Statut
  // absents dans les cartes antérieures à la 0.4.0
  reunion?: string | null
  doc?: boolean
}

export type ProjetVue = { nom: string; entrees: EntreeVue[] }

export type PointVue = { id: number; texte: string; prio: boolean; echeance: string | null; doc?: boolean }

export type ThemeVue = { titre: string; points: PointVue[] }

// `genre` absent (cartes de la 0.1.0) = 'modif'
export type Carte = {
  genre?: 'modif' | 'todo' | 'reunion'
  projets: ProjetVue[]
  // `titre` absent avant la 0.4.0 : on affiche alors « Réunion — <projet> »
  reunion?: { projet?: string; titre?: string; date?: string | null; themes: ThemeVue[] }
}

// `entrees` absent dans une valeur écrite par la 0.1.0
export type Bandeau = { projet: string; taches: number; questions: number; entrees?: EntreeVue[] }

declare module 'claude-code' {
  interface PluginState {
    'todo-affichage': {
      bandeau: Bandeau | null
      bandeauOuvert: boolean
      cartes: Record<string, Carte>
    }
  }
}
