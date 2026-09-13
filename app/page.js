"use client";

import { useEffect, useRef, useState } from "react";

const sections = [
  "Inicio",
  "Audios",
  "Historia",
  "Personajes",
  "El Libro",
  "La Serie",
  "Archivo",
  "Fotos y Videos",
  "Diseño",
];

const defaultDesign = {
  background: "#0b0b0b",
  sidebar: "#0d0d0d",
  card: "#171717",
  cardOpacity: 100,
  accent: "#ddc99e",
  text: "#f1eee7",
  secondaryText: "#aaa59c",
  border: "#303030",

  backgroundImage: "",
  backgroundOpacity: 22,
  backgroundBlur: 0,
  backgroundPosition: "center",
  backgroundSize: "cover",

  titleFont: "Georgia",
  bodyFont: "Arial",

  titleSize: 48,
  bodySize: 16,

  radius: 18,
  buttonRadius: 11,
  sidebarWidth: 270,

  sidebarOpacity: 100,
  sidebarBlur: 0,

  cardBlur: 0,

  contentWidth: 1140,
};

export default function Home() {
  const [active, setActive] = useState("Inicio");

  const [question, setQuestion] = useState("");

  const audioInput = useRef(null);
  const mediaInput = useRef(null);
  const backgroundInput = useRef(null);

  const [design, setDesign] = useState(defaultDesign);

  const [stats, setStats] = useState({
    audios: 0,
    historias: 0,
    personajes: 0,
    capitulos: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nqs_design");

      if (saved) {
        setDesign({
          ...defaultDesign,
          ...JSON.parse(saved),
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "nqs_design",
        JSON.stringify(design)
      );
    } catch {}
  }, [design]);

  function updateDesign(key, value) {
    setDesign((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function restorePremium() {
    setDesign(defaultDesign);
  }

  function uploadBackground(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateDesign("backgroundImage", reader.result);
    };

    reader.readAsDataURL(file);
  }

  function removeBackground() {
    updateDesign("backgroundImage", "");

    if (backgroundInput.current) {
      backgroundInput.current.value = "";
    }
  }

  function subirAudios(event) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    setStats((prev) => ({
      ...prev,
      audios: prev.audios + files.length,
    }));

    alert(
      `${files.length} audio(s) seleccionado(s).`
    );
  }

  function subirArchivos(event) {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) return;

    alert(
      `${files.length} archivo(s) seleccionado(s).`
    );
  }

  function preguntar() {
    if (!question.trim()) return;

    alert(
      "La búsqueda inteligente se conectará con todo el archivo biográfico."
    );
  }

  const styleVariables = {
    "--bg": design.background,
    "--sidebar": hexToRgba(
      design.sidebar,
      design.sidebarOpacity / 100
    ),
    "--card": hexToRgba(
      design.card,
      design.cardOpacity / 100
    ),
    "--accent": design.accent,
    "--text": design.text,
    "--secondary": design.secondaryText,
    "--border": design.border,

    "--radius": `${design.radius}px`,
    "--button-radius": `${design.buttonRadius}px`,
    "--sidebar-width": `${design.sidebarWidth}px`,
    "--content-width": `${design.contentWidth}px`,

    "--title-size": `${design.titleSize}px`,
    "--body-size": `${design.bodySize}px`,

    "--title-font":
      design.titleFont === "Georgia"
        ? 'Georgia, "Times New Roman", serif'
        : design.titleFont === "Arial"
        ? "Arial, Helvetica, sans-serif"
        : design.titleFont === "Helvetica"
        ? "Helvetica, Arial, sans-serif"
        : '"Times New Roman", Times, serif',

    "--body-font":
      design.bodyFont === "Georgia"
        ? 'Georgia, "Times New Roman", serif'
        : design.bodyFont === "Helvetica"
        ? "Helvetica, Arial, sans-serif"
        : "Arial, Helvetica, sans-serif",

    "--card-blur": `blur(${design.cardBlur}px)`,
    "--sidebar-blur": `blur(${design.sidebarBlur}px)`,

    "--background-image": design.backgroundImage
      ? `url("${design.backgroundImage}")`
      : "none",

    "--background-opacity":
      design.backgroundOpacity / 100,

    "--background-blur":
      `blur(${design.backgroundBlur}px)`,

    "--background-position":
      design.backgroundPosition,

    "--background-size":
      design.backgroundSize,
  };

  return (
    <div
      className="appShell"
      style={styleVariables}
    >
      <div className="wallpaper" />

      <aside className="sidebar">
        <div className="brand">
          <span>NO SE</span>
          <span>QUIEN SOY</span>
        </div>

        <nav className="navigation">
          {sections.map((section) => (
            <button
              key={section}
              className={
                active === section
                  ? "navItem active"
                  : "navItem"
              }
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
                    La historia de una vida
                    extraordinaria
                  </h1>
                </div>

                <div className="status">
                  NO INVENTAR · ACTIVO
                </div>
              </div>

              <div className="actions">
                <button
                  className="primaryButton"
                  onClick={() =>
                    audioInput.current?.click()
                  }
                >
                  ● Grabar historia
                </button>

                <button
                  className="secondaryButton"
                  onClick={() =>
                    setActive("Historia")
                  }
                >
                  ✎ Escribir recuerdo
                </button>

                <button
                  className="primaryButton"
                  onClick={() =>
                    audioInput.current?.click()
                  }
                >
                  Subir varios audios
                </button>

                <button
                  className="primaryButton"
                  onClick={() =>
                    mediaInput.current?.click()
                  }
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
                  Buscá recuerdos, personas, años o
                  escenas
                </h2>

                <p>
                  La inteligencia del proyecto podrá
                  responder usando audios, textos,
                  fotografías, videos y documentos.
                </p>

                <div className="searchBar">
                  <input
                    value={question}
                    onChange={(e) =>
                      setQuestion(e.target.value)
                    }
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
              NO SE QUIEN SOY · Una historia real ·
              Podés hablar, escribir, subir fotos y
              videos · Proyecto privado
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
              onClick={() =>
                audioInput.current?.click()
              }
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
                historias:
                  prev.historias + 1,
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
            description="Los recuerdos se transformarán en capítulos, escenas y una narración completa."
          >
            <div className="emptyBook">
              <span>NO SE QUIEN SOY</span>

              <h3>
                El libro empieza con el primer
                recuerdo.
              </h3>

              <p>
                Cada historia incorporada podrá
                formar parte del manuscrito.
              </p>
            </div>
          </SectionPage>
        )}

        {active === "La Serie" && (
          <SectionPage
            kicker="ADAPTACIÓN AUDIOVISUAL"
            title="La Serie"
            description="Personajes, temporadas, episodios y escenas para desarrollar la adaptación audiovisual."
          >
            <div className="seriesCard">
              <div>EPISODIO 01</div>

              <h3>El origen</h3>

              <p>
                El comienzo de una historia que
                todavía está por reconstruirse.
              </p>
            </div>
          </SectionPage>
        )}

        {active === "Archivo" && (
          <SectionPage
            kicker="ARCHIVO GENERAL"
            title="Todo queda guardado"
            description="Audios, textos, fotografías, documentos y videos organizados en un único archivo biográfico."
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
              onClick={() =>
                mediaInput.current?.click()
              }
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

        {active === "Diseño" && (
          <DesignStudio
            design={design}
            updateDesign={updateDesign}
            restorePremium={restorePremium}
            backgroundInput={backgroundInput}
            uploadBackground={uploadBackground}
            removeBackground={removeBackground}
          />
        )}
      </main>
    </div>
  );
}

function DesignStudio({
  design,
  updateDesign,
  restorePremium,
  backgroundInput,
  uploadBackground,
  removeBackground,
}) {
  return (
    <section className="designPage">
      <div className="eyebrow">
        ESTUDIO VISUAL
      </div>

      <div className="designHeader">
        <div>
          <h1>Diseño</h1>

          <p>
            Personalizá completamente la apariencia
            de NO SE QUIEN SOY.
          </p>
        </div>

        <button
          className="secondaryButton"
          onClick={restorePremium}
        >
          Restaurar PREMIUM
        </button>
      </div>

      <div className="designGrid">
        <DesignGroup title="Fondo de pantalla">
          <ColorControl
            label="Color de fondo"
            value={design.background}
            onChange={(value) =>
              updateDesign(
                "background",
                value
              )
            }
          />

          <div className="designerField">
            <label>Imagen de fondo</label>

            <div className="designerButtons">
              <button
                className="smallButton"
                onClick={() =>
                  backgroundInput.current?.click()
                }
              >
                Subir imagen
              </button>

              {design.backgroundImage && (
                <button
                  className="smallButton ghost"
                  onClick={removeBackground}
                >
                  Quitar
                </button>
              )}
            </div>

            <input
              ref={backgroundInput}
              hidden
              type="file"
              accept="image/*"
              onChange={uploadBackground}
            />
          </div>

          <RangeControl
            label="Visibilidad de imagen"
            value={design.backgroundOpacity}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) =>
              updateDesign(
                "backgroundOpacity",
                value
              )
            }
          />

          <RangeControl
            label="Desenfoque del fondo"
            value={design.backgroundBlur}
            min={0}
            max={30}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "backgroundBlur",
                value
              )
            }
          />

          <SelectControl
            label="Posición"
            value={design.backgroundPosition}
            options={[
              ["center", "Centro"],
              ["top", "Arriba"],
              ["bottom", "Abajo"],
              ["left", "Izquierda"],
              ["right", "Derecha"],
            ]}
            onChange={(value) =>
              updateDesign(
                "backgroundPosition",
                value
              )
            }
          />

          <SelectControl
            label="Ajuste de imagen"
            value={design.backgroundSize}
            options={[
              ["cover", "Cubrir pantalla"],
              ["contain", "Imagen completa"],
              ["auto", "Tamaño original"],
            ]}
            onChange={(value) =>
              updateDesign(
                "backgroundSize",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Colores">
          <ColorControl
            label="Color principal"
            value={design.accent}
            onChange={(value) =>
              updateDesign("accent", value)
            }
          />

          <ColorControl
            label="Texto principal"
            value={design.text}
            onChange={(value) =>
              updateDesign("text", value)
            }
          />

          <ColorControl
            label="Texto secundario"
            value={design.secondaryText}
            onChange={(value) =>
              updateDesign(
                "secondaryText",
                value
              )
            }
          />

          <ColorControl
            label="Tarjetas"
            value={design.card}
            onChange={(value) =>
              updateDesign("card", value)
            }
          />

          <ColorControl
            label="Menú lateral"
            value={design.sidebar}
            onChange={(value) =>
              updateDesign("sidebar", value)
            }
          />

          <ColorControl
            label="Bordes"
            value={design.border}
            onChange={(value) =>
              updateDesign("border", value)
            }
          />
        </DesignGroup>

        <DesignGroup title="Tarjetas">
          <RangeControl
            label="Transparencia"
            value={design.cardOpacity}
            min={10}
            max={100}
            suffix="%"
            onChange={(value) =>
              updateDesign(
                "cardOpacity",
                value
              )
            }
          />

          <RangeControl
            label="Desenfoque"
            value={design.cardBlur}
            min={0}
            max={30}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "cardBlur",
                value
              )
            }
          />

          <RangeControl
            label="Puntas redondeadas"
            value={design.radius}
            min={0}
            max={40}
            suffix=" px"
            onChange={(value) =>
              updateDesign("radius", value)
            }
          />
        </DesignGroup>

        <DesignGroup title="Menú lateral">
          <RangeControl
            label="Ancho"
            value={design.sidebarWidth}
            min={190}
            max={380}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "sidebarWidth",
                value
              )
            }
          />

          <RangeControl
            label="Transparencia"
            value={design.sidebarOpacity}
            min={20}
            max={100}
            suffix="%"
            onChange={(value) =>
              updateDesign(
                "sidebarOpacity",
                value
              )
            }
          />

          <RangeControl
            label="Desenfoque"
            value={design.sidebarBlur}
            min={0}
            max={30}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "sidebarBlur",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Tipografía">
          <SelectControl
            label="Títulos"
            value={design.titleFont}
            options={[
              ["Georgia", "Georgia"],
              ["Times", "Times New Roman"],
              ["Arial", "Arial"],
              ["Helvetica", "Helvetica"],
            ]}
            onChange={(value) =>
              updateDesign(
                "titleFont",
                value
              )
            }
          />

          <SelectControl
            label="Textos"
            value={design.bodyFont}
            options={[
              ["Arial", "Arial"],
              ["Helvetica", "Helvetica"],
              ["Georgia", "Georgia"],
            ]}
            onChange={(value) =>
              updateDesign(
                "bodyFont",
                value
              )
            }
          />

          <RangeControl
            label="Tamaño del título"
            value={design.titleSize}
            min={30}
            max={90}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "titleSize",
                value
              )
            }
          />

          <RangeControl
            label="Tamaño de texto"
            value={design.bodySize}
            min={12}
            max={24}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "bodySize",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Botones y contenido">
          <RangeControl
            label="Redondeo de botones"
            value={design.buttonRadius}
            min={0}
            max={40}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "buttonRadius",
                value
              )
            }
          />

          <RangeControl
            label="Ancho del contenido"
            value={design.contentWidth}
            min={800}
            max={1500}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "contentWidth",
                value
              )
            }
          />
        </DesignGroup>
      </div>

      <div className="designSaved">
        ✓ Los cambios se guardan automáticamente
      </div>
    </section>
  );
}

