import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Bandeau, Carte, EntreeVue, ProjetVue, Statut, ThemeVue } from '../types'

const bandeau = atom({ plugin: 'todo-affichage', key: 'bandeau' } as const, null)
const bandeauOuvert = atom({ plugin: 'todo-affichage', key: 'bandeauOuvert' } as const, false)
const cartes = atom({ plugin: 'todo-affichage', key: 'cartes' } as const, {})

const MAX_CARTES = 30
const CHEMIN_TODO = /(^|\/)todo\/TODO\.md$/

type Entree = {
  id: number
  projet: string
  type: 'tache' | 'question'
  fait: boolean
  texte: string
  prio: boolean
  echeance: string | null
  brut: string
}

function parser(texte: string): Entree[] {
  const entrees: Entree[] = []
  let projet = ''
  let type: Entree['type'] = 'tache'
  let courante: Entree | null = null

  for (const ligne of texte.split('\n')) {
    if (ligne.startsWith('## ')) {
      projet = ligne.slice(3).trim()
      type = 'tache'
      courante = null
      continue
    }

    if (ligne.startsWith('### ')) {
      type = /question/i.test(ligne) ? 'question' : 'tache'
      courante = null
      continue
    }

    const m = /^- \[( |x)\] #(\d+) (.*)$/.exec(ligne)

    if (m) {
      const reste = m[3] ?? ''
      const echeance = /\[échéance ([^\]]+)\]/i.exec(reste)
      const nouvelle: Entree = {
        id: Number(m[2]),
        projet,
        type,
        fait: m[1] === 'x',
        texte: reste
          .replace(/\s*\(ajouté [^)]*\)/, '')
          .replace(/\s*✅\s*\S+/, '')
          .replace(/\s*\[prio\]/i, '')
          .replace(/\s*\[échéance [^\]]+\]/i, '')
          .trim(),
        prio: /\[prio\]/i.test(reste),
        echeance: echeance?.[1] ?? null,
        brut: ligne,
      }
      entrees.push(nouvelle)
      courante = nouvelle
      continue
    }

    if (courante && /^\s+\S/.test(ligne)) {
      courante.brut += '\n' + ligne
    } else {
      courante = null
    }
  }

  return entrees
}

function statutDe(entree: Entree, avant: Map<number, Entree>): Statut {
  const ancienne = avant.get(entree.id)

  if (!ancienne) {
    return 'ajoutee'
  }

  if (!ancienne.fait && entree.fait) {
    return 'faite'
  }

  return ancienne.brut === entree.brut ? 'ouverte' : 'modifiee'
}

function construireCarte(
  texteAvant: string,
  texteApres: string,
  projetCourant: string,
): { carte: Carte; aChange: boolean } {
  const avant = new Map(parser(texteAvant).map(e => [e.id, e]))
  const apres = parser(texteApres)
  const vues = apres.map(e => ({ entree: e, statut: statutDe(e, avant) }))
  const touches = new Set(vues.filter(v => v.statut !== 'ouverte').map(v => v.entree.projet))
  const aChange = touches.size > 0

  if (!aChange) {
    touches.add(projetCourant)
  }

  const projets: ProjetVue[] = [...touches].map(nom => {
    const entrees: EntreeVue[] = vues
      .filter(v => v.entree.projet === nom && (!v.entree.fait || v.statut !== 'ouverte'))
      .map(({ entree, statut }) => ({
        id: entree.id,
        type: entree.type,
        texte: entree.texte,
        prio: entree.prio,
        echeance: entree.echeance,
        statut,
      }))

    return { nom, entrees }
  })

  return { carte: { genre: 'modif', projets }, aChange }
}

const OUTIL = 'mcp__todo-affichage__afficher'

const DESCRIPTION_OUTIL = `Affiche au user, en carte stylisée sous l'appel, ses entrées TODO ouvertes (~/todo/TODO.md, skill todo).
- vue "todo" : « ma todo », « à faire sur X ». projet omis = tous les projets.
- vue "reunion" : « de quoi parler au client / en réunion ». Donne projet et themes : les questions client ouvertes regroupées par thème, reformulées pour le client (sans jargon ni chemins), les [prio] en premier ; chaque point garde l'id de son entrée.
Après l'appel, ne répète pas la liste dans ta réponse : une ligne suffit.`

