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
  IA EDITORA
  ===========================
  */

  const [editorLoading, setEditorLoading] =
    useState(false);

  const [editorProposal, setEditorProposal] =
    useState(null);

  const [editorError, setEditorError] =
    useState("");

  const [lastMemory, setLastMemory] =
    useState("");

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

    return data || [];
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

    return data || [];
  }

  /*
  ===========================
  IA EDITORA
  ===========================
  */

  async function analyzeWithEditor(
    memoryText,
    currentStories = stories,
    currentChapters = chapters
  ) {
    if (!memoryText?.trim()) {
      return;
    }

    setEditorLoading(true);
    setEditorError("");
    setEditorProposal(null);

    try {
      const response =
        await fetch(
          "/api/editor",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              memory:
                memoryText,

              memories:
                currentStories ||
                [],

              chapters:
                currentChapters ||
                [],
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Claude no pudo analizar el recuerdo."
        );
      }

      setEditorProposal(
        data.result
      );

      flash(
        "La IA Editora terminó de analizar el recuerdo."
      );
    } catch (error) {
      console.error(error);

      setEditorError(
        error?.message ||
          "No se pudo conectar con la IA Editora."
      );
    } finally {
      setEditorLoading(
        false
      );
    }
  }

  function updateEditorText(
    value
  ) {
    setEditorProposal(
      (prev) => ({
        ...prev,
        proposed_text:
          value,
      })
    );
  }

  function discardEditorProposal() {
    setEditorProposal(
      null
    );

    setEditorError("");

    setLastMemory("");
  }

  async function retryEditor() {
    if (!lastMemory) {
      flash(
        "No hay un recuerdo para volver a analizar."
      );
      return;
    }

    await analyzeWithEditor(
      lastMemory,
      stories,
      chapters
    );
  }

  async function acceptEditorProposal() {
    if (
      !editorProposal ||
      !project?.id
    ) {
      return;
    }

    const proposedText =
      editorProposal
        .proposed_text
        ?.trim();

    if (!proposedText) {
      flash(
        "La propuesta no tiene texto."
      );
      return;
    }

    setLoading(true);

    try {
      let targetChapter =
        null;

      /*
      Primero intenta encontrar
      capítulo por ID.
      */

      if (
        editorProposal
          .chapter_id
      ) {
        targetChapter =
          chapters.find(
            (chapter) =>
              String(
                chapter.id
              ) ===
              String(
                editorProposal
                  .chapter_id
              )
          ) || null;
      }

      /*
      Si Claude no devolvió ID,
      intenta encontrarlo por título.
      */

      if (
        !targetChapter &&
        editorProposal
          .recommended_action ===
          "existing_chapter" &&
        editorProposal
          .chapter_title
      ) {
        targetChapter =
          chapters.find(
            (chapter) =>
              normalizeText(
                chapter.title
              ) ===
              normalizeText(
                editorProposal
                  .chapter_title
              )
          ) || null;
      }

      /*
      CAPÍTULO EXISTENTE
      */

      if (targetChapter) {
        const previousContent =
          targetChapter
            .content || "";

        const updatedContent =
          previousContent
            ? `${previousContent}\n\n${proposedText}`
            : proposedText;

        const {
          error,
        } =
          await supabase
            .from(
              "chapters"
            )
            .update({
              content:
                updatedContent,
            })
            .eq(
              "id",
              targetChapter.id
            );

        if (error) {
          throw error;
        }
      } else {
        /*
        CAPÍTULO NUEVO
        */

        const nextNumber =
          chapters.length +
          1;

        const {
          error,
        } =
          await supabase
            .from(
              "chapters"
            )
            .insert({
              project_id:
                project.id,

              chapter_number:
                nextNumber,

              title:
                editorProposal
                  .chapter_title ||
                `Capítulo ${nextNumber}`,

              content:
                proposedText,
            });

        if (error) {
          /*
          Compatibilidad por si
          chapter_number no existe.
          */

          const fallback =
            await supabase
              .from(
                "chapters"
              )
              .insert({
                project_id:
                  project.id,

                title:
                  editorProposal
                    .chapter_title ||
                  `Capítulo ${nextNumber}`,

                content:
                  proposedText,
              });

          if (
            fallback.error
          ) {
            throw fallback.error;
          }
        }
      }

      await loadChapters(
        project.id
      );

      setEditorProposal(
        null
      );

      setEditorError("");

      setLastMemory("");

      flash(
        "La propuesta fue incorporada al libro."
      );

      setActive(
        "El Libro"
      );
    } catch (error) {
      console.error(error);

      flash(
        "No se pudo incorporar al libro: " +
          error.message
      );
    } finally {
      setLoading(false);
    }
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
    setEditorError("");
    setEditorProposal(
      null
    );

    try {
      const memoryText =
        text.trim();

      const {
        data: savedStory,
        error,
      } =
        await supabase
          .from("stories")
          .insert({
            project_id:
              project.id,

            title:
              title.trim() ||
              "Recuerdo sin título",

            original_text:
              memoryText,

            source_type:
              "written",
          })
          .select()
          .single();

      if (error) {
        throw error;
      }

      const refreshedStories =
        await loadStories(
          project.id
        );

      const refreshedChapters =
        await loadChapters(
          project.id
        );

      setLastMemory(
        memoryText
      );

      flash(
        "Recuerdo guardado. La IA Editora lo está analizando."
      );

      setLoading(false);

      /*
      El recuerdo YA ESTÁ GUARDADO.
      Ahora entra Claude.
      */

      await analyzeWithEditor(
        memoryText,
        refreshedStories ||
          [
            savedStory,
            ...stories,
          ],
        refreshedChapters ||
          chapters
      );

      return true;
    } catch (error) {
      console.error(error);

      setLoading(false);

      flash(
        "No se pudo guardar: " +
          error.message
      );

      return false;
    }
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
      flash(
        error.message
      );
      return;
    }

    await loadStories(
      project.id
    );

    flash(
      "Recuerdo eliminado."
    );
  }

  /*
  ===========================
  LIBRO
  ===========================
  */

  async function createChapter() {
    if (!project?.id) {
      return;
    }

    const number =
      chapters.length + 1;

    let result =
      await supabase
        .from("chapters")
        .insert({
          project_id:
            project.id,

          chapter_number:
            number,

          title:
            `Capítulo ${number}`,

          content: "",
        });

    /*
    Compatibilidad si la tabla
    no tiene chapter_number.
    */

    if (result.error) {
      result =
        await supabase
          .from(
            "chapters"
          )
          .insert({
            project_id:
              project.id,

            title:
              `Capítulo ${number}`,

            content: "",
          });
    }

    if (result.error) {
      flash(
        "No se pudo crear el capítulo: " +
          result.error.message
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
    setChapters(
      (prev) =>
        prev.map(
          (chapter) =>
            chapter.id === id
              ? {
                  ...chapter,
                  [field]:
                    value,
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
      flash(
        error.message
      );

      return;
    }

    await loadChapters(
      project.id
    );

    flash(
      "Capítulo eliminado."
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
    if (!files?.length) {
      return;
    }

    let uploaded = 0;

    for (
      const file of files
    ) {
      try {
        const cleanName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

        const path =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(
              2
            )}-${cleanName}`;

        const {
          error,
        } =
          await supabase.storage
            .from(
              "memorias"
            )
            .upload(
              path,
              file,
              {
                upsert:
                  false,
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
    setDesign(
      (prev) => ({
        ...prev,
        [key]: value,
      })
    );
  }

  function updateText(
    key,
    value
  ) {
    setTexts(
      (prev) => ({
        ...prev,
        [key]: value,
      })
    );
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
      event.target
        .files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload =
      () => {
        updateDesign(
          "backgroundImage",
          reader.result
        );
      };

    reader.readAsDataURL(
      file
    );
  }

  function flash(
    message
  ) {
    setNotice(
      message
    );

    setTimeout(
      () => {
        setNotice("");
      },
      2800
    );
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
          onChange={(
            value
          ) =>
            updateText(
              "projectName",
              value
            )
          }
        />

        <nav className="navigation">
          {MENU.map(
            (item) => (
              <button
                key={
                  item
                }
                className={
                  active ===
                  item
                    ? "navItem active"
                    : "navItem"
                }
                onClick={() =>
                  setActive(
                    item
                  )
                }
              >
                {item}
              </button>
            )
          )}
        </nav>

        <div className="sidebarFooter">
          ARCHIVO BIOGRÁFICO
        </div>
      </aside>

      <main className="mainContent">
        {active ===
          "Inicio" && (
          <HomePage
            texts={
              texts
            }
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
            texts={
              texts
            }
            updateText={
              updateText
            }
            stories={
              stories
            }
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
            editorLoading={
              editorLoading
            }
            editorProposal={
              editorProposal
            }
            editorError={
              editorError
            }
            updateEditorText={
              updateEditorText
            }
            acceptEditorProposal={
              acceptEditorProposal
            }
            discardEditorProposal={
              discardEditorProposal
            }
            retryEditor={
              retryEditor
            }
          />
        )}

        {active ===
          "El Libro" && (
          <BookPage
            texts={
              texts
            }
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
            texts={
              texts
            }
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
            design={
              design
            }
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
          onChange={(
            value
          ) =>
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
          onChange={(
            value
          ) =>
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
            ref={
              audioInput
            }
            hidden
            multiple
            type="file"
            accept="audio/*"
            onChange={(
              e
            ) =>
              uploadFiles(
                Array.from(
                  e.target
                    .files ||
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
          <span>
            01
          </span>

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
          <span>
            02
          </span>

          <h3>
            La IA lo analiza
          </h3>

          <p>
            Claude detecta personas,
            lugares, períodos y dónde
            debería entrar en el libro.
          </p>
        </div>

        <div className="workflowArrow">
          →
        </div>

        <div className="workflowCard">
          <span>
            03
          </span>

          <h3>
            Vos decidís
          </h3>

          <p>
            Revisás la propuesta y
            recién entonces la
            incorporás al manuscrito.
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
          onClick={
            goBook
          }
        >
          <span>
            EL LIBRO
          </span>

          <strong>
            Ver cómo va quedando →
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
          ref={
            mediaInput
          }
          hidden
          multiple
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={(
            e
          ) =>
            uploadFiles(
              Array.from(
                e.target
                  .files ||
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

  editorLoading,
  editorProposal,
  editorError,
  updateEditorText,
  acceptEditorProposal,
  discardEditorProposal,
  retryEditor,
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
        onChange={(
          value
        ) =>
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
        onChange={(
          value
        ) =>
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
                audioInput