function DesignGroup({
  title,
  children,
}) {
  return (
    <div className="designGroup">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}) {
  return (
    <div className="designerField">
      <label>{label}</label>

      <div className="colorRow">
        <input
          type="color"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
        />

        <span>{value}</span>
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}) {
  return (
    <div className="designerField">
      <div className="rangeLabel">
        <label>{label}</label>

        <span>
          {value}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Number(e.target.value)
          )
        }
      />
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div className="designerField">
      <label>{label}</label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map(([value, name]) => (
          <option
            key={value}
            value={value}
          >
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  label,
  number,
}) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{number}</strong>
    </div>
  );
}

function InterviewQuestion({
  title,
  text,
}) {
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

function StoryEditor({
  onSave,
}) {
  const [title, setTitle] =
    useState("");

  const [story, setStory] =
    useState("");

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
        Escribilo como lo recordás. Después
        podrá organizarse cronológicamente y
        convertirse en parte del libro.
      </p>

      <div className="editor">
        <input
          value={title}
          onChange={(e) =>
            setTitle(e.target.value)
          }
          placeholder="Título del recuerdo"
        />

        <textarea
          value={story}
          onChange={(e) =>
            setStory(e.target.value)
          }
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

function ArchiveBox({
  title,
}) {
  return (
    <div className="archiveBox">
      <span>{title}</span>
      <strong>0</strong>
    </div>
  );
}

function hexToRgba(
  hex,
  opacity = 1
) {
  if (!hex) {
    return `rgba(0,0,0,${opacity})`;
  }

  const clean = hex.replace("#", "");

  const bigint = parseInt(
    clean,
    16
  );

  const r =
    (bigint >> 16) & 255;

  const g =
    (bigint >> 8) & 255;

  const b =
    bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
