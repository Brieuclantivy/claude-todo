import { expect, test } from 'claude-code/testing'

const AVANT = `# TODO

## qspresse

### Tâches
- [ ] #1 Porter envoiPenalite (ajouté 2026-11-20)
- [ ] #2 Doc routage (ajouté 2026-11-20)

### Questions client
- [ ] #3 PHR plafonné à -1 ? (ajouté 2026-11-20) [prio] [échéance 2026-12-01]
`

const APRES = `# TODO

## qspresse

### Tâches
- [ ] #1 Porter envoiPenalite (ajouté 2026-11-20)
- [x] #2 Doc routage (ajouté 2026-11-20) ✅ 2026-11-23

### Questions client
- [ ] #3 PHR plafonné à -1 ? (ajouté 2026-11-20) [prio] [échéance 2026-12-01]
- [ ] #4 Dépôt avant événement ? (ajouté 2026-11-23)
  - ctx : M2026-07
`

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

test('carte sous Skill(todo) et bandeau, sur chaque surface', async ($, on) => {
  let contenu = AVANT

  on('env.get', () => ({ value: '/h' }))
  on('fs.read', () => ({ value: contenu }))
  on('session.cwd', () => ({ value: '/p/qspresse' }))
  on('process.run', () => ({
    value: { exitCode: 0, stdout: '/p/qspresse\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.submit', (_, e) => e as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('tool.register', () => ({ value: { tool: 'mcp__todo-affichage__afficher' } }))

  await $.session.start({ cwd: '/p/qspresse', surface: 'vscode', isInteractive: true })

  // Le bandeau compte les entrées ouvertes du projet au démarrage
  for (const surface of SURFACES) {
    const band = await $.ui.mount({
      plugin: 'todo-affichage',
      surface,
      component: 'AbovePrompt',
      requestId: 'band',
      props: { hasSurvey: false, bodyColumns: 80 },
    } as never)
    expect(await band.find({ type: 'Text', text: /2 tâches · 1 question client/ })).toBeDefined()
    await band.unmount()
  }

  await $.prompt.submit({ text: 'ajoute une question et coche la 2' } as never)
  const appel = await $.tool.call({ tool: 'Skill', skill: 'todo', tool_use_id: 'skill-1' } as never)
  void appel
  contenu = APRES
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'todo-affichage',
      surface,
      component: 'ToolUse',
      requestId: 'skill-1',
      props: {
        tool_use_id: 'skill-1',
        tool: 'Skill',
        input: { skill: 'todo' },
        isRunning: false,
        isErrored: false,
        isInterrupted: false,
      },
    } as never)

    expect(await ui.find({ type: 'Text', text: /📋 qspresse/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /#4 Dépôt avant événement \?.*← ajoutée/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /#2 Doc routage.*← faite/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /#3 PHR plafonné à -1 \? PRIO 📅 2026-12-01/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /TÂCHES \(1\)/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /QUESTIONS CLIENT \(2\)/ })).toBeDefined()
    await ui.unmount()

    const band = await $.ui.mount({
      plugin: 'todo-affichage',
      surface,
      component: 'AbovePrompt',
      requestId: 'band',
      props: { hasSurvey: false, bodyColumns: 80 },
    } as never)
    expect(await band.find({ type: 'Text', text: /1 tâche · 2 questions client/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /#4/ })).toBeUndefined()

    // Un clic déplie la liste des entrées ouvertes, un second la replie
    await band.press({ key: 'basculer' })
    expect(await band.find({ type: 'Text', text: /▾ 📋 qspresse/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /#1 Porter envoiPenalite/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /#4 Dépôt avant événement \?/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /#3 PHR plafonné à -1 \? PRIO 📅 2026-12-01/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /#2 Doc routage/ })).toBeUndefined()

    await band.press({ key: 'basculer' })
    expect(await band.find({ type: 'Text', text: /#4/ })).toBeUndefined()
    await band.unmount()
  }
})

const TOUS_PROJETS = `${APRES}
## geoSoulte

### Tâches
- [ ] #5 Export KML (ajouté 2026-11-23)
`

function ligneOutil(id: string, input: Record<string, unknown>) {
  return {
    plugin: 'todo-affichage',
    component: 'ToolUse',
    requestId: id,
    props: { tool_use_id: id, tool: 'mcp__todo-affichage__afficher', input, isRunning: false, isErrored: false, isInterrupted: false },
  }
}

test("l'outil afficher : liste de tous les projets et ordre du jour de réunion", async ($, on) => {
  on('env.get', () => ({ value: '/h' }))
  on('fs.read', () => ({ value: TOUS_PROJETS }))
  on('session.cwd', () => ({ value: '/p/qspresse' }))
  on('process.run', () => ({
    value: { exitCode: 0, stdout: '/p/qspresse\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.register', () => ({ value: { tool: 'mcp__todo-affichage__afficher' } }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/p/qspresse', surface: 'vscode', isInteractive: true })

  const todo = { vue: 'todo' }
  const liste = await $.tool.call({ tool: 'mcp__todo-affichage__afficher', tool_use_id: 'aff-1', ...todo } as never)
  expect(String((liste as { result?: unknown }).result)).toContain('geoSoulte #5 Export KML')

  const reunion = {
    vue: 'reunion',
    projet: 'QSPRESSE',
    themes: [
      { titre: 'Délais', points: [{ id: 3, texte: 'Faut-il plafonner le délai PHR à -1 jour ?' }] },
      { titre: 'Dépôts', points: [{ id: 4, texte: 'Comment traiter un dépôt fait avant un événement ?' }] },
    ],
  }
  await $.tool.call({ tool: 'mcp__todo-affichage__afficher', tool_use_id: 'aff-2', ...reunion } as never)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...ligneOutil('aff-1', todo), surface } as never)
    expect(await ui.find({ type: 'Text', text: /✅ TODO · 2 tâches · 2 questions client/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /📋 qspresse/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /📋 geoSoulte/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /#2 Doc routage/ })).toBeUndefined()
    await ui.unmount()

    const r = await $.ui.mount({ ...ligneOutil('aff-2', reunion), surface } as never)
    expect(await r.find({ type: 'Text', text: /🗓 Réunion client — qspresse · 2 points/ })).toBeDefined()
    expect(await r.find({ type: 'Text', text: /▌ Délais/ })).toBeDefined()
    expect(await r.find({ type: 'Text', text: /PRIO Faut-il plafonner le délai PHR à -1 jour \? 📅 2026-12-01 #3/ })).toBeDefined()
    expect(await r.find({ type: 'Text', text: /Comment traiter un dépôt fait avant un événement \? #4/ })).toBeDefined()
    await r.unmount()
  }
})
