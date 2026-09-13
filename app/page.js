'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabase } from '../lib/supabase'

const presets = {
  cine: { bg:'#0d0d0d', panel:'#161616', side:'#101010', text:'#f5f1e8', muted:'#aaa49a', accent:'#d9c7a3', radius:18, font:'Georgia' },
  editorial: { bg:'#f4f0e8', panel:'#fffdf9', side:'#e5ddd0', text:'#211f1b', muted:'#716b62', accent:'#9a6a3a', radius:14, font:'Georgia' },
  memorias: { bg:'#241d18', panel:'#302720', side:'#1b1612', text:'#f3e5cf', muted:'#b8a58d', accent:'#d3a96f', radius:20, font:'Georgia' },
  noche: { bg:'#09111f', panel:'#101b2e', side:'#07101c', text:'#eef4ff', muted:'#9babc3', accent:'#8fb8ff', radius:18, font:'Arial' }
}

export default function Home() {
  const supabase = useMemo(() => getSupabase(), [])
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMsg, setAuthMsg] = useState('')
  const [page, setPage] = useState('inicio')
  const [project, setProject] = useState(null)
  const [stories, setStories] = useState([])
  const [people, setPeople] = useState([])
  const [chapters, setChapters] = useState([])
  const [media, setMedia] = useState([])
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [personName, setPersonName] = useState('')
  const [personRole, setPersonRole] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [theme, setTheme] = useState(presets.cine)
  const [brand, setBrand] = useState('NO SE QUIEN SOY')

  useEffect(() => {
    const saved = localStorage.getItem('nsqs_theme_cloud')
    if (saved) {
      try {
        const s = JSON.parse(saved)
        setTheme(s.theme || presets.cine)
        setBrand(s.brand || 'NO SE QUIEN SOY')
      } catch {}
    }

    supabase.auth.getSession().then(({data}) => setSession(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    return () => sub.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (session?.user) boot()
  }, [session])

  function flash(t) {
    setNotice(t)
    setTimeout(() => setNotice(''), 3500)
  }

  async function signIn(e) {
    e.preventDefault()
    setAuthMsg('Entrando...')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setAuthMsg(error ? error.message : '')
  }

  async function signUp() {
    if (!email || !password) {
      return setAuthMsg('Completá email y contraseña.')
    }

    const { error } = await supabase.auth.signUp({
      email,
      password
    })

    setAuthMsg(
      error
        ? error.message
        : 'Usuario creado. Si Supabase pide confirmación, revisá el email.'
    )
  }

  async function boot() {
    setBusy(true)

    const uid = session.user.id

    let { data: p } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', uid)
      .limit(1)
      .maybeSingle()

    if (!p) {
      const r = await supabase
        .from('projects')
        .insert({
          owner_id: uid,
          title: 'NO SE QUIEN SOY'
        })
        .select()
        .single()

      p = r.data
    }

    setProject(p)

    if (p) {
      await Promise.all([
        loadStories(p.id),
        loadPeople(p.id),
        loadChapters(p.id),
        loadMedia(p.id),
        loadSettings(p.id)
      ])
    }

    setBusy(false)
  }

  async function loadStories(pid) {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('project_id', pid)
      .order('created_at', { ascending: false })

    setStories(data || [])
  }

  async function loadPeople(pid) {
    const { data } = await supabase
      .from('people')
      .select('*')
      .eq('project_id', pid)
      .order('created_at', { ascending: false })

    setPeople(data || [])
  }

  async function loadChapters(pid) {
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('project_id', pid)
      .order('chapter_number', { ascending: true })

    setChapters(data || [])
  }

  async function loadMedia(pid) {
    const { data } = await supabase
      .from('media')
      .select('*')
      .eq('project_id', pid)
      .order('created_at', { ascending: false })

    setMedia(data || [])
  }

  async function loadSettings(pid) {
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('project_id', pid)
      .maybeSingle()

    if (data) {
      setTheme({
        bg: data.background_color || presets.cine.bg,
        panel: data.panel_color || presets.cine.panel,
        side: data.panel_color || presets.cine.side,
        text: data.text_color || presets.cine.text,
        muted: '#aaa49a',
        accent: data.accent_color || presets.cine.accent,
        radius: data.border_radius || 18,
        font: data.font_family || 'Georgia'
      })
    }
  }

  async function saveStory() {
    if (!story.trim() && !title.trim()) return

    const row = {
      project_id: project.id,
      owner_id: session.user.id,
      title: title || 'Recuerdo sin título',
      original_text: story,
      source_type: 'written'
    }

    const { error } = await supabase.from('stories').insert(row)

    if (error) return flash(error.message)

    setTitle('')
    setStory('')

    await loadStories(project.id)

    flash('Recuerdo guardado en Supabase.')
  }

  async function addPerson() {
    if (!personName.trim()) return

    const { error } = await supabase.from('people').insert({
      project_id: project.id,
      owner_id: session.user.id,
      name: personName,
      role: personRole
    })

    if (error) return flash(error.message)

    setPersonName('')
    setPersonRole('')

    await loadPeople(project.id)
  }

  async function addChapter() {
    const n = (chapters.at(-1)?.chapter_number || chapters.length) + 1

    await supabase.from('chapters').insert({
      project_id: project.id,
      owner_id: session.user.id,
      chapter_number: n,
      title: `Capítulo ${n}`,
      content: 'Material pendiente'
    })

    await loadChapters(project.id)
  }

  async function deleteRow(table, id, loader) {
    if (!confirm('¿Eliminar?')) return

    await supabase.from(table).delete().eq('id', id)
    await loader(project.id)
  }

  async function uploadFiles(fileList, mediaType) {
    const files = [...fileList]

    if (!files.length) return

    setBusy(true)

    for (const file of files) {
      const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

      const folder =
        mediaType === 'audio'
          ? 'audios'
          : mediaType === 'photo'
          ? 'fotos'
          : mediaType === 'video'
          ? 'videos'
          : 'documentos'

      const path =
        `${session.user.id}/${folder}/${Date.now()}-${clean}`

      const up = await supabase.storage
        .from('memorias')
        .upload(path, file, { upsert: false })

      if (up.error) {
        flash(up.error.message)
        continue
      }

      await supabase.from('media').insert({
        project_id: project.id,
        owner_id: session.user.id,
        media_type: mediaType,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        file_size: file.size
      })
    }

    await loadMedia(project.id)

    setBusy(false)

    flash(`${files.length} archivo(s) guardado(s) en la nube.`)
  }

  async function signedUrl(item) {
    const { data, error } = await supabase.storage
      .from('memorias')
      .createSignedUrl(item.storage_path, 3600)

    if (error) return flash(error.message)

    window.open(data.signedUrl, '_blank')
  }

  async function deleteMedia(item) {
    if (!confirm('¿Eliminar este archivo?')) return

    await supabase.storage
      .from('memorias')
      .remove([item.storage_path])

    await supabase
      .from('media')
      .delete()
      .eq('id', item.id)

    await loadMedia(project.id)
  }

  async function askHistory() {
    if (!question.trim()) return

    setAnswer('Buscando en la historia...')

    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question,
          stories: stories.map(s => ({
            title: s.title,
            text: s.original_text || ''
          }))
        })
      })

      const j = await r.json()

      if (!r.ok) throw new Error(j.error)

      setAnswer(j.answer)
    } catch {
      const terms = question
        .toLowerCase()
        .split(/\s+/)
        .filter(x => x.length > 3)

      const hits = stories.filter(s =>
        terms.some(t =>
          `${s.title} ${s.original_text || ''}`
            .toLowerCase()
            .includes(t)
        )
      )

      setAnswer(
        hits.length
          ? `Encontré: ${hits
              .slice(0, 6)
              .map(x => x.title)
              .join(' · ')}`
          : 'Todavía no encontré material relacionado. La IA se activa al agregar OPENAI_API_KEY en Vercel.'
      )
    }
  }

  async function saveTheme(next, nextBrand = brand) {
    setTheme(next)
    setBrand(nextBrand)

    localStorage.setItem(
      'nsqs_theme_cloud',
      JSON.stringify({
        theme: next,
        brand: nextBrand
      })
    )

    if (project) {
      await supabase.from('app_settings').upsert(
        {
          project_id: project.id,
          owner_id: session.user.id,
          theme: 'custom',
          background_color: next.bg,
          panel_color: next.panel,
          text_color: next.text,
          accent_color: next.accent,
          font_family: next.font,
          border_radius: next.radius
        },
        {
          onConflict: 'project_id'
        }
      )
    }
  }

  const style = {
    '--bg': theme.bg,
    '--panel': theme.panel,
    '--side': theme.side,
    '--text': theme.text,
    '--muted': theme.muted,
    '--accent': theme.accent,
    '--radius': `${theme.radius}px`,
    '--font': theme.font
  }

  const counts = {
    audios: media.filter(x => x.media_type === 'audio').length,
    fotos: media.filter(x => x.media_type === 'photo').length,
    videos: media.filter(x => x.media_type === 'video').length
  }

  if (!session) {
    return (
      <main className="login" style={style}>
        <div className="loginCard">
          <div className="brand">NO SE QUIEN SOY</div>

          <p className="muted">
            Archivo biográfico privado
          </p>

          <form onSubmit={signIn}>
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <input
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            <button className="primary" type="submit">
              Entrar
            </button>
          </form>

          <button
            className="secondary full"
            onClick={signUp}
          >
            Crear usuario
          </button>

          {authMsg && (
            <div className="notice">
              {authMsg}
            </div>
          )}
        </div>
      </main>
    )
  }

  const nav = [
    ['inicio', 'Inicio'],
    ['audios', 'Audios'],
    ['historia', 'Historia'],
    ['personajes', 'Personajes'],
    ['libro', 'El Libro'],
    ['serie', 'La Serie'],
    ['archivo', 'Archivo'],
    ['media', 'Fotos y Videos'],
    ['diseno', 'Diseño']
  ]

  return (
    <div className="app" style={style}>

      <aside className="sidebar">

        <div className="brand">
          {brand}
        </div>

        <nav>
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={page === id ? 'active' : ''}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          className="logout"
          onClick={() => supabase.auth.signOut()}
        >
          Cerrar sesión
        </button>

      </aside>

      <main className="main">

        {notice && (
          <div className="notice floating">
            {notice}
          </div>
        )}

        {busy && (
          <div className="busy">
            Guardando…
          </div>
        )}

        {page === 'inicio' && (
          <>
            <Header
              kicker="Proyecto biográfico privado"
              title="La historia de una vida extraordinaria"
            />

            <div className="actions">

              <button
                className="primary"
                onClick={() => setPage('historia')}
              >
                ✎ Escribir recuerdo
              </button>

              <Upload
                label="Subir audios"
                accept="audio/*"
                onFiles={f => uploadFiles(f, 'audio')}
              />

              <Upload
                label="Subir fotos"
                accept="image/*"
                onFiles={f => uploadFiles(f, 'photo')}
              />

            </div>

            <div className="stats">

              <Stat
                label="Audios"
                value={counts.audios}
              />

              <Stat
                label="Historias"
                value={stories.length}
              />

              <Stat
                label="Personajes"
                value={people.length}
              />

              <Stat
                label="Capítulos"
                value={chapters.length}
              />

            </div>

            <div className="hero">

              <Card>

                <div className="sectionTitle">
                  Preguntale a la historia
                </div>

                <h2>
                  Buscá recuerdos, personas, años o escenas
                </h2>

                <div className="chat">

                  <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Ej.: ¿Qué pasó en 1985?"
                  />

                  <button
                    className="primary"
                    onClick={askHistory}
                  >
                    Preguntar
                  </button>

                </div>

                {answer && (
                  <div className="item">
                    {answer}
                  </div>
                )}

              </Card>

              <Card>

                <div className="sectionTitle">
                  Próxima entrevista
                </div>

                <div className="timeline">

                  <div>
                    <b>Infancia</b>
                    <span>
                      ¿Cuál es el primer recuerdo que conservás?
                    </span>
                  </div>

                  <div>
                    <b>Familia</b>
                    <span>
                      ¿Quién fue la persona que más influyó?
                    </span>
                  </div>

                  <div>
                    <b>Giro de vida</b>
                    <span>
                      ¿Qué decisión cambió todo?
                    </span>
                  </div>

                </div>

              </Card>

            </div>
          </>
        )}

        {page === 'historia' && (
          <>

            <Header
              kicker="Narrativa"
              title="Historia"
            />

            <div className="two">

              <Card>

                <div className="sectionTitle">
                  Nuevo recuerdo
                </div>

                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Título del recuerdo"
                />

                <textarea
                  value={story}
                  onChange={e => setStory(e.target.value)}
                  placeholder="Escribí libremente el recuerdo..."
                />

                <button
                  className="primary"
                  onClick={saveStory}
                >
                  Guardar historia
                </button>

              </Card>

              <Card>

                <div className="sectionTitle">
                  Modo de escritura
                </div>

                <p className="muted">
                  Original · Corregida · Literaria.
                  La fuente original siempre queda preservada.
                </p>

              </Card>

            </div>

            <List>
              {stories.map(s => (
                <Item
                  key={s.id}
                  title={s.title}
                  meta={new Date(s.created_at).toLocaleString()}
                  text={s.original_text}
                  onDelete={() =>
                    deleteRow(
                      'stories',
                      s.id,
                      loadStories
                    )
                  }
                />
              ))}
            </List>

          </>
        )}

        {page === 'personajes' && (
          <>

            <Header
              kicker="Universo real"
              title="Personajes"
            />

            <div className="two">

              <Card>

                <input
                  value={personName}
                  onChange={e =>
                    setPersonName(e.target.value)
                  }
                  placeholder="Nombre"
                />

                <input
                  value={personRole}
                  onChange={e =>
                    setPersonRole(e.target.value)
                  }
                  placeholder="Relación / rol"
                />

                <button
                  className="primary"
                  onClick={addPerson}
                >
                  Agregar personaje
                </button>

              </Card>

              <Card>

                <div className="sectionTitle">
                  Cronología
                </div>

                <p className="muted">
                  La IA podrá relacionar personas, años,
                  lugares y acontecimientos.
                </p>

              </Card>

            </div>

            <List>

              {people.map(p => (
                <Item
                  key={p.id}
                  title={p.name}
                  meta={p.role || 'Sin relación definida'}
                  onDelete={() =>
                    deleteRow(
                      'people',
                      p.id,
                      loadPeople
                    )
                  }
                />
              ))}

            </List>

          </>
        )}

        {page === 'libro' && (
          <>

            <Header
              kicker="Edición"
              title="El Libro"
              right={
                <button
                  className="primary"
                  onClick={addChapter}
                >
                  + Capítulo
                </button>
              }
            />

            <List>

              {chapters.map(c => (
                <Item
                  key={c.id}
                  title={c.title}
                  meta={`Capítulo ${c.chapter_number || ''}`}
                  text={c.content}
                  onDelete={() =>
                    deleteRow(
                      'chapters',
                      c.id,
                      loadChapters
                    )
                  }
                />
              ))}

            </List>

          </>
        )}

        {page === 'audios' && (
          <>

            <Header
              kicker="Archivo oral"
              title="Audios"
            />

            <Upload
              label="Subir varios audios"
              accept="audio/*"
              onFiles={f =>
                uploadFiles(f, 'audio')
              }
            />

            <MediaList
              items={media.filter(
                x => x.media_type === 'audio'
              )}
              open={signedUrl}
              del={deleteMedia}
            />

          </>
        )}

        {page === 'archivo' && (
          <>

            <Header
              kicker="Fuentes"
              title="Archivo documental"
            />

            <Upload
              label="Subir documentos"
              accept=".pdf,.doc,.docx,image/*"
              onFiles={f =>
                uploadFiles(f, 'file')
              }
            />

            <MediaList
              items={media.filter(
                x => x.media_type === 'file'
              )}
              open={signedUrl}
              del={deleteMedia}
            />

          </>
        )}

        {page === 'media' && (
          <>

            <Header
              kicker="Archivo visual"
              title="Fotos y Videos"
            />

            <div className="actions">

              <Upload
                label="Subir fotos"
                accept="image/*"
                onFiles={f =>
                  uploadFiles(f, 'photo')
                }
              />

              <Upload
                label="Subir videos"
                accept="video/*"
                onFiles={f =>
                  uploadFiles(f, 'video')
                }
              />

            </div>

            <div className="two">

              <Card>

                <div className="sectionTitle">
                  Fotografías
                </div>

                <MediaList
                  items={media.filter(
                    x => x.media_type === 'photo'
                  )}
                  open={signedUrl}
                  del={deleteMedia}
                />

              </Card>

              <Card>

                <div className="sectionTitle">
                  Videos
                </div>

                <MediaList
                  items={media.filter(
                    x => x.media_type === 'video'
                  )}
                  open={signedUrl}
                  del={deleteMedia}
                />

              </Card>

            </div>

          </>
        )}

        {page === 'serie' && (
          <>

            <Header
              kicker="Adaptación audiovisual"
              title="La Serie"
            />

            <div className="three">

              <Card>

                <div className="sectionTitle">
                  Logline
                </div>

                <p>
                  Una vida marcada por decisiones
                  extraordinarias, éxitos, pérdidas y
                  secretos familiares que atraviesan décadas.
                </p>

              </Card>

              <Card>

                <div className="sectionTitle">
                  Temporada 1
                </div>

                <p className="muted">
                  8 episodios · estructura pendiente
                  de la historia real.
                </p>

              </Card>

              <Card>

                <div className="sectionTitle">
                  Regla
                </div>

                <p>
                  Hecho documentado y reconstrucción
                  dramática siempre diferenciados.
                </p>

              </Card>

            </div>

          </>
        )}

        {page === 'diseno' && (
          <>

            <Header
              kicker="Personalización"
              title="Diseño"
            />

            <div className="presetRow">

              {Object.entries(presets).map(
                ([k, v]) => (
                  <button
                    className="secondary"
                    key={k}
                    onClick={() => saveTheme(v)}
                  >
                    {k}
                  </button>
                )
              )}

            </div>

            <div className="two">

              <Card>

                <label>
                  Título

                  <input
                    value={brand}
                    onChange={e =>
                      setBrand(e.target.value)
                    }
                    onBlur={() =>
                      saveTheme(theme, brand)
                    }
                  />
                </label>

                <Color
                  label="Fondo"
                  value={theme.bg}
                  onChange={v =>
                    saveTheme({
                      ...theme,
                      bg: v
                    })
                  }
                />

                <Color
                  label="Paneles"
                  value={theme.panel}
                  onChange={v =>
                    saveTheme({
                      ...theme,
                      panel: v
                    })
                  }
                />

                <Color
                  label="Acento"
                  value={theme.accent}
                  onChange={v =>
                    saveTheme({
                      ...theme,
                      accent: v
                    })
                  }
                />

                <Color
                  label="Texto"
                  value={theme.text}
                  onChange={v =>
                    saveTheme({
                      ...theme,
                      text: v
                    })
                  }
                />

              </Card>

              <Card>

                <label>
                  Bordes: {theme.radius}px

                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={theme.radius}
                    onChange={e =>
                      saveTheme({
                        ...theme,
                        radius: +e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Tipografía

                  <select
                    value={theme.font}
                    onChange={e =>
                      saveTheme({
                        ...theme,
                        font: e.target.value
                      })
                    }
                  >
                    <option>Georgia</option>
                    <option>Arial</option>
                    <option>Inter</option>
                  </select>
                </label>

                <p className="muted">
                  Los cambios se guardan en Supabase
                  y en este dispositivo.
                </p>

              </Card>

            </div>

          </>
        )}

      </main>

    </div>
  )
}

function Header({ kicker, title, right }) {
  return (
    <div className="header">

      <div>
        <div className="kicker">
          {kicker}
        </div>

        <h1>
          {title}
        </h1>
      </div>

      {right}

    </div>
  )
}

function Card({ children }) {
  return (
    <div className="card">
      {children}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card stat">

      <span>
        {label}
      </span>

      <b>
        {value}
      </b>

    </div>
  )
}

function List({ children }) {
  return (
    <div className="list">

      {children?.length
        ? children
        : (
          <div className="empty">
            Todavía no hay contenido.
          </div>
        )
      }

    </div>
  )
}

function Item({
  title,
  meta,
  text,
  onDelete
}) {
  return (
    <div className="item">

      <div>

        <h3>
          {title}
        </h3>

        <div className="muted">
          {meta}
        </div>

        {text && (
          <p>
            {text}
          </p>
        )}

      </div>

      <button
        className="danger"
        onClick={onDelete}
      >
        Eliminar
      </button>

    </div>
  )
}

function Upload({
  label,
  accept,
  onFiles
}) {
  return (
    <label className="primary upload">

      {label}

      <input
        hidden
        type="file"
        multiple
        accept={accept}
        onChange={e =>
          onFiles(e.target.files)
        }
      />

    </label>
  )
}

function MediaList({
  items,
  open,
  del
}) {
  return (
    <div className="list">

      {items.length
        ? items.map(m => (
          <div
            className="item"
            key={m.id}
          >

            <div>

              <h3>
                {m.file_name}
              </h3>

              <div className="muted">

                {m.mime_type || m.media_type}

                {' · '}

                {m.file_size
                  ? `${(m.file_size / 1024 / 1024).toFixed(2)} MB`
                  : ''
                }

              </div>

            </div>

            <div className="actions">

              <button
                className="secondary"
                onClick={() => open(m)}
              >
                Abrir
              </button>

              <button
                className="danger"
                onClick={() => del(m)}
              >
                Eliminar
              </button>

            </div>

          </div>
        ))
        : (
          <div className="empty">
            Todavía no hay archivos.
          </div>
        )
      }

    </div>
  )
}

function Color({
  label,
  value,
  onChange
}) {
  return (
    <label className="colorRow">

      <span>
        {label}
      </span>

      <input
        type="color"
        value={value}
        onChange={e =>
          onChange(e.target.value)
        }
      />

      <code>
        {value}
      </code>

    </label>
  )
}
