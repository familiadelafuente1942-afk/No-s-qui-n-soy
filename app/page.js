'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

const NAV = [
  ['inicio', 'Inicio'],
  ['audios', 'Audios'],
  ['historia', 'Historia'],
  ['personajes', 'Personajes'],
  ['libro', 'El Libro'],
  ['serie', 'La Serie'],
  ['archivo', 'Archivo'],
  ['media', 'Fotos y Videos'],
  ['diseno', 'Diseño'],
]

export default function Home() {
  const [section, setSection] = useState('inicio')
  const [supabase, setSupabase] = useState(null)
  const [status, setStatus] = useState('Preparando archivo...')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const client = getSupabase()
      setSupabase(client)
      setStatus('Archivo conectado')
    } catch (err) {
      setStatus('Modo local')
      setError(err?.message || '')
    }
  }, [])

  return (
    <div className="appShell">

      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">NS</div>

          <div>
            <div className="brandTitle">
              NO SE QUIEN SOY
            </div>

            <div className="brandSubtitle">
              Archivo biográfico
            </div>
          </div>
        </div>

        <nav className="navigation">
          {NAV.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                section === id
                  ? 'navButton active'
                  : 'navButton'
              }
              onClick={() => setSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebarBottom">
          <span className="statusDot" />
          {status}
        </div>
      </aside>

      <main className="workspace">

        <header className="topbar">
          <div>
            <div className="eyebrow">
              MEMORIAS DE UNA VIDA EXTRAORDINARIA
            </div>

            <h1>NO SE QUIEN SOY</h1>
          </div>

          <div className="topActions">
            <button
              type="button"
              className="secondaryButton"
              onClick={() => setSection('archivo')}
            >
              Archivo
            </button>

            <button
              type="button"
              className="primaryButton"
              onClick={() => setSection('audios')}
            >
              + Nueva memoria
            </button>
          </div>
        </header>

        {error && (
          <div className="warning">
            La interfaz funciona, pero falta revisar la conexión
            con la base de datos: {error}
          </div>
        )}

        {section === 'inicio' && (
          <Inicio setSection={setSection} />
        )}

        {section === 'audios' && (
          <Audios supabase={supabase} />
        )}

        {section === 'historia' && (
          <Historia supabase={supabase} />
        )}

        {section === 'personajes' && (
          <Personajes supabase={supabase} />
        )}

        {section === 'libro' && (
          <Libro supabase={supabase} />
        )}

        {section === 'serie' && (
          <Serie supabase={supabase} />
        )}

        {section === 'archivo' && (
          <Archivo />
        )}

        {section === 'media' && (
          <Media supabase={supabase} />
        )}

        {section === 'diseno' && (
          <Diseno />
        )}

      </main>
    </div>
  )
}

/* =========================================================
   INICIO
========================================================= */

function Inicio({ setSection }) {
  return (
    <section className="pageSection">

      <div className="heroCard">
        <div className="heroText">

          <div className="eyebrow">
            PROYECTO BIOGRÁFICO
          </div>

          <h2>
            Una vida.
            <br />
            Miles de recuerdos.
          </h2>

          <p>
            Guardá audios, escribí recuerdos, incorporá
            fotografías y videos. El archivo irá creciendo
            hasta convertirse en un libro y, posteriormente,
            en una serie.
          </p>

          <div className="heroActions">

            <button
              type="button"
              className="primaryButton"
              onClick={() => setSection('audios')}
            >
              Grabar una memoria
            </button>

            <button
              type="button"
              className="secondaryButton"
              onClick={() => setSection('historia')}
            >
              Escribir
            </button>

          </div>
        </div>

        <div className="quoteCard">
          <div className="quoteMark">“</div>

          <p>
            Hay historias que no deberían perderse.
          </p>

          <span>
            NO SE QUIEN SOY
          </span>
        </div>
      </div>

      <div className="statsGrid">

        <Stat
          value="0"
          label="Memorias"
        />

        <Stat
          value="0"
          label="Capítulos"
        />

        <Stat
          value="0"
          label="Personajes"
        />

        <Stat
          value="0"
          label="Archivos"
        />

      </div>

      <div className="sectionHeader">
        <div>
          <div className="eyebrow">
            EMPEZAR
          </div>

          <h2>
            ¿Qué querés guardar hoy?
          </h2>
        </div>
      </div>

      <div className="actionGrid">

        <ActionCard
          title="Contar una historia"
          text="Grabá un audio. Después podremos convertirlo en texto y organizarlo."
          action="Grabar"
          onClick={() => setSection('audios')}
        />

        <ActionCard
          title="Escribir un recuerdo"
          text="Escribí directamente cuando no puedas o no quieras hablar."
          action="Escribir"
          onClick={() => setSection('historia')}
        />

        <ActionCard
          title="Guardar fotos y videos"
          text="Incorporá material visual al archivo biográfico."
          action="Agregar archivos"
          onClick={() => setSection('media')}
        />

        <ActionCard
          title="Construir el libro"
          text="Organizá los recuerdos como capítulos de la historia."
          action="Ver libro"
          onClick={() => setSection('libro')}
        />

      </div>

    </section>
  )
}

