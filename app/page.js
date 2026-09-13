"use client";

import { useRef, useState } from "react";

const sections = [
  "Inicio",
  "Audios",
  "Historia",
  "Personajes",
  "El Libro",
  "La Serie",
  "Archivo",
  "Fotos y Videos",
];

export default function Home() {
  const [active, setActive] = useState("Inicio");
  const [question, setQuestion] = useState("");
  const audioInput = useRef(null);
  const mediaInput = useRef(null);

  const [stats, setStats] = useState({
    audios: 0,
    historias: 0,
    personajes: 0,
    capitulos: 0,
  });

  function subirAudios(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setStats((prev) => ({
      ...prev,
      audios: prev.audios + files.length,
    }));

    alert(`${files.length} audio(s) seleccionado(s).`);
  }

  function subirArchivos(event) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    alert(`${files.length} archivo(s) seleccionado(s).`);
  }

  function preguntar() {
    if (!question.trim()) return;

    alert(
      "La búsqueda inteligente quedará conectada a todos los recuerdos, audios, fotografías y documentos del proyecto."
    );
  }

  return (
    <div className="appShell">

      <aside className="sidebar">

        <div className="brand">
          <span>NO SE</span>
          <span>QUIEN SOY</span>
        </div>

        <nav className="navigation">
          {sections.map((section) => (
            <button
              key={section}
              className={active === section ? "navItem active" : "navItem"}
              onClick={() => setActive(section)}
            >
              {section}
            </button>
          ))}
        </nav>

        <div className="sidebarFooter">
          ARCHIVO BIOGRÁFICO
        </div>

      </aside>

      <main className="mainContent">

        {active === "Inicio" && (
          <>

            <section className="hero">

              <div className="heroTop">

                <div>
                  <div className="eyebrow">
                    PROYECTO BIOGRÁFICO PRIVADO
                  </div>

                  <h1>
                    La historia de una vida extraordinaria
                  </h1>
                </div>

                <div className="status">
                  NO INVENTAR · ACTIVO
                </div>

              </div>

              <div className="actions">

                <button
                  className="primaryButton"
                  onClick={() => audioInput.current?.click()}
                >
                  ● Grabar historia
                </button>

                <button
                  className="secondaryButton"
                  onClick={() => setActive("Historia")}
                >
                  ✎ Escribir recuerdo
                </button>

                <button
                  className="primaryButton"
                  onClick={() => audioInput.current?.click()}
                >
                  Subir varios audios
                </button>

                <button
                  className="primaryButton"
                  onClick={() => mediaInput.current?.click()}
                >
                  Subir varias fotos/documentos
                </button>

              </div>

              <input
                ref={audioInput}
                type="file"
                accept="audio/*"
                multiple
                hidden
                onChange={subirAudios}
              />

              <input
                ref={mediaInput}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                multiple
                hidden
                onChange={subirArchivos}
              />

            </section>

            <section className="statsGrid">

              <StatCard
                label="Audios"
                number={stats.audios}
              />

              <StatCard
                label="Historias"
                number={stats.historias}
              />

              <StatCard
                label="Personajes"
                number={stats.personajes}
              />

              <StatCard
                label="Capítulos"
                number={stats.capitulos}
              />

            </section>

            <section className="dashboardGrid">

              <div className="panel memorySearch">

                <div className="panelEyebrow">
                  PREGUNTALE A LA HISTORIA
                </div>

                <h2>
                  Buscá recuerdos, personas, años o escenas
                </h2>

                <p>
                  La inteligencia del proyecto podrá responder usando
                  los audios, textos, fotografías, videos y documentos
                  incorporados al archivo.
                </p>

                <div className="searchBar">

                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ej.: ¿Qué pasó en 1985?"
                  />

                  <button onClick={preguntar}>
                    Preguntar
                  </button>

                </div>

              </div>

              <div className="panel interview">

                <div className="panelEyebrow">
                  PRÓXIMA ENTREVISTA
                </div>

                <InterviewQuestion
                  title="Infancia"
                  text="¿Cuál es el primer recuerdo que conservás?"
                />

                <InterviewQuestion
                  title="Familia"
                  text="¿Quién fue la persona que más influyó en vos?"
                />

                <InterviewQuestion
                  title="Giro de vida"
                  text="¿Qué decisión cambió todo?"
                />

              </div>

            </section>

            <footer>
              NO SE QUIEN SOY · Una historia real · Podés hablar,
              escribir, subir fotos y videos · Proyecto privado
            </footer>

          </>
        )}

        {active === "Audios" && (
          <SectionPage
            kicker="ARCHIVO SONORO"
            title="Audios"
            description="Grabaciones, entrevistas, conversaciones y recuerdos contados con la propia voz."
          >
            <button
              className="primaryButton"
              onClick={() => audioInput.current?.click()}
            >
              + Subir varios audios
            </button>

            <input
              ref={audioInput}
              type="file"
              accept="audio/*"
              multiple
              hidden
              onChange={subirAudios}
            />
          </SectionPage>
        )}

        {active === "Historia" && (
          <StoryEditor
            onSave={() =>
              setStats((prev) => ({
                ...prev,
                historias: prev.historias + 1,
              }))
            }
          />
        )}

        {active === "Personajes" && (
          <SectionPage
            kicker="LAS PERSONAS DE LA HISTORIA"
            title="Personajes"
            description="Familia, amigos, socios, amores, adversarios y todas las personas que formaron parte de la vida."
          >
            <button className="primaryButton">
              + Nuevo personaje
            </button>
          </SectionPage>
        )}

        {active === "El Libro" && (
          <SectionPage
            kicker="MANUSCRITO"
            title="El Libro"
            description="Los recuerdos se transformarán progresivamente en capítulos, escenas y una narración completa."
          >
            <div className="emptyBook">
              <span>NO SE QUIEN SOY</span>
              <h3>El libro empieza con el primer recuerdo.</h3>
              <p>
                Cada historia incorporada podrá formar parte del manuscrito.
              </p>
            </div>
          </SectionPage>
        )}

        {active === "La Serie" && (
          <SectionPage
            kicker="ADAPTACIÓN AUDIOVISUAL"
            title="La Serie"
            description="Personajes, temporadas, episodios, escenas y acontecimientos para desarrollar la adaptación audiovisual."
          >
            <div className="seriesCard">
              <div>EPISODIO 01</div>
              <h3>El origen</h3>
              <p>
                El comienzo de una historia que todavía está por reconstruirse.
              </p>
            </div>
          </SectionPage>
        )}

        {active === "Archivo" && (
          <SectionPage
            kicker="ARCHIVO GENERAL"
            title="Todo queda guardado"
            description="Audios, textos, fotografías, documentos, videos y recuerdos organizados en un único archivo biográfico."
          >
            <div className="archiveGrid">
              <ArchiveBox title="Audios" />
              <ArchiveBox title="Documentos" />
              <ArchiveBox title="Fotografías" />
              <ArchiveBox title="Videos" />
            </div>
          </SectionPage>
        )}

        {active === "Fotos y Videos" && (
          <SectionPage
            kicker="ARCHIVO VISUAL"
            title="Fotos y Videos"
            description="El archivo visual de toda una vida. Podés seleccionar varios archivos al mismo tiempo."
          >
            <button
              className="primaryButton"
              onClick={() => mediaInput.current?.click()}
            >
              + Subir fotos y videos
            </button>

            <input
              ref={mediaInput}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={subirArchivos}
            />
          </SectionPage>
        )}

      </main>

    </div>
  );
}

