export type Statut = 'ouverte' | 'ajoutee' | 'faite' | 'modifiee'

export type EntreeVue = {
  id: number
  type: 'tache' | 'question'
  texte: string
  prio: boolean
  echeance: string | null
  statut: Statut
}

export type ProjetVue = { nom: string; entrees: EntreeVue[] }

export type PointVue = { id: number; texte: string; prio: boolean; echeance: string | null }

export type ThemeVue = { titre: string; points: PointVue[] }

// `genre` absent (cartes de la 0.1.0) = 'modif'
export type Carte = {
  genre?: 'modif' | 'todo' | 'reunion'
  projets: ProjetVue[]
  reunion?: { projet: string; themes: ThemeVue[] }
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