function Stat({ value, label }) {
  return (
    <div className="statCard">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function ActionCard({
  title,
  text,
  action,
  onClick
}) {
  return (
    <article className="actionCard">

      <div className="actionIcon">
        +
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <button
        type="button"
        className="textButton"
        onClick={onClick}
      >
        {action} →
      </button>

    </article>
  )
}

/* =========================================================
   AUDIOS
========================================================= */

function Audios({ supabase }) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')

  async function saveMemory() {
    setMessage('')

    if (!title.trim() && !notes.trim()) {
      setMessage(
        'Escribí un título o una memoria.'
      )
      return
    }

    if (!supabase) {
      setMessage(
        'La memoria está preparada, pero Supabase todavía no está conectado.'
      )
      return
    }

    try {
      const { error } = await supabase
        .from('stories')
        .insert({
          title:
            title.trim() ||
            'Memoria sin título',
          content: notes
        })

      if (error) throw error

      setTitle('')
      setNotes('')
      setMessage('Memoria guardada.')
    } catch (err) {
      setMessage(
        err?.message ||
        'No se pudo guardar.'
      )
    }
  }

  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="MEMORIAS"
        title="Contar una historia"
        description="Podés escribirla ahora o utilizar esta sección como base para las futuras grabaciones y transcripciones con IA."
      />

      <div className="editorCard">

        <label>
          Título del recuerdo
        </label>

        <input
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          placeholder="Ej: La primera vez que..."
        />

        <label>
          Historia
        </label>

        <textarea
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
          placeholder="Contá lo que recuerdes. No importa el orden ni cómo esté escrito..."
        />

        <div className="editorActions">

          <button
            type="button"
            className="recordButton"
            onClick={() =>
              setMessage(
                'La grabación de audio será el siguiente módulo que conectaremos.'
              )
            }
          >
            ● Grabar audio
          </button>

          <button
            type="button"
            className="primaryButton"
            onClick={saveMemory}
          >
            Guardar memoria
          </button>

        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

      </div>

    </section>
  )
}

/* =========================================================
   HISTORIA
========================================================= */