const SCHEMA_OUTIL = {
  type: 'object',
  properties: {
    vue: { type: 'string', enum: ['todo', 'reunion'] },
    projet: { type: 'string', description: 'Nom de la section ## du TODO.md (nom approchant accepté).' },
    themes: {
      type: 'array',
      description: 'Vue reunion seulement.',
      items: {
        type: 'object',
        properties: {
          titre: { type: 'string' },
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'integer' }, texte: { type: 'string' } },
              required: ['id', 'texte'],
            },
          },
        },
        required: ['titre', 'points'],
      },
    },
  },
  required: ['vue'],
}

function normaliser(nom: string): string {
  return nom.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function versVue(e: Entree): EntreeVue {
  return { id: e.id, type: e.type, texte: e.texte, prio: e.prio, echeance: e.echeance, statut: 'ouverte' }
}

function carteAffichage(texte: string, input: Record<string, unknown>, projetDefaut: string): { carte: Carte; resume: string } {
  const ouvertes = parser(texte).filter(e => !e.fait)
  const demande = typeof input.projet === 'string' && input.projet !== '' ? input.projet : null
  const noms = [...new Set(parser(texte).map(e => e.projet))]
  const trouver = (nom: string) => noms.find(n => normaliser(n) === normaliser(nom)) ?? nom

  if (input.vue === 'reunion') {
    const projet = trouver(demande ?? projetDefaut)
    const parId = new Map(ouvertes.map(e => [e.id, e]))
    const themesBruts = Array.isArray(input.themes) ? (input.themes as { titre?: unknown; points?: unknown }[]) : []
    let themes: ThemeVue[] = themesBruts.map(t => ({
      titre: String(t.titre ?? ''),
      points: (Array.isArray(t.points) ? (t.points as { id?: unknown; texte?: unknown }[]) : []).map(p => {
        const entree = parId.get(Number(p.id))

        return {
          id: Number(p.id),
          texte: String(p.texte ?? entree?.texte ?? ''),
          prio: entree?.prio ?? false,
          echeance: entree?.echeance ?? null,
        }
      }),
    }))

    if (themes.length === 0) {
      const questions = ouvertes.filter(e => e.projet === projet && e.type === 'question')
      themes = [{ titre: 'Questions', points: questions.map(e => ({ id: e.id, texte: e.texte, prio: e.prio, echeance: e.echeance })) }]
    }

    const total = themes.reduce((n, t) => n + t.points.length, 0)

    return {
      carte: { genre: 'reunion', projets: [], reunion: { projet, themes } },
      resume: `Ordre du jour affiché au user (${projet}, ${total} point(s)).`,
    }
  }

  const choisis = demande ? [trouver(demande)] : [...new Set(ouvertes.map(e => e.projet))]
  const projets: ProjetVue[] = choisis.map(nom => ({
    nom,
    entrees: ouvertes.filter(e => e.projet === nom).map(versVue),
  }))
  const lignes = projets.flatMap(p => p.entrees.map(v => `${p.nom} #${v.id} ${v.texte}`))

  return {
    carte: { genre: 'todo', projets },
    resume: `Liste affichée au user (${lignes.length} entrée(s) ouverte(s)) :\n${lignes.join('\n')}`,
  }
}

async function garderCarte($: EngineInterface, id: string, carte: Carte): Promise<void> {
  await update($, cartes, anciennes => {
    const toutes: Record<string, Carte> = { ...anciennes, [id]: carte }
    const cles = Object.keys(toutes)

    for (const cle of cles.slice(0, Math.max(0, cles.length - MAX_CARTES))) {
      delete toutes[cle]
    }

    return toutes
  })
}

function concerneTodo(tool: string, e: unknown): boolean {
  const champs = e as Record<string, unknown>

  if (tool === 'Skill') {
    return typeof champs.skill === 'string' && /(^|:)todo$/.test(champs.skill)
  }

  if (tool === 'Bash') {
    return typeof champs.command === 'string' && champs.command.includes('todo/TODO.md')
  }

  return typeof champs.file_path === 'string' && CHEMIN_TODO.test(champs.file_path)
}

async function lireTodo($: EngineInterface): Promise<string> {
  const home = await $.env.get('HOME')

  return $.fs.read(`${home}/todo/TODO.md`).then(
    t => (typeof t === 'string' ? t : ''),
    () => '',
  )
}

async function projetCourant($: EngineInterface): Promise<string> {
  const racine = await $.session.cwd()
  const git = await $.process
    .run(['git', '-C', racine, 'rev-parse', '--show-toplevel'])
    .catch(() => null)
  const dossier = git && git.exitCode === 0 ? git.stdout.trim() : racine

  return dossier.split('/').filter(Boolean).pop() ?? dossier
}

async function majBandeau($: EngineInterface, texte: string): Promise<void> {
  const projet = await projetCourant($)
  const ouvertes = parser(texte).filter(e => e.projet === projet && !e.fait)
  const valeur: Bandeau = {
    projet,
    taches: ouvertes.filter(e => e.type === 'tache').length,
    questions: ouvertes.filter(e => e.type === 'question').length,
    entrees: ouvertes.map(e => ({
      id: e.id,
      type: e.type,
      texte: e.texte,
      prio: e.prio,
      echeance: e.echeance,
      statut: 'ouverte',
    })),
  }
  await update($, bandeau, () => valeur)
}

export const register: Register = on => {
  let texteAvant: string | null = null
  let dernierAppel: string | null = null
  let afficheCeTour = false

  on('session.start', async ($, e, next) => {
    const resultat = await next(e)
    await $.tool.register({
      name: 'afficher',
      description: DESCRIPTION_OUTIL,
      inputSchema: SCHEMA_OUTIL,
      isDeferred: false,
    })
    await majBandeau($, await lireTodo($))

    return resultat
  })

  on('prompt.submit', ($, e, next) => {
    texteAvant = null
    dernierAppel = null
    afficheCeTour = false

    return next(e)
  }).catch(($, e, next) => next(e))

  // Affichage seul (lecture du TODO.md) : servi ici, sans demande de permission
  on('tool.call', { tool: OUTIL }, async ($, e) => {
    const input = e as unknown as Record<string, unknown>
    const { carte, resume } = carteAffichage(await lireTodo($), input, await projetCourant($))
    await garderCarte($, e.tool_use_id, carte)
    afficheCeTour = true

    return { result: resume }
  }).catch(() => ({ deny: "todo-affichage : l'affichage a échoué, liste les entrées en texte." }))

  on('tool.call', async ($, e, next) => {
    if (concerneTodo(e.tool, e)) {
      if (texteAvant === null) {
        texteAvant = await lireTodo($)
      }

      dernierAppel = e.tool_use_id
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined || dernierAppel === null || texteAvant === null) {
      return next(e)
    }

    const texteApres = await lireTodo($)
    const { carte, aChange } = construireCarte(texteAvant, texteApres, await projetCourant($))
    const id = dernierAppel
    texteAvant = null
    dernierAppel = null

    // Une liste déjà affichée par l'outil suffit quand rien n'a changé
    if (aChange || !afficheCeTour) {
      await garderCarte($, id, carte)
    }

    await majBandeau($, texteApres)

    return next(e)
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const carte = (await read($, cartes))[e.props.tool_use_id]
    const ligne = await next(e)

    if (!carte) {
      return ligne
    }

    const { Box, Text } = $.ui.resolve(e)

    const entree = (v: EntreeVue) => {
      const faite = v.statut === 'faite'

      return (
        <Text key={`e${v.id}`}>
          <Text color={faite ? 'green' : undefined}>{faite ? ' ☑ ' : ' ☐ '}</Text>
          <Text dimColor>#{v.id} </Text>
          <Text strikethrough={faite} dimColor={faite} bold={v.statut === 'ajoutee'}>
            {v.texte}
          </Text>
          {v.prio ? <Text color="red" bold> PRIO</Text> : null}
          {v.echeance ? <Text color="magenta"> 📅 {v.echeance}</Text> : null}
          {v.statut === 'ajoutee' ? <Text color="green"> ← ajoutée</Text> : null}
          {v.statut === 'faite' ? <Text color="green"> ← faite</Text> : null}
          {v.statut === 'modifiee' ? <Text color="yellow"> ← modifiée</Text> : null}
        </Text>
      )
    }

    const section = (titre: string, liste: EntreeVue[], cle: string) => {
      if (liste.length === 0) {
        return null
      }

      const ouvertes = liste.filter(v => v.statut !== 'faite').length

      return (
        <Box key={cle} flexDirection="column">
          <Text bold dimColor>
            {titre} ({ouvertes})
          </Text>
          {liste.map(entree)}
        </Box>
      )
    }

    if (carte.genre === 'reunion' && carte.reunion) {
      const { projet, themes } = carte.reunion
      const total = themes.reduce((n, t) => n + t.points.length, 0)

      return (
        <Box flexDirection="column">
          {ligne}
          <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
            <Text>
              <Text bold color="magenta">
                🗓 Réunion client — {projet}
              </Text>
              <Text dimColor>
                {' · '}
                {total} point{total > 1 ? 's' : ''}
              </Text>
            </Text>
            {total === 0 ? <Text dimColor> Rien à aborder 🎉</Text> : null}
            {themes
              .filter(t => t.points.length > 0)
              .map((t, i) => (
                <Box key={`r${i}`} flexDirection="column" marginTop={1}>
                  <Text bold>▌ {t.titre}</Text>
                  {t.points.map(p => (
                    <Text key={`r${i}-${p.id}`}>
                      <Text>{'  • '}</Text>
                      {p.prio ? <Text color="red" bold>PRIO </Text> : null}
                      <Text>{p.texte}</Text>
                      {p.echeance ? <Text color="magenta"> 📅 {p.echeance}</Text> : null}
                      <Text dimColor> #{p.id}</Text>
                    </Text>
                  ))}
                </Box>
              ))}
          </Box>
        </Box>
      )
    }

    const nbTaches = carte.projets.reduce((n, p) => n + p.entrees.filter(v => v.type === 'tache').length, 0)
    const nbQuestions = carte.projets.reduce((n, p) => n + p.entrees.filter(v => v.type === 'question').length, 0)

    return (
      <Box flexDirection="column">
        {ligne}
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          {carte.genre === 'todo' ? (
            <Text>
              <Text bold>✅ TODO</Text>
              <Text dimColor>
                {' · '}
                {nbTaches} tâche{nbTaches > 1 ? 's' : ''} · {nbQuestions} question{nbQuestions > 1 ? 's' : ''} client
              </Text>
            </Text>
          ) : null}
          {carte.genre === 'todo' && carte.projets.length === 0 ? <Text dimColor> Rien d'ouvert 🎉</Text> : null}
          {carte.projets.map(p => (
            <Box key={`p${p.nom}`} flexDirection="column">
              <Text bold color="cyan">
                📋 {p.nom || 'sans projet'}
              </Text>
              {p.entrees.length === 0 ? <Text dimColor> Rien d'ouvert 🎉</Text> : null}
              {section('TÂCHES', p.entrees.filter(v => v.type === 'tache'), `t${p.nom}`)}
              {section('QUESTIONS CLIENT', p.entrees.filter(v => v.type === 'question'), `q${p.nom}`)}
            </Box>
          ))}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, bandeau)

    if (e.props.hasSurvey || b === null || b.taches + b.questions === 0) {
      return next(e)
    }

    const ouvert = await read($, bandeauOuvert)
    const { Box, Button, Text } = $.ui.resolve(e)
    const s = (n: number) => (n > 1 ? 's' : '')
    const entrees = b.entrees ?? []

    const ligne = (v: EntreeVue) => (
      <Text key={`b${v.id}`}>
        <Text dimColor>{'   ☐ '}#{v.id} </Text>
        <Text>{v.texte}</Text>
        {v.prio ? <Text color="red" bold> PRIO</Text> : null}
        {v.echeance ? <Text color="magenta"> 📅 {v.echeance}</Text> : null}
      </Text>
    )

    const section = (titre: string, liste: EntreeVue[], cle: string) =>
      liste.length === 0 ? null : (
        <Box key={cle} flexDirection="column">
          <Text bold dimColor>
            {'  '}
            {titre}
          </Text>
          {liste.map(ligne)}
        </Box>
      )

    return (
      <Box flexDirection="column">
        <Button key="basculer" plain onPress={() => update($, bandeauOuvert, o => !o)}>
          <Text color="cyan">
            {ouvert ? '▾' : '▸'} 📋 {b.projet}
          </Text>
          <Text dimColor>
            {' · '}
            {b.taches} tâche{s(b.taches)} · {b.questions} question{s(b.questions)} client
          </Text>
        </Button>
        {ouvert ? section('TÂCHES', entrees.filter(v => v.type === 'tache'), 'bt') : null}
        {ouvert ? section('QUESTIONS CLIENT', entrees.filter(v => v.type === 'question'), 'bq') : null}
      </Box>
    )
  })
}
