'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [section, setSection] = useState('inicio')
  const [title, setTitle] = useState('NO SE QUIEN SOY')
  const [text, setText] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('memorias-texto')
    if (saved) setText(saved)
  }, [])

  function saveText() {
    localStorage.setItem('memorias-texto', text)
    alert('Texto guardado')
  }

  return (
    <main>
      <header className="hero">
        <div className="eyebrow">MEMORIAS DE UNA VIDA</div>
        <h1>{title}</h1>
        <p>Archivo biográfico privado</p>
      </header>

      <nav className="nav">
        <button onClick={() => setSection('inicio')}>Inicio</button>
        <button onClick={() => setSection('escribir')}>Escribir</button>
        <button onClick={() => setSection('archivos')}>Fotos · Audios · Videos</button>
        <button onClick={() => setSection('capitulos')}>Capítulos</button>
        <button onClick={() => setSection('diseno')}>Diseño</button>
      </nav>

      <section className="content">

        {section === 'inicio' && (
          <>
            <h2>La historia</h2>
            <p>
              Un espacio privado para reconstruir una vida a través de recuerdos,
              relatos, fotografías, audios, videos y documentos.
            </p>

            <div className="cards">
              <article>
                <span>01</span>
                <h3>Contar</h3>
                <p>Escribir o dictar recuerdos sin preocuparse todavía por el orden.</p>
              </article>

              <article>
                <span>02</span>
                <h3>Conservar</h3>
                <p>Reunir fotografías, voces, videos y documentos familiares.</p>
              </article>

              <article>
                <span>03</span>
                <h3>Convertir</h3>
                <p>Transformar todo el material en un libro y, después, en una serie.</p>
              </article>
            </div>
          </>
        )}

        {section === 'escribir' && (
          <>
            <h2>Escribir una memoria</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Valeria puede escribir aquí exactamente como recuerda la historia..."
            />
            <button className="primary" onClick={saveText}>
              Guardar
            </button>
          </>
        )}

        {section === 'archivos' && (
          <>
            <h2>Archivo familiar</h2>
            <p>Seleccioná varias fotos, audios, videos o documentos a la vez.</p>

            <label className="upload">
              + Agregar archivos
              <input
                type="file"
                multiple
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
              />
            </label>

            <p className="note">
              En el próximo paso conectamos esta carga directamente con Supabase.
            </p>
          </>
        )}

        {section === 'capitulos' && (
          <>
            <h2>Capítulos</h2>
            <div className="chapter">01 · Los primeros recuerdos</div>
            <div className="chapter">02 · La familia</div>
            <div className="chapter">03 · Los años que cambiaron todo</div>
            <div className="chapter">+ Nuevo capítulo</div>
          </>
        )}

        {section === 'diseno' && (
          <>
            <h2>Diseño</h2>
            <p>Podés cambiar el título de la obra y visualizarlo inmediatamente.</p>

            <input
              className="titleInput"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="designPreview">
              <small>MEMORIAS DE UNA VIDA</small>
              <strong>{title}</strong>
              <span>Una historia real</span>
            </div>
          </>
        )}

      </section>
    </main>
  )
}