function Historia({ supabase }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')

  async function save() {
    if (!text.trim()) {
      setMessage(
        'Escribí algo antes de guardar.'
      )
      return
    }

    if (!supabase) {
      setMessage(
        'Supabase todavía no está conectado.'
      )
      return
    }

    try {
      const { error } = await supabase
        .from('stories')
        .insert({
          title:
            title ||
            'Historia sin título',
          content: text
        })

      if (error) throw error

      setTitle('')
      setText('')
      setMessage('Historia guardada.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="ESCRITURA"
        title="La Historia"
        description="Un espacio libre para escribir recuerdos sin preocuparse todavía por capítulos, fechas o estructura."
      />

      <div className="writingDesk">

        <input
          className="chapterTitleInput"
          placeholder="Título"
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
        />

        <textarea
          className="bookTextarea"
          placeholder="Empezá a escribir..."
          value={text}
          onChange={(e) =>
            setText(e.target.value)
          }
        />

        <div className="editorActions">

          <span className="wordCount">
            {
              text.trim()
                ? text.trim().split(/\s+/).length
                : 0
            } palabras
          </span>

          <button
            type="button"
            className="primaryButton"
            onClick={save}
          >
            Guardar
          </button>

        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

      </div>

    </section>
  )
}

/* =========================================================
   PERSONAJES
========================================================= */

function Personajes({ supabase }) {
  const [name, setName] = useState('')
  const [relation, setRelation] =
    useState('')
  const [description, setDescription] =
    useState('')
  const [message, setMessage] =
    useState('')

  async function save() {
    if (!name.trim()) {
      setMessage(
        'Escribí el nombre del personaje.'
      )
      return
    }

    if (!supabase) {
      setMessage(
        'Supabase todavía no está conectado.'
      )
      return
    }

    try {
      const { error } = await supabase
        .from('people')
        .insert({
          name,
          relation,
          description
        })

      if (error) throw error

      setName('')
      setRelation('')
      setDescription('')
      setMessage('Personaje guardado.')
    } catch (err) {
      setMessage(err.message)
    }
  }

  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="PERSONAJES"
        title="Las personas de la historia"
        description="Familia, amigos, socios, amores, adversarios y todas las personas que formaron parte de la vida."
      />

      <div className="editorCard">

        <div className="twoColumns">

          <div>
            <label>
              Nombre
            </label>

            <input
              placeholder="Nombre completo"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div>
            <label>
              Relación
            </label>

            <input
              placeholder="Padre, amigo, socio..."
              value={relation}
              onChange={(e) =>
                setRelation(e.target.value)
              }
            />
          </div>

        </div>

        <label>
          ¿Quién era?
        </label>

        <textarea
          placeholder="Describí a esta persona, cómo era, cuándo apareció en la historia y por qué fue importante..."
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
        />

        <button
          type="button"
          className="primaryButton"
          onClick={save}
        >
          Guardar personaje
        </button>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

      </div>

    </section>
  )
}

/* =========================================================
   LIBRO
========================================================= */

function Libro() {
  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="EL LIBRO"
        title="NO SE QUIEN SOY"
        description="Las memorias se transformarán progresivamente en capítulos."
      />

      <div className="bookLayout">

        <div className="bookCover">

          <div className="bookSmall">
            MEMORIAS
          </div>

          <div className="bookName">
            NO SE
            <br />
            QUIEN
            <br />
            SOY
          </div>

          <div className="bookLine" />

          <div className="bookSmall">
            UNA HISTORIA REAL
          </div>

        </div>

        <div className="chapters">

          <h3>
            Estructura del libro
          </h3>

          <Chapter
            number="01"
            title="Los primeros recuerdos"
          />

          <Chapter
            number="02"
            title="La familia"
          />

          <Chapter
            number="03"
            title="El comienzo"
          />

          <Chapter
            number="04"
            title="Los años que cambiaron todo"
          />

          <button
            type="button"
            className="secondaryButton"
          >
            + Nuevo capítulo
          </button>

        </div>

      </div>

    </section>
  )
}

function Chapter({ number, title }) {
  return (
    <div className="chapterRow">
      <span>{number}</span>
      <strong>{title}</strong>
      <span>→</span>
    </div>
  )
}

/* =========================================================
   SERIE
========================================================= */

function Serie() {
  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="ADAPTACIÓN AUDIOVISUAL"
        title="La Serie"
        description="Convertir una vida extraordinaria en una historia audiovisual."
      />

      <div className="seriesHero">

        <div className="seriesNumber">
          01
        </div>

        <div>
          <div className="eyebrow">
            TEMPORADA 1
          </div>

          <h2>
            NO SE QUIEN SOY
          </h2>

          <p>
            Desarrollo de episodios,
            personajes, escenas, conflictos,
            lugares y línea narrativa.
          </p>
        </div>

      </div>

      <div className="episodeGrid">

        <Episode
          number="01"
          title="El origen"
        />

        <Episode
          number="02"
          title="Antes de saber"
        />

        <Episode
          number="03"
          title="El punto de quiebre"
        />

        <Episode
          number="04"
          title="Otra vida"
        />

      </div>

    </section>
  )
}

