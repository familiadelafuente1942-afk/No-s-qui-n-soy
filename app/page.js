"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const supabase = useMemo(() => getSupabase(), []);

  const audioInput = useRef(null);
  const mediaInput = useRef(null);
  const backgroundInput = useRef(null);
  const podcastInput = useRef(null);

  const [active, setActive] = useState("Inicio");
  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [texts, setTexts] = useState(DEFAULT_TEXTS);

  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const [editorLoading, setEditorLoading] = useState(false);
  const [editorProposal, setEditorProposal] = useState(null);
  const [editorError, setEditorError] = useState("");
  const [lastMemory, setLastMemory] = useState("");

  useEffect(() => {
    loadLocalPreferences();
    boot();
  }, []);

  function loadLocalPreferences() {
    try {
      const savedDesign =
        localStorage.getItem("nqs_design");

      const savedTexts =
        localStorage.getItem("nqs_texts");

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

  async function boot() {
    setLoading(true);

    try {
      let { data: foundProject, error } =
        await supabase
          .from("projects")
          .select("*")
          .eq("title", "NO SE QUIEN SOY")
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
              title: "NO SE QUIEN SOY",
            })
            .select()
            .single();

        if (created.error) {
          throw created.error;
        }

        foundProject = created.data;
      }

      setProject(foundProject);

      if (foundProject?.id) {
        await Promise.all([
          loadStories(foundProject.id),
          loadChapters(foundProject.id),
        ]);
      }
    } catch (error) {
      flash(
        "No se pudo conectar con Supabase: " +
          error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadStories(projectId) {
    const { data, error } =
      await supabase
        .from("stories")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(error);
      return [];
    }

    const result = data || [];

    setStories(result);

    return result;
  }

  async function loadChapters(projectId) {
    const { data, error } =
      await supabase
        .from("chapters")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", {
          ascending: true,
        });

    if (error) {
      console.error(error);
      return [];
    }

    const result = data || [];

    setChapters(result);

    return result;
  }

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
        await fetch("/api/editor", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            mode: "memory",
            memory: memoryText,
            memories:
              currentStories || [],
            chapters:
              currentChapters || [],
          }),
        });

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
      setEditorError(
        error?.message ||
          "No se pudo conectar con la IA Editora."
      );
    } finally {
      setEditorLoading(false);
    }
  }

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

    setEditorProposal(null);

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

      setLoading(false);

      flash(
        "Recuerdo guardado. La IA Editora lo está analizando."
      );

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
      setLoading(false);

      flash(
        "No se pudo guardar: " +
          error.message
      );

      return false;
    }
  }

  async function deleteStory(id) {
    const ok =
      window.confirm(
        "¿Eliminar este recuerdo?"
      );

    if (!ok) {
      return;
    }

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

    flash(
      "Recuerdo eliminado."
    );
  }

  function updateEditorText(value) {
    setEditorProposal(
      (previous) => ({
        ...previous,
        proposed_text:
          value,
      })
    );
  }

  function discardEditorProposal() {
    setEditorProposal(null);

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

  async function insertChapter(row) {
    let result =
      await supabase
        .from("chapters")
        .insert(row);

    if (
      result.error &&
      Object.prototype.hasOwnProperty.call(
        row,
        "chapter_number"
      )
    ) {
      const {
        chapter_number,
        ...fallback
      } = row;

      result =
        await supabase
          .from("chapters")
          .insert(fallback);
    }

    return result;
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

      if (targetChapter) {
        const updatedContent =
          targetChapter.content
            ? `${targetChapter.content}\n\n${proposedText}`
            : proposedText;

        const { error } =
          await supabase
            .from("chapters")
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
        const nextNumber =
          chapters.length + 1;

        const result =
          await insertChapter({
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

        if (result.error) {
          throw result.error;
        }
      }

      await loadChapters(
        project.id
      );

      discardEditorProposal();

      flash(
        "La propuesta fue incorporada al libro."
      );

      setActive(
        "El Libro"
      );
    } catch (error) {
      flash(
        "No se pudo incorporar al libro: " +
          error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function createChapter() {
    if (!project?.id) {
      return;
    }

    const number =
      chapters.length + 1;

    const result =
      await insertChapter({
        project_id:
          project.id,

        chapter_number:
          number,

        title:
          `Capítulo ${number}`,

        content: "",
      });

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
      (previous) =>
        previous.map(
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
          [field]:
            value,
        })
        .eq("id", id);

    if (error) {
      flash(
        "No se pudo actualizar el capítulo."
      );
    }
  }

  async function deleteChapter(id) {
    const ok =
      window.confirm(
        "¿Eliminar este capítulo?"
      );

    if (!ok) {
      return;
    }

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

  async function uploadFiles(
    files,
    type = "archivo"
  ) {
    if (!files?.length) {
      return;
    }

    let uploaded = 0;

    for (const file of files) {
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

        const { error } =
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

  function updateDesign(
    key,
    value
  ) {
    setDesign(
      (previous) => ({
        ...previous,
        [key]:
          value,
      })
    );
  }

  function updateText(
    key,
    value
  ) {
    setTexts(
      (previous) => ({
        ...previous,
        [key]:
          value,
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

    if (!file) {
      return;
    }

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
      <style>
        {`
        .immersiveWriter{
          position:fixed;
          inset:0;
          z-index:999999;
          display:flex;
          flex-direction:column;
          background:#0b0b0b;
          color:var(--text);
          overflow:hidden;
        }

        .immersiveWriter:before{
          content:"";
          position:absolute;
          inset:0;
          background-image:var(--background-image);
          background-size:cover;
          background-position:center;
          opacity:.10;
          filter:blur(9px);
          transform:scale(1.05);
          pointer-events:none;
        }

        .immersiveWriter:after{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(
            180deg,
            rgba(8,8,8,.86),
            rgba(8,8,8,.97)
          );
          pointer-events:none;
        }

        .immersiveTopbar{
          position:relative;
          z-index:5;
          min-height:76px;
          display:grid;
          grid-template-columns:1fr auto 1fr;
          align-items:center;
          gap:20px;
          padding:0 34px;
          background:rgba(10,10,10,.78);
          border-bottom:1px solid rgba(255,255,255,.08);
          backdrop-filter:blur(18px);
        }

        .immersiveBack{
          justify-self:start;
          border:0;
          background:transparent;
          color:#f1eee7;
          font-size:16px;
          cursor:pointer;
          padding:15px 0;
        }

        .immersiveIdentity{
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:4px;
        }

        .immersiveIdentity strong{
          font-family:var(--title-font);
          font-weight:400;
          font-size:17px;
          letter-spacing:.14em;
        }

        .immersiveIdentity small{
          color:var(--accent);
          font-size:9px;
          letter-spacing:.26em;
        }

        .immersiveStatus{
          justify-self:end;
          color:var(--secondary);
          font-size:11px;
        }

        .immersiveBody{
          position:relative;
          z-index:5;
          flex:1;
          min-height:0;
          overflow-y:auto;
          display:flex;
          justify-content:center;
        }

        .immersiveDocument{
          width:min(920px,calc(100% - 70px));
          min-height:100%;
          padding:64px 0 100px;
          box-sizing:border-box;
        }

        .immersiveEyebrow{
          color:var(--accent);
          font-size:10px;
          letter-spacing:.24em;
          font-weight:700;
          margin-bottom:24px;
        }

        .immersiveTitle{
          display:block;
          width:100%;
          box-sizing:border-box;
          border:0;
          outline:0;
          background:transparent;
          color:var(--text);
          font-family:var(--title-font);
          font-size:clamp(34px,5vw,62px);
          line-height:1.08;
          padding:0;
          margin:0 0 34px;
        }

        .immersiveTitle::placeholder{
          color:rgba(241,238,231,.25);
        }

        .immersiveTextarea{
          display:block;
          width:100%;
          min-height:calc(100vh - 380px);
          box-sizing:border-box;
          border:0;
          outline:0;
          resize:none;
          padding:0;
          background:transparent;
          color:var(--text);
          caret-color:var(--accent);
          font-family:var(--title-font);
          font-size:clamp(21px,2vw,27px);
          line-height:1.72;
        }

        .immersiveTextarea::placeholder{
          color:rgba(241,238,231,.25);
        }

        .immersiveFooter{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:25px;
          padding-top:24px;
          margin-top:34px;
          border-top:1px solid rgba(255,255,255,.08);
        }

        .immersiveInfo{
          display:flex;
          flex-direction:column;
          gap:5px;
        }

        .immersiveInfo strong{
          color:var(--accent);
          font-size:13px;
        }

        .immersiveInfo span{
          color:var(--secondary);
          font-size:12px;
        }

        .immersiveActions{
          display:flex;
          gap:10px;
          align-items:center;
        }

        .draftResume{
          margin-top:24px;
          padding:18px 22px;
          border:1px solid rgba(221,201,158,.22);
          border-radius:var(--radius);
          background:rgba(18,18,18,.90);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:20px;
        }

        .draftResumeInfo{
          display:flex;
          flex-direction:column;
          gap:5px;
        }

        .draftResumeInfo span{
          color:var(--accent);
          font-size:9px;
          letter-spacing:.20em;
        }

        .draftResumeInfo strong{
          font-family:var(--title-font);
          font-size:18px;
        }

        .draftResumeInfo small{
          color:var(--secondary);
        }

        @media(max-width:800px){
          .immersiveTopbar{
            min-height:64px;
            grid-template-columns:1fr auto;
            padding:0 18px;
          }

          .immersiveIdentity{
            display:none;
          }

          .immersiveStatus{
            font-size:9px;
          }

          .immersiveDocument{
            width:calc(100% - 38px);
            padding:42px 0 80px;
          }

          .immersiveTitle{
            font-size:38px;
          }

          .immersiveTextarea{
            min-height:calc(100vh - 315px);
            font-size:21px;
          }

          .immersiveFooter{
            flex-direction:column;
            align-items:stretch;
          }

          .immersiveActions{
            width:100%;
          }

          .immersiveActions button{
            flex:1;
          }

          .draftResume{
            flex-direction:column;
            align-items:stretch;
          }
        }
        `}
      </style>

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
          {MENU.map(
            (item) => (
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
            )
          )}
        </nav>

        <div className="sidebarFooter">
          ARCHIVO BIOGRÁFICO
        </div>
      </aside>

      <main className="mainContent">
        {active === "Inicio" && (
          <HomePage
            texts={texts}
            updateText={updateText}
            storyCount={stories.length}
            chapterCount={chapters.length}
            goHistory={() =>
              setActive("Mi Historia")
            }
            goBook={() =>
              setActive("El Libro")
            }
            audioInput={audioInput}
            mediaInput={mediaInput}
            uploadFiles={uploadFiles}
          />
        )}

        {active ===
          "Mi Historia" && (
          <HistoryPage
            texts={texts}
            updateText={updateText}
            stories={stories}
            saveStory={saveStory}
            deleteStory={deleteStory}
            loading={loading}
            audioInput={audioInput}
            uploadFiles={uploadFiles}
            editorLoading={editorLoading}
            editorProposal={editorProposal}
            editorError={editorError}
            updateEditorText={updateEditorText}
            acceptEditorProposal={acceptEditorProposal}
            discardEditorProposal={discardEditorProposal}
            retryEditor={retryEditor}
          />
        )}

        {active ===
          "El Libro" && (
          <BookPage
            texts={texts}
            updateText={updateText}
            chapters={chapters}
            createChapter={createChapter}
            updateChapter={updateChapter}
            deleteChapter={deleteChapter}
            stories={stories}
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
              Próximamente vas a poder
              relacionar cada persona
              con recuerdos, capítulos,
              fotos y audios.
            </div>
          </SimplePage>
        )}

        {active ===
          "Archivo" && (
          <ArchivePage
            stories={stories}
            chapters={chapters}
            mediaInput={mediaInput}
            uploadFiles={uploadFiles}
          />
        )}

        {active ===
          "Podcast" && (
          <PodcastPage
            texts={texts}
            updateText={updateText}
            podcastInput={podcastInput}
            uploadFiles={uploadFiles}
          />
        )}

        {active ===
          "Diseño" && (
          <DesignPage
            design={design}
            updateDesign={updateDesign}
            restorePremium={restorePremium}
            backgroundInput={backgroundInput}
            uploadBackground={uploadBackground}
          />
        )}
      </main>
    </div>
  );
}

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
          value={texts.homeTitle}
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
          value={texts.homeSubtitle}
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
            onClick={goHistory}
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
            onChange={(event) =>
              uploadFiles(
                Array.from(
                  event.target.files ||
                    []
                ),
                "audio"
              )
            }
          />
        </div>
      </section>

      <section className="workflow">
        <Workflow
          n="01"
          title="Contás un recuerdo"
        >
          Escribís o hablás
          libremente. No hace falta
          ordenar nada.
        </Workflow>

        <div className="workflowArrow">
          →
        </div>

        <Workflow
          n="02"
          title="La IA lo analiza"
        >
          Claude detecta personas,
          lugares, períodos y dónde
          debería entrar en el libro.
        </Workflow>

        <div className="workflowArrow">
          →
        </div>

        <Workflow
          n="03"
          title="Vos decidís"
        >
          Revisás la propuesta y
          recién entonces la
          incorporás al manuscrito.
        </Workflow>
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
          + Agregar fotos, documentos
          o videos
        </button>

        <input
          ref={mediaInput}
          hidden
          multiple
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={(event) =>
            uploadFiles(
              Array.from(
                event.target.files ||
                  []
              )
            )
          }
        />
      </section>
    </>
  );
}

function Workflow({
  n,
  title,
  children,
}) {
  return (
    <div className="workflowCard">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

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

  const [immersive, setImmersive] =
    useState(false);

  const immersiveTextRef =
    useRef(null);

  useEffect(() => {
    try {
      const savedTitle =
        localStorage.getItem(
          "nqs_story_draft_title"
        );

      const savedText =
        localStorage.getItem(
          "nqs_story_draft_text"
        );

      if (savedTitle) {
        setTitle(savedTitle);
      }

      if (savedText) {
        setText(savedText);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "nqs_story_draft_title",
        title
      );
    } catch {}
  }, [title]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "nqs_story_draft_text",
        text
      );
    } catch {}
  }, [text]);

  useEffect(() => {
    if (!immersive) {
      return;
    }

    const timer =
      setTimeout(() => {
        immersiveTextRef
          .current
          ?.focus();
      }, 120);

    return () =>
      clearTimeout(timer);
  }, [immersive]);

  function openImmersive() {
    setImmersive(true);
  }

  function closeImmersive() {
    setImmersive(false);
  }

  async function save() {
    const ok =
      await saveStory({
        title,
        text,
      });

    if (ok) {
      setTitle("");
      setText("");
      setImmersive(false);

      try {
        localStorage.removeItem(
          "nqs_story_draft_title"
        );

        localStorage.removeItem(
          "nqs_story_draft_text"
        );
      } catch {}
    }
  }

  return (
    <section className="page">
      {immersive && (
        <div className="immersiveWriter">
          <div className="immersiveTopbar">
            <button
              type="button"
              className="immersiveBack"
              onClick={closeImmersive}
            >
              ← Volver
            </button>

            <div className="immersiveIdentity">
              <strong>
                NO SE QUIEN SOY
              </strong>

              <small>
                ESCRITURA
              </small>
            </div>

            <div className="immersiveStatus">
              Borrador guardado
              automáticamente
            </div>
          </div>

          <div className="immersiveBody">
            <div className="immersiveDocument">
              <div className="immersiveEyebrow">
                NUEVO RECUERDO
              </div>

              <input
                className="immersiveTitle"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Título del recuerdo"
              />

              <textarea
                ref={immersiveTextRef}
                className="immersiveTextarea"
                value={text}
                onChange={(event) =>
                  setText(
                    event.target.value
                  )
                }
                placeholder="Escribí el recuerdo como te venga a la memoria..."
              />

              <div className="immersiveFooter">
                <div className="immersiveInfo">
                  <strong>
                    {countWords(text)}{" "}
                    palabras
                  </strong>

                  <span>
                    No hace falta
                    escribir como un
                    libro. Contalo como
                    ocurrió.
                  </span>
                </div>

                <div className="immersiveActions">
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() =>
                      audioInput.current?.click()
                    }
                  >
                    ● Audio
                  </button>

                  <button
                    type="button"
                    className="primaryButton"
                    disabled={
                      loading ||
                      editorLoading ||
                      !text.trim()
                    }
                    onClick={save}
                  >
                    {loading
                      ? "Guardando..."
                      : editorLoading
                        ? "IA analizando..."
                        : "Guardar recuerdo"}
                  </button>
                </div>
              </div>

              <input
                ref={audioInput}
                hidden
                multiple
                type="file"
                accept="audio/*"
                onChange={(event) =>
                  uploadFiles(
                    Array.from(
                      event.target.files ||
                        []
                    ),
                    "audio"
                  )
                }
              />
            </div>
          </div>
        </div>
      )}

      <div className="eyebrow">
        MATERIAL ORIGINAL
      </div>

      <EditableText
        tag="h1"
        className="pageTitle"
        value={texts.historyTitle}
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
        value={texts.historySubtitle}
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
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder="Título opcional"
          />

          <textarea
            className="storyTextarea"
            value={text}
            onChange={(event) =>
              setText(
                event.target.value
              )
            }
            onClick={openImmersive}
            onFocus={openImmersive}
            placeholder="Escribí el recuerdo como te venga a la memoria..."
          />

          <div className="writerBottom">
            <span>
              Tocá el cuadro y se abre
              en pantalla completa.
            </span>

            <button
              className="primaryButton"
              onClick={openImmersive}
            >
              Escribir
            </button>
          </div>

          <input
            ref={audioInput}
            hidden
            multiple
            type="file"
            accept="audio/*"
            onChange={(event) =>
              uploadFiles(
                Array.from(
                  event.target.files ||
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

          <button
            onClick={() => {
              setText(
                "Mi primer recuerdo es..."
              );

              setImmersive(true);
            }}
          >
            ¿Cuál es tu primer recuerdo?
          </button>

          <button
            onClick={() => {
              setText(
                "La casa donde crecí..."
              );

              setImmersive(true);
            }}
          >
            ¿Cómo era la casa donde
            creciste?
          </button>

          <button
            onClick={() => {
              setText(
                "Una de las personas que más marcó mi infancia fue..."
              );

              setImmersive(true);
            }}
          >
            ¿Quién marcó tu infancia?
          </button>

          <button
            onClick={() => {
              setText(
                "Una decisión que cambió mi vida fue..."
              );

              setImmersive(true);
            }}
          >
            ¿Cuál fue una decisión que
            cambió tu vida?
          </button>
        </aside>
      </div>

      {text.trim() && (
        <div className="draftResume">
          <div className="draftResumeInfo">
            <span>
              BORRADOR EN CURSO
            </span>

            <strong>
              {title ||
                "Recuerdo sin título"}
            </strong>

            <small>
              {countWords(text)} palabras
              · guardado automáticamente
            </small>
          </div>

          <button
            className="secondaryButton"
            onClick={openImmersive}
          >
            Continuar escribiendo
          </button>
        </div>
      )}

      <EditorPanel
        loading={editorLoading}
        proposal={editorProposal}
        error={editorError}
        updateEditorText={updateEditorText}
        accept={acceptEditorProposal}
        discard={discardEditorProposal}
        retry={retryEditor}
      />

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

        {stories.length === 0 ? (
          <div className="emptyPanel">
            Todavía no hay recuerdos.
          </div>
        ) : (
          <div className="storiesList">
            {stories.map(
              (story) => (
                <article
                  className="storyCard"
                  key={story.id}
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
                    {story.original_text}
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

function EditorPanel({
  loading,
  proposal,
  error,
  updateEditorText,
  accept,
  discard,
  retry,
}) {
  if (
    !loading &&
    !proposal &&
    !error
  ) {
    return null;
  }

  const panel = {
    marginTop: 28,
    marginBottom: 38,
    padding: 28,
    border:
      "1px solid var(--border)",
    borderRadius:
      "var(--radius)",
    background:
      "var(--card)",
  };

  const badge = {
    display:
      "inline-block",
    marginBottom: 16,
    color:
      "var(--accent)",
    fontSize: 11,
    letterSpacing:
      ".16em",
    fontWeight: 700,
  };

  const label = {
    display: "block",
    marginTop: 20,
    marginBottom: 7,
    color:
      "var(--secondary)",
    fontSize: 11,
    letterSpacing:
      ".12em",
    textTransform:
      "uppercase",
  };

  if (loading) {
    return (
      <section style={panel}>
        <span style={badge}>
          IA EDITORA · CLAUDE
        </span>

        <h2>
          Analizando el recuerdo…
        </h2>

        <p>
          Claude está buscando
          personas, lugares,
          períodos y el mejor lugar
          para incorporarlo al libro.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section style={panel}>
        <span style={badge}>
          IA EDITORA
        </span>

        <h2>
          No se pudo analizar
        </h2>

        <p>{error}</p>

        <button
          className="secondaryButton"
          onClick={retry}
        >
          Volver a intentar
        </button>
      </section>
    );
  }

  return (
    <section style={panel}>
      <span style={badge}>
        IA EDITORA · PROPUESTA
      </span>

      <h2>
        Así podría entrar este
        recuerdo en el libro
      </h2>

      {proposal.summary && (
        <>
          <span style={label}>
            RESUMEN
          </span>

          <p>
            {proposal.summary}
          </p>
        </>
      )}

      {proposal.people?.length >
        0 && (
        <>
          <span style={label}>
            PERSONAS
          </span>

          <p>
            {proposal.people.join(
              " · "
            )}
          </p>
        </>
      )}

      {proposal.places?.length >
        0 && (
        <>
          <span style={label}>
            LUGARES
          </span>

          <p>
            {proposal.places.join(
              " · "
            )}
          </p>
        </>
      )}

      {proposal.dates?.length >
        0 && (
        <>
          <span style={label}>
            FECHAS / PERÍODOS
          </span>

          <p>
            {proposal.dates.join(
              " · "
            )}
          </p>
        </>
      )}

      <span style={label}>
        CAPÍTULO PROPUESTO
      </span>

      <h3>
        {proposal.chapter_title ||
          "Nuevo capítulo"}
      </h3>

      {proposal.reason && (
        <p>
          {proposal.reason}
        </p>
      )}

      <span style={label}>
        TEXTO PROPUESTO PARA EL LIBRO
      </span>

      <textarea
        value={
          proposal.proposed_text ||
          ""
        }
        onChange={(event) =>
          updateEditorText(
            event.target.value
          )
        }
        style={{
          width: "100%",
          minHeight: 300,
          boxSizing:
            "border-box",
          marginTop: 10,
          padding: 20,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
          background:
            "rgba(0,0,0,.25)",
          color:
            "var(--text)",
          fontFamily:
            "var(--title-font)",
          fontSize: 18,
          lineHeight: 1.7,
          resize: "vertical",
          outline: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 22,
        }}
      >
        <button
          className="primaryButton"
          onClick={accept}
        >
          Aceptar en el libro
        </button>

        <button
          className="secondaryButton"
          onClick={retry}
        >
          Reescribir con IA
        </button>

        <button
          className="secondaryButton"
          onClick={discard}
        >
          Descartar propuesta
        </button>
      </div>
    </section>
  );
}

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
        value={texts.bookTitle}
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
        value={texts.bookSubtitle}
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
          onClick={createChapter}
        >
          + Nuevo capítulo
        </button>
      </div>

      {chapters.length === 0 ? (
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
            Guardá un recuerdo en
            “Mi Historia”. Claude lo
            analizará y te propondrá
            cómo incorporarlo.
          </p>

          <button
            className="primaryButton"
            onClick={createChapter}
          >
            Crear primer capítulo
          </button>
        </div>
      ) : (
        <div className="chapters">
          {chapters.map(
            (
              chapter,
              index
            ) => (
              <ChapterEditor
                key={chapter.id}
                chapter={chapter}
                number={index + 1}
                updateChapter={updateChapter}
                deleteChapter={deleteChapter}
                stories={stories}
                chapters={chapters}
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
  stories,
  chapters,
}) {
  const [title, setTitle] =
    useState(
      chapter.title || ""
    );

  const [content, setContent] =
    useState(
      chapter.content || ""
    );

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiProposal, setAiProposal] =
    useState(null);

  const [aiError, setAiError] =
    useState("");

  const [
    customInstruction,
    setCustomInstruction,
  ] = useState("");

  useEffect(() => {
    setTitle(
      chapter.title || ""
    );

    setContent(
      chapter.content || ""
    );
  }, [chapter]);

  async function runChapterAI(
    action,
    instruction = ""
  ) {
    const currentContent =
      content.trim();

    if (!currentContent) {
      setAiError(
        "El capítulo no tiene contenido para trabajar con IA."
      );

      return;
    }

    setAiLoading(true);

    setAiError("");

    setAiProposal(null);

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
              mode:
                "chapter",

              action,

              instruction,

              chapter: {
                ...chapter,
                title,
                content:
                  currentContent,
              },

              memories:
                stories || [],

              chapters:
                chapters || [],
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Claude no pudo editar este capítulo."
        );
      }

      setAiProposal(
        data.result
      );
    } catch (error) {
      setAiError(
        error?.message ||
          "No se pudo conectar con la IA Editora."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function acceptAIProposal() {
    if (
      !aiProposal
        ?.proposed_text
        ?.trim()
    ) {
      return;
    }

    const newText =
      aiProposal
        .proposed_text
        .trim();

    const newTitle =
      aiProposal
        .suggested_title
        ?.trim();

    setContent(newText);

    await updateChapter(
      chapter.id,
      "content",
      newText
    );

    if (
      newTitle &&
      newTitle !== title
    ) {
      setTitle(newTitle);

      await updateChapter(
        chapter.id,
        "title",
        newTitle
      );
    }

    setAiProposal(null);

    setAiError("");
  }

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
        onChange={(event) =>
          setTitle(
            event.target.value
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
        onChange={(event) =>
          setContent(
            event.target.value
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

      <div
        style={{
          marginTop: 18,
          padding: 18,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
          background:
            "rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            color:
              "var(--accent)",
            fontSize: 11,
            letterSpacing:
              ".14em",
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          IA EDITORA · CLAUDE
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <AIButton
            text="Mejorar redacción"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("improve")
            }
          />

          <AIButton
            text="Más literario"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("literary")
            }
          />

          <AIButton
            text="Más emocional"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("emotional")
            }
          />

          <AIButton
            text="Más cinematográfico"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("cinematic")
            }
          />

          <AIButton
            text="Ampliar"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("expand")
            }
          />

          <AIButton
            text="Resumir"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("shorten")
            }
          />

          <AIButton
            text="Revisar coherencia"
            disabled={aiLoading}
            onClick={() =>
              runChapterAI("coherence")
            }
          />
        </div>

        <input
          className="storyTitleInput"
          style={{
            marginTop: 14,
          }}
          value={customInstruction}
          onChange={(event) =>
            setCustomInstruction(
              event.target.value
            )
          }
          placeholder="O escribí una instrucción para Claude..."
        />

        <button
          className="secondaryButton"
          style={{
            marginTop: 10,
          }}
          disabled={
            aiLoading ||
            !customInstruction.trim()
          }
          onClick={() =>
            runChapterAI(
              "custom",
              customInstruction
            )
          }
        >
          Aplicar instrucción
        </button>

        {aiLoading && (
          <p>
            Claude está revisando el
            capítulo…
          </p>
        )}

        {aiError && (
          <p>
            {aiError}
          </p>
        )}

        {aiProposal && (
          <div
            style={{
              marginTop: 20,
            }}
          >
            {aiProposal.analysis && (
              <p>
                {
                  aiProposal.analysis
                }
              </p>
            )}

            {aiProposal
              .questions_for_author
              ?.length > 0 && (
              <>
                <strong>
                  Preguntas pendientes
                </strong>

                <ul>
                  {aiProposal.questions_for_author.map(
                    (
                      item,
                      index
                    ) => (
                      <li key={index}>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </>
            )}

            <textarea
              className="chapterContent"
              style={{
                minHeight: 320,
              }}
              value={
                aiProposal.proposed_text ||
                ""
              }
              onChange={(event) =>
                setAiProposal(
                  (previous) => ({
                    ...previous,

                    proposed_text:
                      event.target.value,
                  })
                )
              }
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 12,
              }}
            >
              <button
                className="primaryButton"
                onClick={acceptAIProposal}
              >
                Aceptar propuesta
              </button>

              <button
                className="secondaryButton"
                onClick={() =>
                  setAiProposal(null)
                }
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </div>

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

function AIButton({
  text,
  onClick,
  disabled,
}) {
  return (
    <button
      className="secondaryButton"
      disabled={disabled}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

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
          number={stories.length}
        />

        <ArchiveCard
          title="Capítulos"
          number={chapters.length}
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
        onChange={(event) =>
          uploadFiles(
            Array.from(
              event.target.files ||
                []
            )
          )
        }
      />
    </SimplePage>
  );
}

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
        value={texts.podcastTitle}
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
        value={texts.podcastSubtitle}
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
            en un guion para podcast.
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
            onChange={(event) =>
              uploadFiles(
                Array.from(
                  event.target.files ||
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
          Instagram · YouTube · TikTok
          · Spotify · Facebook
        </h3>
      </div>
    </section>
  );
}

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
          onClick={restorePremium}
        >
          Restaurar PREMIUM
        </button>
      </div>

      <div className="designGrid">
        <DesignGroup title="Fondo">
          <ColorField
            label="Color"
            value={design.background}
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
            ref={backgroundInput}
            hidden
            type="file"
            accept="image/*"
            onChange={uploadBackground}
          />

          <RangeField
            label="Visibilidad"
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
        </DesignGroup>

        <DesignGroup title="Colores">
          <ColorField
            label="Principal"
            value={design.accent}
            onChange={(value) =>
              updateDesign(
                "accent",
                value
              )
            }
          />

          <ColorField
            label="Texto"
            value={design.text}
            onChange={(value) =>
              updateDesign(
                "text",
                value
              )
            }
          />

          <ColorField
            label="Tarjetas"
            value={design.card}
            onChange={(value) =>
              updateDesign(
                "card",
                value
              )
            }
          />

          <ColorField
            label="Menú"
            value={design.sidebar}
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
            value={design.radius}
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
            value={design.cardOpacity}
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
            value={design.sidebarWidth}
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
            value={design.titleFont}
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
            value={design.bodyFont}
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
      ref.current.innerText !== value
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
      onBlur={(event) =>
        onChange(
          event.currentTarget.innerText
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
      <span>
        {title}
      </span>

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
      <h3>
        {title}
      </h3>

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
      <label>
        {label}
      </label>

      <div className="colorField">
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
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
        onChange={(event) =>
          onChange(
            Number(
              event.target.value
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
      <label>
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      >
        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function countWords(value) {
  const text =
    String(value || "").trim();

  if (!text) {
    return 0;
  }

  return text
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

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

function normalizeText(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function hexToRgba(
  hex,
  opacity = 1
) {
  const value =
    hex.replace("#", "");

  const bigint =
    parseInt(
      value,
      16
    );

  const r =
    (bigint >> 16) & 255;

  const g =
    (bigint >> 8) & 255;

  const b =
    bigint & 255;

  return `rgba(${r},${g},${b},${opacity})`;
}