function StatCard({ label, number }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{number}</strong>
    </div>
  );
}

function InterviewQuestion({ title, text }) {
  return (
    <div className="questionCard">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function SectionPage({
  kicker,
  title,
  description,
  children,
}) {
  return (
    <section className="sectionPage">

      <div className="eyebrow">
        {kicker}
      </div>

      <h1>{title}</h1>

      <p className="sectionDescription">
        {description}
      </p>

      <div className="sectionBody">
        {children}
      </div>

    </section>
  );
}

function StoryEditor({ onSave }) {
  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");

  function saveStory() {
    if (!story.trim()) return;

    onSave();

    setTitle("");
    setStory("");

    alert("Recuerdo guardado.");
  }

  return (
    <section className="sectionPage">

      <div className="eyebrow">
        ESCRIBIR LA HISTORIA
      </div>

      <h1>Un recuerdo</h1>

      <p className="sectionDescription">
        Escribilo como lo recordás. Después podrá organizarse
        cronológicamente y convertirse en parte del libro.
      </p>

      <div className="editor">

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del recuerdo"
        />

        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Empezá a escribir..."
        />

        <button
          className="primaryButton"
          onClick={saveStory}
        >
          Guardar recuerdo
        </button>

      </div>

    </section>
  );
}

function ArchiveBox({ title }) {
  return (
    <div className="archiveBox">
      <span>{title}</span>
      <strong>0</strong>
    </div>
  );
}
