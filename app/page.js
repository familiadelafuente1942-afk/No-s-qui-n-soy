"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getSupabase } from "../lib/supabase";

const MENU = [
  "Inicio",
  "Mi Historia",
  "El Libro",
  "Personas",
  "Archivo",
  "Podcast",
  "Diseño",
];

const DEFAULT_DESIGN = {
  background: "#0b0b0b",
  sidebar: "#0d0d0d",
  card: "#171717",
  accent: "#ddc99e",
  text: "#f1eee7",
  secondary: "#aaa59c",
  border: "#303030",

  backgroundImage: "",
  backgroundOpacity: 20,
  backgroundBlur: 0,

  cardOpacity: 100,
  radius: 18,
  buttonRadius: 11,

  titleFont: "Georgia",
  bodyFont: "Arial",

  sidebarWidth: 260,
  contentWidth: 1150,
};

const DEFAULT_TEXTS = {
  projectName: "NO SE QUIEN SOY",

  homeTitle:
    "Una vida. Muchos recuerdos. Un libro.",

  homeSubtitle:
    "Contá la historia como la recordás. La aplicación conserva cada recuerdo original y te ayuda a transformarlo en un libro.",

  historyTitle:
    "Contá la historia",

  historySubtitle:
    "Podés escribir un recuerdo o contarlo con tu propia voz.",

  bookTitle:
    "El Libro",

  bookSubtitle:
    "Acá se construye la versión narrativa de la historia, capítulo por capítulo.",

  podcastTitle:
    "Podcast",

  podcastSubtitle:
    "Convertí historias, capítulos y recuerdos en episodios de audio.",
};