function Episode({ number, title }) {
  return (
    <div className="episodeCard">
      <span>
        EPISODIO {number}
      </span>

      <h3>{title}</h3>

      <p>
        Sinopsis por desarrollar.
      </p>
    </div>
  )
}

/* =========================================================
   ARCHIVO
========================================================= */

function Archivo() {
  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="ARCHIVO CENTRAL"
        title="Todo en un solo lugar"
        description="Documentos, recuerdos, entrevistas, fotografías, audios y material histórico."
      />

      <div className="archiveGrid">

        <ArchiveCard
          title="Memorias"
          description="Historias escritas y transcripciones."
        />

        <ArchiveCard
          title="Documentos"
          description="Cartas, documentos y archivos históricos."
        />

        <ArchiveCard
          title="Investigación"
          description="Información para verificar fechas, lugares y acontecimientos."
        />

        <ArchiveCard
          title="Material audiovisual"
          description="Fotografías, videos y grabaciones."
        />

      </div>

    </section>
  )
}

function ArchiveCard({
  title,
  description
}) {
  return (
    <div className="archiveCard">
      <div className="folderIcon">
        ▰
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <button
        type="button"
        className="textButton"
      >
        Abrir →
      </button>
    </div>
  )
}

/* =========================================================
   FOTOS Y VIDEOS
========================================================= */

function Media() {
  const [files, setFiles] = useState([])

  function selectFiles(event) {
    const selected =
      Array.from(event.target.files || [])

    setFiles((current) => [
      ...current,
      ...selected
    ])
  }

  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="ARCHIVO VISUAL"
        title="Fotos y Videos"
        description="Podés seleccionar varios archivos al mismo tiempo."
      />

      <label className="uploadZone">

        <div className="uploadPlus">
          +
        </div>

        <h3>
          Agregar fotos y videos
        </h3>

        <p>
          Tocá acá para seleccionar uno o varios archivos.
        </p>

        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={selectFiles}
          hidden
        />

      </label>

      {files.length > 0 && (
        <div className="selectedFiles">

          <div className="sectionHeader">
            <h3>
              Archivos seleccionados
            </h3>

            <span>
              {files.length}
            </span>
          </div>

          <div className="fileGrid">

            {files.map((file, index) => (
              <div
                className="fileCard"
                key={`${file.name}-${index}`}
              >
                <strong>
                  {file.name}
                </strong>

                <span>
                  {
                    (
                      file.size /
                      1024 /
                      1024
                    ).toFixed(1)
                  } MB
                </span>
              </div>
            ))}

          </div>

        </div>
      )}

    </section>
  )
}

/* =========================================================
   DISEÑO
========================================================= */

function Diseno() {
  return (
    <section className="pageSection">

      <PageTitle
        eyebrow="IDENTIDAD"
        title="Diseño del proyecto"
        description="Identidad visual del libro, archivo y futura serie."
      />

      <div className="designGrid">

        <div className="designCard dark">
          <span>
            NO SE QUIEN SOY
          </span>

          <strong>
            Archivo
            <br />
            biográfico
          </strong>
        </div>

        <div className="designCard light">
          <span>
            NO SE QUIEN SOY
          </span>

          <strong>
            El Libro
          </strong>
        </div>

        <div className="designCard cinematic">
          <span>
            UNA SERIE ORIGINAL
          </span>

          <strong>
            NO SE
            <br />
            QUIEN SOY
          </strong>
        </div>

      </div>

    </section>
  )
}

/* =========================================================
   TITULO DE SECCIONES
========================================================= */

function PageTitle({
  eyebrow,
  title,
  description
}) {
  return (
    <div className="pageTitle">

      <div className="eyebrow">
        {eyebrow}
      </div>

      <h2>{title}</h2>

      <p>{description}</p>

    </div>
  )
}