export default function Home() {
  const supabase = useMemo(
    () => getSupabase(),
    []
  );

  const audioInput = useRef(null);
  const mediaInput = useRef(null);
  const backgroundInput = useRef(null);
  const podcastInput = useRef(null);

  const [active, setActive] =
    useState("Inicio");

  const [project, setProject] =
    useState(null);

  const [stories, setStories] =
    useState([]);

  const [chapters, setChapters] =
    useState([]);

  const [design, setDesign] =
    useState(DEFAULT_DESIGN);

  const [texts, setTexts] =
    useState(DEFAULT_TEXTS);

  const [notice, setNotice] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /*
  ===========================
  CARGA INICIAL
  ===========================
  */

  useEffect(() => {
    loadLocalPreferences();
    boot();
  }, []);

  function loadLocalPreferences() {
    try {
      const savedDesign =
        localStorage.getItem(
          "nqs_design"
        );

      const savedTexts =
        localStorage.getItem(
          "nqs_texts"
        );

      if (savedDesign) {
        setDesign({
          ...DEFAULT_DESIGN,
          ...JSON.parse(savedDesign),
        });
      }

      if (savedTexts) {
        setTexts({
          ...DEFAULT_TEXTS,
          ...JSON.parse(savedTexts),
        });
      }
    } catch {}
  }

  useEffect(() => {
    try {
      localStorage.setItem(
        "nqs_design",
        JSON.stringify(design)
      );
    } catch {}
  }, [design]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "nqs_texts",
        JSON.stringify(texts)
      );
    } catch {}
  }, [texts]);

  /*
  ===========================
  SUPABASE
  ===========================
  */

  async function boot() {
    setLoading(true);

    try {
      let {
        data: foundProject,
        error,
      } = await supabase
        .from("projects")
        .select("*")
        .eq(
          "title",
          "NO SE QUIEN SOY"
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(error);
      }

      if (!foundProject) {
        const created =
          await supabase
            .from("projects")
            .insert({
              title:
                "NO SE QUIEN SOY",
            })
            .select()
            .single();

        if (created.error) {
          throw created.error;
        }

        foundProject =
          created.data;
      }

      setProject(foundProject);

      if (foundProject?.id) {
        await Promise.all([
          loadStories(
            foundProject.id
          ),
          loadChapters(
            foundProject.id
          ),
        ]);
      }
    } catch (error) {
      flash(
        "No se pudo conectar con Supabase: " +
          error.message
      );
    }

    setLoading(false);
  }

  async function loadStories(
    projectId
  ) {
    const { data, error } =
      await supabase
        .from("stories")
        .select("*")
        .eq(
          "project_id",
          projectId
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(error);
      return;
    }

    setStories(data || []);
  }

  async function loadChapters(
    projectId
  ) {
    const { data, error } =
      await supabase
        .from("chapters")
        .select("*")
        .eq(
          "project_id",
          projectId
        )
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      console.error(error);
      return;
    }

    setChapters(data || []);
  }

  /*
  ===========================
  HISTORIAS
  ===========================
  */

  async function saveStory({
    title,
    text,
  }) {
    if (!text.trim()) {
      flash(
        "Escribí el recuerdo antes de guardarlo."
      );
      return false;
    }

    if (!project?.id) {
      flash(
        "El proyecto todavía no está listo."
      );
      return false;
    }

    setLoading(true);

    const { error } =
      await supabase
        .from("stories")
        .insert({
          project_id:
            project.id,

          title:
            title.trim() ||
            "Recuerdo sin título",

          original_text:
            text.trim(),

          source_type:
            "written",
        });

    setLoading(false);

    if (error) {
      flash(
        "No se pudo guardar: " +
          error.message
      );
      return false;
    }

    await loadStories(
      project.id
    );

    flash(
      "Recuerdo guardado."
    );

    return true;
  }

  async function deleteStory(
    id
  ) {
    const ok =
      window.confirm(
        "¿Eliminar este recuerdo?"
      );

    if (!ok) return;

    const { error } =
      await supabase
        .from("stories")
        .delete()
        .eq("id", id);

    if (error) {
      flash(error.message);
      return;
    }

    await loadStories(
      project.id
    );
  }

  /*
  ===========================
  LIBRO
  ===========================
  */

  async function createChapter() {
    if (!project?.id) return;

    const number =
      chapters.length + 1;

    const { error } =
      await supabase
        .from("chapters")
        .insert({
          project_id:
            project.id,

          title:
            `Capítulo ${number}`,

          content: "",
        });

    if (error) {
      flash(
        "No se pudo crear el capítulo: " +
          error.message
      );
      return;
    }

    await loadChapters(
      project.id
    );

    flash(
      "Capítulo creado."
    );
  }

  async function updateChapter(
    id,
    field,
    value
  ) {
    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === id
          ? {
              ...chapter,
              [field]: value,
            }
          : chapter
      )
    );

    const { error } =
      await supabase
        .from("chapters")
        .update({
          [field]: value,
        })
        .eq("id", id);

    if (error) {
      console.error(error);
      flash(
        "No se pudo actualizar el capítulo."
      );
    }
  }

  async function deleteChapter(
    id
  ) {
    const ok =
      window.confirm(
        "¿Eliminar este capítulo?"
      );

    if (!ok) return;

    const { error } =
      await supabase
        .from("chapters")
        .delete()
        .eq("id", id);

    if (error) {
      flash(error.message);
      return;
    }

    await loadChapters(
      project.id
    );
  }

  /*
  ===========================
  ARCHIVOS
  ===========================
  */

  async function uploadFiles(
    files,
    type = "archivo"
  ) {
    if (!files?.length) return;

    let uploaded = 0;

    for (const file of files) {
      try {
        const cleanName =
          file.name
            .replace(
              /[^a-zA-Z0-9._-]/g,
              "_"
            );

        const path =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${cleanName}`;

        const { error } =
          await supabase.storage
            .from("memorias")
            .upload(
              path,
              file,
              {
                upsert: false,
              }
            );

        if (!error) {
          uploaded++;
        }
      } catch {}
    }

    flash(
      `${uploaded} ${type}(s) subido(s).`
    );
  }

  /*
  ===========================
  DISEÑO
  ===========================
  */

  function updateDesign(
    key,
    value
  ) {
    setDesign((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateText(
    key,
    value
  ) {
    setTexts((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function restorePremium() {
    setDesign(
      DEFAULT_DESIGN
    );

    setTexts(
      DEFAULT_TEXTS
    );

    flash(
      "Diseño PREMIUM restaurado."
    );
  }

  function uploadBackground(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      updateDesign(
        "backgroundImage",
        reader.result
      );
    };

    reader.readAsDataURL(
      file
    );
  }

  function flash(message) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 2800);
  }

  /*
  ===========================
  VARIABLES VISUALES
  ===========================
  */

  const variables = {
    "--bg":
      design.background,

    "--sidebar":
      design.sidebar,

    "--card":
      hexToRgba(
        design.card,
        design.cardOpacity /
          100
      ),

    "--accent":
      design.accent,

    "--text":
      design.text,

    "--secondary":
      design.secondary,

    "--border":
      design.border,

    "--radius":
      `${design.radius}px`,

    "--button-radius":
      `${design.buttonRadius}px`,

    "--sidebar-width":
      `${design.sidebarWidth}px`,

    "--content-width":
      `${design.contentWidth}px`,

    "--background-image":
      design.backgroundImage
        ? `url("${design.backgroundImage}")`
        : "none",

    "--background-opacity":
      design.backgroundOpacity /
      100,

    "--background-blur":
      `blur(${design.backgroundBlur}px)`,

    "--title-font":
      design.titleFont ===
      "Arial"
        ? "Arial, Helvetica, sans-serif"
        : design.titleFont ===
          "Helvetica"
        ? "Helvetica, Arial, sans-serif"
        : 'Georgia, "Times New Roman", serif',

    "--body-font":
      design.bodyFont ===
      "Georgia"
        ? 'Georgia, "Times New Roman", serif'
        : "Arial, Helvetica, sans-serif",
  };

  return (
    <div
      className="appShell"
      style={variables}
    >
      <div className="wallpaper" />

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      <aside className="sidebar">
        <EditableText
          className="brand"
          value={
            texts.projectName
          }
          onChange={(value) =>
            updateText(
              "projectName",
              value
            )
          }
        />

        <nav className="navigation">
          {MENU.map((item) => (
            <button
              key={item}
              className={
                active === item
                  ? "navItem active"
                  : "navItem"
              }
              onClick={() =>
                setActive(item)
              }
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebarFooter">
          ARCHIVO BIOGRÁFICO
        </div>
      </aside>

      <main className="mainContent">
        {active === "Inicio" && (
          <HomePage
            texts={texts}
            updateText={
              updateText
            }
            storyCount={
              stories.length
            }
            chapterCount={
              chapters.length
            }
            goHistory={() =>
              setActive(
                "Mi Historia"
              )
            }
            goBook={() =>
              setActive(
                "El Libro"
              )
            }
            audioInput={
              audioInput
            }
            mediaInput={
              mediaInput
            }
            uploadFiles={
              uploadFiles
            }
          />
        )}

        {active ===
          "Mi Historia" && (
          <HistoryPage
            texts={texts}
            updateText={
              updateText
            }
            stories={stories}
            saveStory={
              saveStory
            }
            deleteStory={
              deleteStory
            }
            loading={
              loading
            }
            audioInput={
              audioInput
            }
            uploadFiles={
              uploadFiles
            }
          />
        )}

        {active ===
          "El Libro" && (
          <BookPage
            texts={texts}
            updateText={
              updateText
            }
            chapters={
              chapters
            }
            createChapter={
              createChapter
            }
            updateChapter={
              updateChapter
            }
            deleteChapter={
              deleteChapter
            }
            stories={
              stories
            }
          />
        )}

        {active ===
          "Personas" && (
          <SimplePage
            eyebrow="PERSONAJES"
            title="Personas"
            description="Familia, amigos, socios, amores y todas las personas importantes de la historia."
          >
            <div className="emptyPanel">
              Próximamente vas a
              poder relacionar cada
              persona con recuerdos,
              capítulos, fotos y
              audios.
            </div>
          </SimplePage>
        )}

        {active ===
          "Archivo" && (
          <ArchivePage
            stories={
              stories
            }
            chapters={
              chapters
            }
            mediaInput={
              mediaInput
            }
            uploadFiles={
              uploadFiles
            }
          />
        )}

        {active ===
          "Podcast" && (
          <PodcastPage
            texts={texts}
            updateText={
              updateText
            }
            podcastInput={
              podcastInput
            }
            uploadFiles={
              uploadFiles
            }
          />
        )}

        {active ===
          "Diseño" && (
          <DesignPage
            design={design}
            updateDesign={
              updateDesign
            }
            restorePremium={
              restorePremium
            }
            backgroundInput={
              backgroundInput
            }
            uploadBackground={
              uploadBackground
            }
          />
        )}
      </main>
    </div>
  );
}

/*
================================
INICIO
================================
*/

function HomePage({
  texts,
  updateText,
  storyCount,
  chapterCount,
  goHistory,
  goBook,
  audioInput,
  mediaInput,
  uploadFiles,
}) {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          PROYECTO BIOGRÁFICO
        </div>

        <EditableText
          tag="h1"
          className="mainTitle"
          value={
            texts.homeTitle
          }
          onChange={(value) =>
            updateText(
              "homeTitle",
              value
            )
          }
        />

        <EditableText
          tag="p"
          className="mainSubtitle"
          value={
            texts.homeSubtitle
          }
          onChange={(value) =>
            updateText(
              "homeSubtitle",
              value
            )
          }
        />

        <div className="mainActions">
          <button
            className="primaryButton hugeButton"
            onClick={
              goHistory
            }
          >
            ✎ Escribir un recuerdo
          </button>

          <button
            className="secondaryButton hugeButton"
            onClick={() =>
              audioInput.current?.click()
            }
          >
            ● Contarlo por audio
          </button>

          <input
            ref={audioInput}
            hidden
            multiple
            type="file"
            accept="audio/*"
            onChange={(e) =>
              uploadFiles(
                Array.from(
                  e.target.files ||
                    []
                ),
                "audio"
              )
            }
          />
        </div>
      </section>

      <section className="workflow">
        <div className="workflowCard important">
          <span>01</span>
          <h3>
            Contás un recuerdo
          </h3>
          <p>
            Escribís o hablás
            libremente. No hace
            falta ordenar nada.
          </p>
        </div>

        <div className="workflowArrow">
          →
        </div>

        <div className="workflowCard">
          <span>02</span>
          <h3>
            Queda documentado
          </h3>
          <p>
            El recuerdo original se
            conserva dentro de Mi
            Historia.
          </p>
        </div>

        <div className="workflowArrow">
          →
        </div>

        <div className="workflowCard">
          <span>03</span>
          <h3>
            Va formando el libro
          </h3>
          <p>
            La historia narrativa se
            organiza en capítulos.
          </p>
        </div>
      </section>

      <section className="homeStats">
        <div className="stat">
          <small>
            RECUERDOS
          </small>
          <strong>
            {storyCount}
          </strong>
        </div>

        <div className="stat">
          <small>
            CAPÍTULOS
          </small>
          <strong>
            {chapterCount}
          </strong>
        </div>

        <button
          className="openBook"
          onClick={goBook}
        >
          <span>
            EL LIBRO
          </span>

          <strong>
            Ver cómo va quedando
            →
          </strong>
        </button>
      </section>

      <section className="quickArchive">
        <button
          className="uploadQuick"
          onClick={() =>
            mediaInput.current?.click()
          }
        >
          + Agregar fotos,
          documentos o videos
        </button>

        <input
          ref={mediaInput}
          hidden
          multiple
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={(e) =>
            uploadFiles(
              Array.from(
                e.target.files ||
                  []
              )
            )
          }
        />
      </section>
    </>
  );
}

/*
================================
MI HISTORIA
================================
*/

function HistoryPage({
  texts,
  updateText,
  stories,
  saveStory,
  deleteStory,
  loading,
  audioInput,
  uploadFiles,
}) {
  const [title, setTitle] =
    useState("");

  const [text, setText] =
    useState("");

  async function save() {
    const ok =
      await saveStory({
        title,
        text,
      });

    if (ok) {
      setTitle("");
      setText("");
    }
  }

  return (
    <section className="page">
      <div className="eyebrow">
        MATERIAL ORIGINAL
      </div>

      <EditableText
        tag="h1"
        className="pageTitle"
        value={
          texts.historyTitle
        }
        onChange={(value) =>
          updateText(
            "historyTitle",
            value
          )
        }
      />

      <EditableText
        tag="p"
        className="pageSubtitle"
        value={
          texts.historySubtitle
        }
        onChange={(value) =>
          updateText(
            "historySubtitle",
            value
          )
        }
      />

      <div className="historyLayout">
        <div className="storyWriter">
          <div className="writerHeader">
            <span>
              NUEVO RECUERDO
            </span>

            <button
              className="audioMini"
              onClick={() =>
                audioInput.current?.click()
              }
            >
              ● Grabar / subir audio
            </button>
          </div>

          <input
            className="storyTitleInput"
            value={title}
            onChange={(e) =>
              setTitle(
                e.target.value
              )
            }
            placeholder="Título opcional"
          />

          <textarea
            className="storyTextarea"
            value={text}
            onChange={(e) =>
              setText(
                e.target.value
              )
            }
            placeholder="Escribí el recuerdo como te venga a la memoria..."
          />

          <div className="writerBottom">
            <span>
              No hace falta escribir
              como un libro. Contalo
              como ocurrió.
            </span>

            <button
              className="primaryButton"
              disabled={
                loading
              }
              onClick={save}
            >
              {loading
                ? "Guardando..."
                : "Guardar recuerdo"}
            </button>
          </div>

          <input
            ref={audioInput}
            hidden
            multiple
            type="file"
            accept="audio/*"
            onChange={(e) =>
              uploadFiles(
                Array.from(
                  e.target.files ||
                    []
                ),
                "audio"
              )
            }
          />
        </div>

        <aside className="historyHelp">
          <span>
            PODRÍAS CONTAR
          </span>

          <button>
            ¿Cuál es tu primer
            recuerdo?
          </button>

          <button>
            ¿Cómo era la casa donde
            creciste?
          </button>

          <button>
            ¿Quién marcó tu
            infancia?
          </button>

          <button>
            ¿Cuál fue una decisión
            que cambió tu vida?
          </button>
        </aside>
      </div>

      <div className="savedSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">
              ARCHIVO REAL
            </span>

            <h2>
              Recuerdos guardados
            </h2>
          </div>

          <strong>
            {stories.length}
          </strong>
        </div>

        {stories.length ===
        0 ? (
          <div className="emptyPanel">
            Todavía no hay
            recuerdos. El primero
            puede empezar con una
            frase.
          </div>
        ) : (
          <div className="storiesList">
            {stories.map(
              (story) => (
                <article
                  className="storyCard"
                  key={
                    story.id
                  }
                >
                  <div className="storyTop">
                    <div>
                      <h3>
                        {story.title ||
                          "Recuerdo"}
                      </h3>

                      <small>
                        {formatDate(
                          story.created_at
                        )}
                      </small>
                    </div>

                    <button
                      className="deleteButton"
                      onClick={() =>
                        deleteStory(
                          story.id
                        )
                      }
                    >
                      Eliminar
                    </button>
                  </div>

                  <p>
                    {
                      story.original_text
                    }
                  </p>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/*
================================
EL LIBRO
================================
*/

function BookPage({
  texts,
  updateText,
  chapters,
  createChapter,
  updateChapter,
  deleteChapter,
  stories,
}) {
  return (
    <section className="page">
      <div className="eyebrow">
        MANUSCRITO
      </div>

      <EditableText
        tag="h1"
        className="pageTitle"
        value={
          texts.bookTitle
        }
        onChange={(value) =>
          updateText(
            "bookTitle",
            value
          )
        }
      />

      <EditableText
        tag="p"
        className="pageSubtitle"
        value={
          texts.bookSubtitle
        }
        onChange={(value) =>
          updateText(
            "bookSubtitle",
            value
          )
        }
      />

      <div className="bookStatus">
        <div>
          <small>
            MATERIAL ORIGINAL
          </small>

          <strong>
            {stories.length} recuerdos
          </strong>
        </div>

        <div>
          <small>
            MANUSCRITO
          </small>

          <strong>
            {chapters.length} capítulos
          </strong>
        </div>

        <button
          className="primaryButton"
          onClick={
            createChapter
          }
        >
          + Nuevo capítulo
        </button>
      </div>

      {chapters.length ===
      0 ? (
        <div className="bookEmpty">
          <span>
            NO SE QUIEN SOY
          </span>

          <h2>
            El libro todavía está
            esperando su primer
            capítulo.
          </h2>

          <p>
            Los recuerdos originales
            están en “Mi Historia”.
            Acá se va construyendo la
            versión literaria.
          </p>

          <button
            className="primaryButton"
            onClick={
              createChapter
            }
          >
            Crear primer capítulo
          </button>
        </div>
      ) : (
        <div className="chapters">
          {chapters.map(
            (chapter, index) => (
              <ChapterEditor
                key={
                  chapter.id
                }
                chapter={
                  chapter
                }
                number={
                  index + 1
                }
                updateChapter={
                  updateChapter
                }
                deleteChapter={
                  deleteChapter
                }
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function ChapterEditor({
  chapter,
  number,
  updateChapter,
  deleteChapter,
}) {
  const [title, setTitle] =
    useState(
      chapter.title || ""
    );

  const [content, setContent] =
    useState(
      chapter.content || ""
    );

  useEffect(() => {
    setTitle(
      chapter.title || ""
    );

    setContent(
      chapter.content || ""
    );
  }, [chapter]);

  return (
    <article className="chapterEditor">
      <div className="chapterNumber">
        CAPÍTULO{" "}
        {String(number).padStart(
          2,
          "0"
        )}
      </div>

      <input
        className="chapterTitleInput"
        value={title}
        onChange={(e) =>
          setTitle(
            e.target.value
          )
        }
        onBlur={() =>
          updateChapter(
            chapter.id,
            "title",
            title
          )
        }
      />

      <textarea
        className="chapterContent"
        value={content}
        onChange={(e) =>
          setContent(
            e.target.value
          )
        }
        onBlur={() =>
          updateChapter(
            chapter.id,
            "content",
            content
          )
        }
        placeholder="Acá empieza la narración del capítulo..."
      />

      <div className="chapterFooter">
        <span>
          Los cambios se guardan al
          salir del texto.
        </span>

        <button
          onClick={() =>
            deleteChapter(
              chapter.id
            )
          }
        >
          Eliminar capítulo
        </button>
      </div>
    </article>
  );
}

/*
================================
ARCHIVO
================================
*/

function ArchivePage({
  stories,
  chapters,
  mediaInput,
  uploadFiles,
}) {
  return (
    <SimplePage
      eyebrow="ARCHIVO GENERAL"
      title="Archivo"
      description="Todo el material original de la historia en un mismo lugar."
    >
      <div className="archiveGrid">
        <ArchiveCard
          title="Recuerdos"
          number={
            stories.length
          }
        />

        <ArchiveCard
          title="Capítulos"
          number={
            chapters.length
          }
        />

        <ArchiveCard
          title="Audios"
          number="—"
        />

        <ArchiveCard
          title="Fotos y videos"
          number="—"
        />
      </div>

      <button
        className="primaryButton archiveUpload"
        onClick={() =>
          mediaInput.current?.click()
        }
      >
        + Subir material
      </button>

      <input
        ref={mediaInput}
        type="file"
        hidden
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        onChange={(e) =>
          uploadFiles(
            Array.from(
              e.target.files ||
                []
            )
          )
        }
      />
    </SimplePage>
  );
}

/*
================================
PODCAST
================================
*/

function PodcastPage({
  texts,
  updateText,
  podcastInput,
  uploadFiles,
}) {
  return (
    <section className="page">
      <div className="eyebrow">
        AUDIO · CONTENIDO
      </div>

      <EditableText
        tag="h1"
        className="pageTitle"
        value={
          texts.podcastTitle
        }
        onChange={(value) =>
          updateText(
            "podcastTitle",
            value
          )
        }
      />

      <EditableText
        tag="p"
        className="pageSubtitle"
        value={
          texts.podcastSubtitle
        }
        onChange={(value) =>
          updateText(
            "podcastSubtitle",
            value
          )
        }
      />

      <div className="podcastGrid">
        <div className="podcastCard">
          <span>
            NUEVO EPISODIO
          </span>

          <h2>
            Crear desde la historia
          </h2>

          <p>
            Más adelante podrás
            elegir un recuerdo o
            capítulo y convertirlo
            en un guion para
            podcast.
          </p>

          <button className="primaryButton">
            Crear episodio
          </button>
        </div>

        <div className="podcastCard">
          <span>
            AUDIO EXISTENTE
          </span>

          <h2>
            Subir un podcast
          </h2>

          <p>
            Guardá un episodio que
            ya tengas grabado.
          </p>

          <button
            className="secondaryButton"
            onClick={() =>
              podcastInput.current?.click()
            }
          >
            Subir audio
          </button>

          <input
            ref={podcastInput}
            hidden
            type="file"
            accept="audio/*"
            onChange={(e) =>
              uploadFiles(
                Array.from(
                  e.target.files ||
                    []
                ),
                "podcast"
              )
            }
          />
        </div>
      </div>

      <div className="socialFuture">
        <span>
          DISTRIBUCIÓN
        </span>

        <h3>
          Instagram · YouTube ·
          TikTok · Spotify ·
          Facebook
        </h3>

        <p>
          Esta parte la conectamos
          después de terminar bien
          el flujo del libro.
        </p>
      </div>
    </section>
  );
}

/*
================================
DISEÑO
================================
*/

function DesignPage({
  design,
  updateDesign,
  restorePremium,
  backgroundInput,
  uploadBackground,
}) {
  return (
    <section className="page">
      <div className="designTop">
        <div>
          <div className="eyebrow">
            PERSONALIZACIÓN
          </div>

          <h1 className="pageTitle">
            Diseño
          </h1>

          <p className="pageSubtitle">
            Los cambios se ven y se
            guardan automáticamente.
          </p>
        </div>

        <button
          className="secondaryButton"
          onClick={
            restorePremium
          }
        >
          Restaurar PREMIUM
        </button>
      </div>

      <div className="designGrid">
        <DesignGroup title="Fondo">
          <ColorField
            label="Color"
            value={
              design.background
            }
            onChange={(value) =>
              updateDesign(
                "background",
                value
              )
            }
          />

          <button
            className="secondaryButton"
            onClick={() =>
              backgroundInput.current?.click()
            }
          >
            Subir imagen de fondo
          </button>

          <input
            ref={
              backgroundInput
            }
            hidden
            type="file"
            accept="image/*"
            onChange={
              uploadBackground
            }
          />

          <RangeField
            label="Visibilidad"
            value={
              design.backgroundOpacity
            }
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

          <RangeField
            label="Desenfoque"
            value={
              design.backgroundBlur
            }
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
        </DesignGroup>

        <DesignGroup title="Colores">
          <ColorField
            label="Principal"
            value={
              design.accent
            }
            onChange={(value) =>
              updateDesign(
                "accent",
                value
              )
            }
          />

          <ColorField
            label="Texto"
            value={
              design.text
            }
            onChange={(value) =>
              updateDesign(
                "text",
                value
              )
            }
          />

          <ColorField
            label="Tarjetas"
            value={
              design.card
            }
            onChange={(value) =>
              updateDesign(
                "card",
                value
              )
            }
          />

          <ColorField
            label="Menú"
            value={
              design.sidebar
            }
            onChange={(value) =>
              updateDesign(
                "sidebar",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Forma">
          <RangeField
            label="Redondeo"
            value={
              design.radius
            }
            min={0}
            max={40}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "radius",
                value
              )
            }
          />

          <RangeField
            label="Transparencia tarjetas"
            value={
              design.cardOpacity
            }
            min={20}
            max={100}
            suffix="%"
            onChange={(value) =>
              updateDesign(
                "cardOpacity",
                value
              )
            }
          />

          <RangeField
            label="Ancho del menú"
            value={
              design.sidebarWidth
            }
            min={200}
            max={350}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "sidebarWidth",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Tipografía">
          <SelectField
            label="Títulos"
            value={
              design.titleFont
            }
            options={[
              "Georgia",
              "Arial",
              "Helvetica",
            ]}
            onChange={(value) =>
              updateDesign(
                "titleFont",
                value
              )
            }
          />

          <SelectField
            label="Texto"
            value={
              design.bodyFont
            }
            options={[
              "Arial",
              "Georgia",
            ]}
            onChange={(value) =>
              updateDesign(
                "bodyFont",
                value
              )
            }
          />
        </DesignGroup>
      </div>
    </section>
  );
}

/*
================================
COMPONENTES
================================
*/

function EditableText({
  tag = "div",
  value,
  onChange,
  className = "",
}) {
  const Tag = tag;

  const ref = useRef(null);

  useEffect(() => {
    if (
      ref.current &&
      ref.current.innerText !==
        value
    ) {
      ref.current.innerText =
        value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref}
      className={
        `${className} editableText`
      }
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) =>
        onChange(
          e.currentTarget.innerText
        )
      }
    />
  );
}

function SimplePage({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="page">
      <div className="eyebrow">
        {eyebrow}
      </div>

      <h1 className="pageTitle">
        {title}
      </h1>

      <p className="pageSubtitle">
        {description}
      </p>

      <div className="pageBody">
        {children}
      </div>
    </section>
  );
}

function ArchiveCard({
  title,
  number,
}) {
  return (
    <div className="archiveCard">
      <span>{title}</span>

      <strong>
        {number}
      </strong>
    </div>
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

function ColorField({
  label,
  value,
  onChange,
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <div className="colorField">
        <input
          type="color"
          value={value}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
        />

        <span>
          {value}
        </span>
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}) {
  return (
    <div className="field">
      <div className="fieldTop">
        <label>
          {label}
        </label>

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
            Number(
              e.target.value
            )
          )
        }
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div className="field">
      <label>{label}</label>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={
                option
              }
              value={
                option
              }
            >
              {option}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";

  try {
    return new Date(
      value
    ).toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  } catch {
    return "";
  }
}

function hexToRgba(
  hex,
  opacity = 1
) {
  const value =
    hex.replace("#", "");

  const bigint =
    parseInt(value, 16);

  const r =
    (bigint >> 16) & 255;

  const g =
    (bigint >> 8) & 255;

  const b =
    bigint & 255;

  return `rgba(${r},${g},${b},${opacity})`;
}
