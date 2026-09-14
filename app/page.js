"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabase } from "../lib/supabase";

const MENU = ["Inicio", "Mi Historia", "El Libro", "Personas", "Archivo", "Podcast", "Diseño"];

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
  homeTitle: "Una vida. Muchos recuerdos. Un libro.",
  homeSubtitle:
    "Contá la historia como la recordás. La aplicación conserva cada recuerdo original y te ayuda a transformarlo en un libro.",
  historyTitle: "Contá la historia",
  historySubtitle: "Podés escribir un recuerdo o contarlo con tu propia voz.",
  bookTitle: "El Libro",
  bookSubtitle: "Acá se construye la versión narrativa de la historia, capítulo por capítulo.",
  podcastTitle: "Podcast",
  podcastSubtitle: "Convertí historias, capítulos y recuerdos en episodios de audio.",
};

export default function Home() {
  const supabase = useMemo(() => getSupabase(), []);
  const mediaInput = useRef(null);
  const backgroundInput = useRef(null);
  const podcastInput = useRef(null);

  const [active, setActive] = useState("Inicio");
  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [texts, setTexts] = useState(DEFAULT_TEXTS);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorProposal, setEditorProposal] = useState(null);
  const [editorError, setEditorError] = useState("");
  const [lastMemory, setLastMemory] = useState("");
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [draftSeed, setDraftSeed] = useState(null);

  useEffect(() => {
    loadLocalPreferences();
    boot();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("nqs_design", JSON.stringify(design));
    } catch {}
  }, [design]);

  useEffect(() => {
    try {
      localStorage.setItem("nqs_texts", JSON.stringify(texts));
    } catch {}
  }, [texts]);

  function loadLocalPreferences() {
    try {
      const savedDesign = localStorage.getItem("nqs_design");
      const savedTexts = localStorage.getItem("nqs_texts");

      if (savedDesign) {
        setDesign({ ...DEFAULT_DESIGN, ...JSON.parse(savedDesign) });
      }

      if (savedTexts) {
        setTexts({ ...DEFAULT_TEXTS, ...JSON.parse(savedTexts) });
      }
    } catch {}
  }

  async function boot() {
    setLoading(true);

    try {
      let { data: foundProject, error } = await supabase
        .from("projects")
        .select("*")
        .eq("title", "NO SE QUIEN SOY")
        .limit(1)
        .maybeSingle();

      if (error) console.error(error);

      if (!foundProject) {
        const created = await supabase
          .from("projects")
          .insert({ title: "NO SE QUIEN SOY" })
          .select()
          .single();

        if (created.error) throw created.error;
        foundProject = created.data;
      }

      setProject(foundProject);

      if (foundProject?.id) {
        await Promise.all([
          loadStories(foundProject.id),
          loadChapters(foundProject.id),
          loadMedia(foundProject.id),
        ]);
      }
    } catch (error) {
      flash("No se pudo conectar con Supabase: " + error.message);
    }

    setLoading(false);
  }

  async function loadStories(projectId) {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    const result = data || [];
    setStories(result);
    return result;
  }

  async function loadChapters(projectId) {
    const { data, error } = await supabase
      .from("chapters")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    const result = data || [];
    setChapters(result);
    return result;
  }

  async function loadMedia(projectId) {
    if (!projectId) return [];

    setMediaLoading(true);

    try {
      let { data: mediaRows, error: mediaError } = await supabase
        .from("media")
        .select("*")
        .eq("project_id", projectId);

      if (mediaError) {
        throw new Error(
          "No se pudo leer la tabla media: " + mediaError.message
        );
      }

      const folders = ["archivo", "audio", "podcast"];
      const knownPaths = new Set((mediaRows || []).map((row) => row.storage_path));
      const missingRows = [];

      for (const folder of folders) {
        const basePath = `${projectId}/${folder}`;

        const { data: storageItems, error: storageError } = await supabase.storage
          .from("memorias")
          .list(basePath, {
            limit: 1000,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (storageError) {
          console.error(`Error leyendo ${folder}:`, storageError);
          continue;
        }

        for (const item of storageItems || []) {
          if (!item?.name || !item?.id) continue;

          const storagePath = `${basePath}/${item.name}`;
          if (knownPaths.has(storagePath)) continue;

          const mime =
            item?.metadata?.mimetype ||
            item?.metadata?.contentType ||
            guessMimeFromName(item.name);

          missingRows.push({
            project_id: projectId,
            storage_path: storagePath,
            file_name: item.name,
            file_type: mime,
            photo_date: null,
          });

          knownPaths.add(storagePath);
        }
      }

      if (missingRows.length > 0) {
        const { error: backfillError } = await supabase
          .from("media")
          .insert(missingRows);

        if (backfillError) {
          console.error("No se pudieron registrar archivos antiguos:", backfillError);
        } else {
          const refreshed = await supabase
            .from("media")
            .select("*")
            .eq("project_id", projectId);

          if (!refreshed.error) {
            mediaRows = refreshed.data || [];
          }
        }
      }

      const collected = [];

      for (const row of mediaRows || []) {
        const signed = await supabase.storage
          .from("memorias")
          .createSignedUrl(row.storage_path, 60 * 60);

        if (signed.error) {
          console.error("No se pudo crear URL:", signed.error);
          continue;
        }

        const folder = row.storage_path?.split("/")?.[1] || "archivo";
        const mime = row.file_type || guessMimeFromName(row.file_name);

        collected.push({
          ...row,
          path: row.storage_path,
          name: row.file_name,
          folder,
          mime,
          url: signed.data?.signedUrl || "",
        });
      }

      setMediaFiles(collected);
      return collected;
    } catch (error) {
      console.error("Error cargando archivos:", error);
      flash(error?.message || "No se pudo cargar el archivo fotográfico.");
      return [];
    } finally {
      setMediaLoading(false);
    }
  }

  async function analyzeWithEditor(
    memoryText,
    currentStories = stories,
    currentChapters = chapters
  ) {
    if (!memoryText?.trim()) return;

    setEditorLoading(true);
    setEditorError("");
    setEditorProposal(null);

    try {
      const response = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "memory",
          memory: memoryText,
          memories: currentStories || [],
          chapters: currentChapters || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Claude no pudo analizar el recuerdo.");
      }

      setEditorProposal(data.result);
      flash("La IA Editora terminó de analizar el recuerdo.");
    } catch (error) {
      setEditorError(
        error?.message || "No se pudo conectar con la IA Editora."
      );
    } finally {
      setEditorLoading(false);
    }
  }

  async function saveStory({ title, text }) {
    if (!text.trim()) {
      flash("Escribí el recuerdo antes de guardarlo.");
      return false;
    }

    if (!project?.id) {
      flash("El proyecto todavía no está listo.");
      return false;
    }

    setLoading(true);
    setEditorError("");
    setEditorProposal(null);

    try {
      const memoryText = text.trim();

      const { data: savedStory, error } = await supabase
        .from("stories")
        .insert({
          project_id: project.id,
          title: title.trim() || "Recuerdo sin título",
          original_text: memoryText,
          source_type: "written",
        })
        .select()
        .single();

      if (error) throw error;

      const refreshedStories = await loadStories(project.id);
      const refreshedChapters = await loadChapters(project.id);

      setLastMemory(memoryText);
      setLoading(false);

      flash("Recuerdo guardado. La IA Editora lo está analizando.");

      await analyzeWithEditor(
        memoryText,
        refreshedStories || [savedStory, ...stories],
        refreshedChapters || chapters
      );

      return true;
    } catch (error) {
      setLoading(false);
      flash("No se pudo guardar: " + error.message);
      return false;
    }
  }

  async function deleteStory(id) {
    const ok = window.confirm("¿Eliminar este recuerdo?");
    if (!ok) return;

    const { error } = await supabase.from("stories").delete().eq("id", id);

    if (error) {
      flash(error.message);
      return;
    }

    await loadStories(project.id);
    flash("Recuerdo eliminado.");
  }

  function updateEditorText(value) {
    setEditorProposal((previous) => ({
      ...previous,
      proposed_text: value,
    }));
  }

  function discardEditorProposal() {
    setEditorProposal(null);
    setEditorError("");
    setLastMemory("");
  }

  async function retryEditor() {
    if (!lastMemory) {
      flash("No hay un recuerdo para volver a analizar.");
      return;
    }

    await analyzeWithEditor(lastMemory, stories, chapters);
  }

  async function insertChapter(row) {
    let result = await supabase.from("chapters").insert(row);

    if (
      result.error &&
      Object.prototype.hasOwnProperty.call(row, "chapter_number")
    ) {
      const { chapter_number, ...fallback } = row;
      result = await supabase.from("chapters").insert(fallback);
    }

    return result;
  }

  async function acceptEditorProposal() {
    if (!editorProposal || !project?.id) return;

    const proposedText = editorProposal.proposed_text?.trim();

    if (!proposedText) {
      flash("La propuesta no tiene texto.");
      return;
    }

    setLoading(true);

    try {
      let targetChapter = null;

      if (editorProposal.chapter_id) {
        targetChapter =
          chapters.find(
            (chapter) =>
              String(chapter.id) === String(editorProposal.chapter_id)
          ) || null;
      }

      if (
        !targetChapter &&
        editorProposal.recommended_action === "existing_chapter" &&
        editorProposal.chapter_title
      ) {
        targetChapter =
          chapters.find(
            (chapter) =>
              normalizeText(chapter.title) ===
              normalizeText(editorProposal.chapter_title)
          ) || null;
      }

      if (targetChapter) {
        const updatedContent = targetChapter.content
          ? `${targetChapter.content}\n\n${proposedText}`
          : proposedText;

        const { error } = await supabase
          .from("chapters")
          .update({ content: updatedContent })
          .eq("id", targetChapter.id);

        if (error) throw error;
      } else {
        const nextNumber = chapters.length + 1;

        const result = await insertChapter({
          project_id: project.id,
          chapter_number: nextNumber,
          title: editorProposal.chapter_title || `Capítulo ${nextNumber}`,
          content: proposedText,
        });

        if (result.error) throw result.error;
      }

      await loadChapters(project.id);
      discardEditorProposal();
      flash("La propuesta fue incorporada al libro.");
      setActive("El Libro");
    } catch (error) {
      flash("No se pudo incorporar al libro: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createChapter() {
    if (!project?.id) return;

    const number = chapters.length + 1;

    const result = await insertChapter({
      project_id: project.id,
      chapter_number: number,
      title: `Capítulo ${number}`,
      content: "",
    });

    if (result.error) {
      flash("No se pudo crear el capítulo: " + result.error.message);
      return;
    }

    await loadChapters(project.id);
    flash("Capítulo creado.");
  }

  async function updateChapter(id, field, value) {
    setChapters((previous) =>
      previous.map((chapter) =>
        chapter.id === id ? { ...chapter, [field]: value } : chapter
      )
    );

    const { error } = await supabase
      .from("chapters")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      flash("No se pudo actualizar el capítulo.");
    }
  }

  async function deleteChapter(id) {
    const ok = window.confirm("¿Eliminar este capítulo?");
    if (!ok) return;

    const { error } = await supabase.from("chapters").delete().eq("id", id);

    if (error) {
      flash(error.message);
      return;
    }

    await loadChapters(project.id);
    flash("Capítulo eliminado.");
  }

  async function uploadFiles(files, type = "archivo") {
    if (!files?.length) return { uploaded: 0, failed: 0 };

    if (!project?.id) {
      flash("El proyecto todavía no terminó de cargar.");
      return { uploaded: 0, failed: files.length };
    }

    setUploadingFiles(true);

    let uploaded = 0;
    let failed = 0;
    const errors = [];

    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      try {
        if (!file?.name) throw new Error("Archivo inválido.");

        const cleanName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");

        const uniqueId = `${Date.now()}-${index}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

        const path = `${project.id}/${type}/${uniqueId}-${cleanName}`;

        const { error: storageError } = await supabase.storage
          .from("memorias")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (storageError) {
          failed++;
          errors.push(`${file.name}: ${storageError.message}`);
          continue;
        }

        const { error: mediaError } = await supabase
          .from("media")
          .insert({
            project_id: project.id,
            storage_path: path,
            file_name: cleanName,
            file_type: file.type || guessMimeFromName(cleanName),
            photo_date: null,
          });

        if (mediaError) {
          console.error(
            "El archivo subió, pero no se pudo registrar en media:",
            mediaError
          );
        }

        uploaded++;
      } catch (error) {
        failed++;
        errors.push(
          `${file?.name || "Archivo"}: ${error?.message || "Error desconocido"}`
        );
      }
    }

    setUploadingFiles(false);
    await loadMedia(project.id);

    if (uploaded > 0 && failed === 0) {
      flash(
        uploaded === 1
          ? "Archivo subido correctamente."
          : `${uploaded} archivos subidos correctamente.`
      );
    } else if (uploaded > 0 && failed > 0) {
      flash(`${uploaded} archivos subidos. ${failed} no pudieron cargarse.`);
    } else if (failed > 0) {
      flash("No se pudo subir: " + (errors[0] || "Supabase rechazó la carga."));
    }

    return { uploaded, failed, errors };
  }

  async function handleMediaInput(event, type = "archivo") {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);

    if (!files.length) return;

    await uploadFiles(files, type);
    input.value = "";
  }

  async function deleteMedia(item) {
    if (!item?.path) return;

    const ok = window.confirm("¿Eliminar este archivo?");
    if (!ok) return;

    const { error: storageError } = await supabase.storage
      .from("memorias")
      .remove([item.path]);

    if (storageError) {
      flash("No se pudo eliminar: " + storageError.message);
      return;
    }

    const deleteQuery = item.id
      ? supabase.from("media").delete().eq("id", item.id)
      : supabase.from("media").delete().eq("storage_path", item.path);

    const { error: mediaError } = await deleteQuery;

    if (mediaError) {
      console.error("No se pudo borrar el registro media:", mediaError);
    }

    await loadMedia(project.id);
    flash("Archivo eliminado.");
  }

  async function updateMediaDate(item, value) {
    if (!item?.id) {
      flash("Este archivo todavía no tiene registro editable.");
      return;
    }

    const photoDate = value || null;

    setMediaFiles((previous) =>
      previous.map((file) =>
        file.id === item.id ? { ...file, photo_date: photoDate } : file
      )
    );

    const { error } = await supabase
      .from("media")
      .update({ photo_date: photoDate })
      .eq("id", item.id);

    if (error) {
      flash("No se pudo guardar la fecha: " + error.message);
      await loadMedia(project.id);
      return;
    }

    flash(photoDate ? "Fecha guardada." : "Fecha eliminada.");
  }

  function useRecordedTranscript(transcript, file) {
    if (file) {
      uploadFiles([file], "audio");
    }

    setDraftSeed({
      id: Date.now(),
      text: transcript || "",
    });

    setActive("Mi Historia");
    setRecorderOpen(false);

    flash(
      "Audio transcripto. Podés revisar el texto antes de guardarlo."
    );
  }

  function updateDesign(key, value) {
    setDesign((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function updateText(key, value) {
    setTexts((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function restorePremium() {
    setDesign(DEFAULT_DESIGN);
    setTexts(DEFAULT_TEXTS);

    flash("Diseño PREMIUM restaurado.");
  }

  function uploadBackground(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateDesign("backgroundImage", reader.result);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function flash(message) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 4000);
  }

  const variables = {
    "--bg": design.background,
    "--sidebar": design.sidebar,
    "--card": hexToRgba(design.card, design.cardOpacity / 100),
    "--accent": design.accent,
    "--text": design.text,
    "--secondary": design.secondary,
    "--border": design.border,
    "--radius": `${design.radius}px`,
    "--button-radius": `${design.buttonRadius}px`,
    "--sidebar-width": `${design.sidebarWidth}px`,
    "--content-width": `${design.contentWidth}px`,
    "--background-image": design.backgroundImage
      ? `url("${design.backgroundImage}")`
      : "none",
    "--background-opacity": design.backgroundOpacity / 100,
    "--background-blur": `blur(${design.backgroundBlur}px)`,
    "--title-font":
      design.titleFont === "Arial"
        ? "Arial, Helvetica, sans-serif"
        : design.titleFont === "Helvetica"
          ? "Helvetica, Arial, sans-serif"
          : 'Georgia, "Times New Roman", serif',
    "--body-font":
      design.bodyFont === "Georgia"
        ? 'Georgia, "Times New Roman", serif'
        : design.bodyFont === "Helvetica"
          ? "Helvetica, Arial, sans-serif"
          : "Arial, Helvetica, sans-serif",
  };

  return (
    <div className="appShell" style={variables}>
      <GlobalOverlayStyles />
      <div className="wallpaper" />

      {notice && <div className="notice">{notice}</div>}

      {recorderOpen && (
        <VoiceRecorder
          onClose={() => setRecorderOpen(false)}
          onUse={useRecordedTranscript}
        />
      )}

      <aside className="sidebar">
        <EditableText
          className="brand"
          value={texts.projectName}
          onChange={(value) => updateText("projectName", value)}
        />

        <nav className="navigation">
          {MENU.map((item) => (
            <button
              key={item}
              className={active === item ? "navItem active" : "navItem"}
              onClick={() => setActive(item)}
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
            updateText={updateText}
            storyCount={stories.length}
            chapterCount={chapters.length}
            mediaCount={mediaFiles.length}
            goHistory={() => setActive("Mi Historia")}
            goBook={() => setActive("El Libro")}
            openRecorder={() => setRecorderOpen(true)}
            mediaInput={mediaInput}
            handleMediaInput={handleMediaInput}
            uploadingFiles={uploadingFiles}
          />
        )}

        {active === "Mi Historia" && (
          <HistoryPage
            texts={texts}
            updateText={updateText}
            stories={stories}
            saveStory={saveStory}
            deleteStory={deleteStory}
            loading={loading}
            openRecorder={() => setRecorderOpen(true)}
            editorLoading={editorLoading}
            editorProposal={editorProposal}
            editorError={editorError}
            updateEditorText={updateEditorText}
            acceptEditorProposal={acceptEditorProposal}
            discardEditorProposal={discardEditorProposal}
            retryEditor={retryEditor}
            draftSeed={draftSeed}
          />
        )}

        {active === "El Libro" && (
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

        {active === "Personas" && (
          <SimplePage
            eyebrow="PERSONAJES"
            title="Personas"
            description="Familia, amigos, socios, amores y todas las personas importantes de la historia."
          >
            <div className="emptyPanel">
              Próximamente vas a poder relacionar cada persona con recuerdos,
              capítulos, fotos y audios.
            </div>
          </SimplePage>
        )}

        {active === "Archivo" && (
          <ArchivePage
            stories={stories}
            chapters={chapters}
            mediaFiles={mediaFiles}
            mediaLoading={mediaLoading}
            mediaInput={mediaInput}
            handleMediaInput={handleMediaInput}
            uploadingFiles={uploadingFiles}
            deleteMedia={deleteMedia}
            updateMediaDate={updateMediaDate}
            refreshMedia={() => loadMedia(project?.id)}
          />
        )}

        {active === "Podcast" && (
          <PodcastPage
            texts={texts}
            updateText={updateText}
            podcastInput={podcastInput}
            handleMediaInput={handleMediaInput}
            uploadingFiles={uploadingFiles}
          />
        )}

        {active === "Diseño" && (
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

function GlobalOverlayStyles() {
  return (
    <style>{`
html.nqs-lock,
body.nqs-lock {
  overflow: hidden !important;
}

.nqsOverlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 2147483647 !important;
  background: #090909 !important;
  color: #f1eee7;
  overflow: hidden;
}

.nqsOverlayTop {
  height: 74px;
  box-sizing: border-box;
  padding: 0 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: #0b0b0b;
}

.nqsOverlayBack {
  border: 0;
  background: transparent;
  color: #f1eee7;
  font-size: 16px;
  cursor: pointer;
}

.nqsRecorderBody {
  height: calc(100dvh - 74px);
  overflow-y: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  box-sizing: border-box;
}

.nqsRecorderCard {
  width: min(620px, 100%);
  text-align: center;
}

.nqsMicCircle {
  width: 122px;
  height: 122px;
  margin: 0 auto 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 44px;
  border: 1px solid rgba(221,201,158,.4);
  background: rgba(221,201,158,.08);
}

.nqsMicCircle.recording {
  border-color: #d76d6d;
  box-shadow: 0 0 0 12px rgba(215,109,109,.08);
}

.nqsRecorderTitle {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 42px;
  font-weight: 400;
  margin: 0 0 12px;
}

.nqsRecorderSubtitle {
  color: #aaa59c;
  line-height: 1.6;
  margin-bottom: 28px;
}

.nqsTimer {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 48px;
  margin: 22px 0;
}

.nqsRecorderActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.nqsRecButton {
  min-height: 48px;
  border-radius: 11px;
  padding: 0 22px;
  font-weight: 700;
  cursor: pointer;
}

.nqsRecPrimary {
  border: 1px solid #ddc99e;
  background: #ddc99e;
  color: #111;
}

.nqsRecSecondary {
  border: 1px solid #333;
  background: #171717;
  color: #f1eee7;
}

.nqsRecDanger {
  border: 1px solid #a85656;
  background: rgba(168,86,86,.14);
  color: #efb6b6;
}

.nqsRecButton:disabled {
  opacity: .45;
  cursor: default;
}

.nqsRecorderStatus {
  margin-top: 18px;
  color: #aaa59c;
  font-size: 13px;
}

.nqsAudioPreview {
  width: 100%;
  margin-top: 26px;
}

.nqsImmersiveOverlay {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 2147483646 !important;
  background: #090909 !important;
  color: #f1eee7;
  overflow: hidden;
}

.nqsImmersiveTop {
  height: 72px;
  box-sizing: border-box;
  padding: 0 28px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.nqsImmersiveTop button {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #f1eee7;
  font-size: 16px;
}

.nqsImmersiveBrand {
  text-align: center;
}

.nqsImmersiveBrand strong {
  display: block;
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 400;
  letter-spacing: .14em;
}

.nqsImmersiveBrand small {
  color: #ddc99e;
  font-size: 9px;
  letter-spacing: .24em;
}

.nqsImmersiveSaved {
  justify-self: end;
  color: #99958d;
  font-size: 11px;
}

.nqsImmersiveScroll {
  height: calc(100dvh - 72px);
  overflow-y: auto;
}

.nqsImmersivePage {
  width: min(900px, calc(100vw - 70px));
  margin: 0 auto;
  padding: 58px 0 100px;
}

.nqsImmersiveEyebrow {
  color: #ddc99e;
  font-size: 10px;
  letter-spacing: .25em;
  margin-bottom: 22px;
}

.nqsImmersiveTitle {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f1eee7;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(38px,5vw,62px);
  margin-bottom: 34px;
}

.nqsImmersiveText {
  width: 100%;
  min-height: calc(100dvh - 370px);
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: #f1eee7;
  caret-color: #ddc99e;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(21px,2vw,27px);
  line-height: 1.7;
}

.nqsImmersiveBottom {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.nqsDraftResume {
  margin-top: 24px;
  padding: 18px 22px;
  border: 1px solid rgba(221,201,158,.22);
  border-radius: var(--radius);
  background: rgba(18,18,18,.9);
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.nqsDraftResumeInfo {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nqsDraftResumeInfo span {
  color: var(--accent);
  font-size: 9px;
  letter-spacing: .2em;
}

.nqsDraftResumeInfo small {
  color: var(--secondary);
}

.designTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 30px;
  margin-bottom: 34px;
}

.designGrid {
  display: grid;
  grid-template-columns: repeat(2,minmax(0,1fr));
  gap: 18px;
}

.designGroup {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 24px;
}

.designGroup h3 {
  margin: 0 0 22px;
  font-family: var(--title-font);
  font-size: 22px;
  font-weight: 400;
  color: var(--text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 20px;
}

.field:last-child {
  margin-bottom: 0;
}

.field label {
  color: var(--secondary);
  font-size: 12px;
}

.fieldTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.fieldTop span {
  color: var(--accent);
  font-size: 12px;
}

.field input[type="range"] {
  width: 100%;
  accent-color: var(--accent);
}

.field select {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  color: var(--text);
  background: rgba(0,0,0,.25);
  border: 1px solid var(--border);
  border-radius: var(--button-radius);
}

.colorField {
  display: flex;
  align-items: center;
  gap: 12px;
}

.colorField input[type="color"] {
  width: 54px;
  height: 42px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
}

.colorField span {
  color: var(--secondary);
  font-size: 12px;
}

.designPreview {
  padding: 26px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
}

.uploadingMessage {
  display: inline-block;
  margin-top: 12px;
  color: var(--accent);
  font-size: 12px;
}

.mediaToolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 28px 0 18px;
  flex-wrap: wrap;
}

.mediaToolbar h2 {
  margin: 0;
  font-family: var(--title-font);
  font-size: 28px;
  font-weight: 400;
}

.mediaToolbarActions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mediaGrid {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 14px;
  margin-top: 16px;
}

.mediaCard {
  position: relative;
  min-height: 210px;
  overflow: hidden;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--card);
}

.mediaThumb {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  display: block;
  background: #111;
}

.mediaVideo {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  background: #111;
}

.mediaFilePlaceholder {
  aspect-ratio: 1/1;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  color: var(--secondary);
  background: rgba(0,0,0,.22);
  font-size: 13px;
}

.mediaMeta {
  padding: 12px 13px 14px;
}

.mediaName {
  color: var(--text);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mediaType {
  color: var(--secondary);
  font-size: 10px;
  margin-top: 5px;
  text-transform: uppercase;
  letter-spacing: .1em;
}

.mediaActions {
  display: flex;
  gap: 8px;
  padding: 0 13px 13px;
}

.mediaActions a,
.mediaActions button {
  flex: 1;
  min-height: 34px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: rgba(0,0,0,.2);
  color: var(--text);
  font-size: 11px;
  text-decoration: none;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.mediaActions button {
  color: #e8abab;
}

.mediaChronologyHint {
  margin-top: 7px;
  color: var(--secondary);
  font-size: 11px;
}

.mediaSortSelect {
  min-height: 42px;
  padding: 0 12px;
  border-radius: var(--button-radius);
  border: 1px solid var(--border);
  background: rgba(0,0,0,.3);
  color: var(--text);
}

.mediaDateEditor {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.mediaDateEditor label {
  color: var(--secondary);
  font-size: 10px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.mediaDateEditor input[type="date"] {
  width: 100%;
  min-height: 38px;
  box-sizing: border-box;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: rgba(0,0,0,.25);
  color: var(--text);
  padding: 0 10px;
}

.mediaDateEditor small {
  color: var(--secondary);
  font-size: 10px;
  line-height: 1.35;
}

.mediaEmpty {
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 34px;
  color: var(--secondary);
  text-align: center;
}

@media(max-width:1100px) {
  .mediaGrid {
    grid-template-columns: repeat(3,minmax(0,1fr));
  }
}

@media(max-width:800px) {
  .nqsRecorderTitle {
    font-size: 34px;
  }

  .nqsImmersiveTop {
    grid-template-columns: 1fr auto;
    padding: 0 18px;
  }

  .nqsImmersiveBrand {
    display: none;
  }

  .nqsImmersiveSaved {
    font-size: 9px;
  }

  .nqsImmersivePage {
    width: calc(100vw - 38px);
    padding-top: 40px;
  }

  .nqsImmersiveTitle {
    font-size: 38px;
  }

  .nqsImmersiveText {
    min-height: calc(100dvh - 310px);
    font-size: 21px;
  }

  .nqsImmersiveBottom,
  .nqsDraftResume,
  .designTop {
    flex-direction: column;
  }

  .designGrid {
    grid-template-columns: 1fr;
  }

  .mediaGrid {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }
}

@media(max-width:520px) {
  .mediaGrid {
    grid-template-columns: 1fr;
  }
}
`}</style>
  );
}

function VoiceRecorder({ onClose, onUse }) {
  const [portalReady, setPortalReady] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");

  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    setPortalReady(true);

    document.documentElement.classList.add("nqs-lock");
    document.body.classList.add("nqs-lock");

    return () => {
      document.documentElement.classList.remove("nqs-lock");
      document.body.classList.remove("nqs-lock");

      clearInterval(timerRef.current);

      stream?.getTracks()?.forEach((track) => track.stop());

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [stream, audioUrl]);

  function bestMimeType() {
    if (typeof MediaRecorder === "undefined") return "";

    const options = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
    ];

    return (
      options.find((type) => MediaRecorder.isTypeSupported?.(type)) || ""
    );
  }

  async function startRecording() {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador no permite acceder al micrófono.");
      }

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mimeType = bestMimeType();

      const newRecorder = mimeType
        ? new MediaRecorder(micStream, { mimeType })
        : new MediaRecorder(micStream);

      chunksRef.current = [];

      newRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      newRecorder.onstop = () => {
        const type =
          newRecorder.mimeType ||
          mimeType ||
          "audio/webm";

        const blob = new Blob(chunksRef.current, { type });

        const extension = type.includes("mp4")
          ? "m4a"
          : "webm";

        const file = new File(
          [blob],
          `recuerdo-${Date.now()}.${extension}`,
          { type }
        );

        const url = URL.createObjectURL(blob);

        setAudioFile(file);
        setAudioUrl(url);
        setStatus("finished");

        micStream
          .getTracks()
          .forEach((track) => track.stop());

        clearInterval(timerRef.current);
      };

      newRecorder.start(1000);

      setStream(micStream);
      setRecorder(newRecorder);
      setSeconds(0);
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setSeconds((previous) => previous + 1);
      }, 1000);
    } catch (err) {
      setError(
        err?.message ||
          "No se pudo abrir el micrófono."
      );
    }
  }

  function pauseRecording() {
    if (recorder?.state === "recording") {
      recorder.pause();
      setStatus("paused");
      clearInterval(timerRef.current);
    }
  }

  function resumeRecording() {
    if (recorder?.state === "paused") {
      recorder.resume();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setSeconds((previous) => previous + 1);
      }, 1000);
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function transcribe() {
    if (!audioFile) return;

    setTranscribing(true);
    setError("");

    try {
      const form = new FormData();

      form.append(
        "audio",
        audioFile,
        audioFile.name
      );

      const response = await fetch(
        "/api/transcribe",
        {
          method: "POST",
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "No se pudo transcribir el audio."
        );
      }

      const transcript = data?.text?.trim();

      if (!transcript) {
        throw new Error(
          "La transcripción llegó vacía."
        );
      }

      onUse(transcript, audioFile);
    } catch (err) {
      setError(
        err?.message ||
          "No se pudo transcribir el audio."
      );
    } finally {
      setTranscribing(false);
    }
  }

  function closeRecorder() {
    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }

    stream
      ?.getTracks()
      ?.forEach((track) => track.stop());

    onClose();
  }

  if (!portalReady) return null;

  return createPortal(
    <div className="nqsOverlay">
      <div className="nqsOverlayTop">
        <button
          className="nqsOverlayBack"
          onClick={closeRecorder}
        >
          ← Volver
        </button>

        <strong>
          NO SE QUIEN SOY
        </strong>

        <span />
      </div>

      <div className="nqsRecorderBody">
        <div className="nqsRecorderCard">
          <div
            className={
              status === "recording"
                ? "nqsMicCircle recording"
                : "nqsMicCircle"
            }
          >
            🎙
          </div>

          <h1 className="nqsRecorderTitle">
            Contar un recuerdo
          </h1>

          <p className="nqsRecorderSubtitle">
            Hablá como si se lo estuvieras contando a una persona. Después lo
            convertimos en texto y Claude lo transforma en material para el libro.
          </p>

          {status !== "idle" && (
            <div className="nqsTimer">
              {formatTimer(seconds)}
            </div>
          )}

          {status === "idle" && (
            <button
              className="nqsRecButton nqsRecPrimary"
              onClick={startRecording}
            >
              ● Iniciar grabación
            </button>
          )}

          {status === "recording" && (
            <div className="nqsRecorderActions">
              <button
                className="nqsRecButton nqsRecSecondary"
                onClick={pauseRecording}
              >
                Ⅱ Pausar
              </button>

              <button
                className="nqsRecButton nqsRecDanger"
                onClick={stopRecording}
              >
                ■ Finalizar
              </button>
            </div>
          )}

          {status === "paused" && (
            <div className="nqsRecorderActions">
              <button
                className="nqsRecButton nqsRecPrimary"
                onClick={resumeRecording}
              >
                ▶ Continuar
              </button>

              <button
                className="nqsRecButton nqsRecDanger"
                onClick={stopRecording}
              >
                ■ Finalizar
              </button>
            </div>
          )}

          {status === "finished" && (
            <>
              {audioUrl && (
                <audio
                  className="nqsAudioPreview"
                  controls
                  src={audioUrl}
                />
              )}

              <div
                className="nqsRecorderActions"
                style={{ marginTop: 24 }}
              >
                <button
                  className="nqsRecButton nqsRecSecondary"
                  onClick={startRecording}
                >
                  Grabar de nuevo
                </button>

                <button
                  className="nqsRecButton nqsRecPrimary"
                  disabled={transcribing}
                  onClick={transcribe}
                >
                  {transcribing
                    ? "Transcribiendo..."
                    : "Usar este audio"}
                </button>
              </div>
            </>
          )}

          {error && (
            <p
              className="nqsRecorderStatus"
              style={{ color: "#ef9e9e" }}
            >
              {error}
            </p>
          )}

          {status === "recording" && (
            <p className="nqsRecorderStatus">
              Micrófono activo · grabando
            </p>
          )}

          {status === "paused" && (
            <p className="nqsRecorderStatus">
              Grabación pausada
            </p>
          )}

          {transcribing && (
            <p className="nqsRecorderStatus">
              Convirtiendo la voz en texto…
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function HomePage({
  texts,
  updateText,
  storyCount,
  chapterCount,
  mediaCount,
  goHistory,
  goBook,
  openRecorder,
  mediaInput,
  handleMediaInput,
  uploadingFiles,
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
            updateText("homeTitle", value)
          }
        />

        <EditableText
          tag="p"
          className="mainSubtitle"
          value={texts.homeSubtitle}
          onChange={(value) =>
            updateText("homeSubtitle", value)
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
            onClick={openRecorder}
          >
            🎙 Contarlo con audio
          </button>
        </div>
      </section>

      <section className="workflow">
        <Workflow n="01" title="Contás un recuerdo">
          Escribís o hablás libremente. No hace falta ordenar nada.
        </Workflow>

        <div className="workflowArrow">
          →
        </div>

        <Workflow n="02" title="La IA lo analiza">
          Claude detecta personas, lugares, períodos y dónde debería entrar en el libro.
        </Workflow>

        <div className="workflowArrow">
          →
        </div>

        <Workflow n="03" title="Vos decidís">
          Revisás la propuesta y recién entonces la incorporás al manuscrito.
        </Workflow>
      </section>

      <section className="homeStats">
        <div className="stat">
          <small>RECUERDOS</small>
          <strong>{storyCount}</strong>
        </div>

        <div className="stat">
          <small>CAPÍTULOS</small>
          <strong>{chapterCount}</strong>
        </div>

        <div className="stat">
          <small>ARCHIVOS</small>
          <strong>{mediaCount}</strong>
        </div>

        <button
          className="openBook"
          onClick={goBook}
        >
          <span>EL LIBRO</span>
          <strong>Ver cómo va quedando →</strong>
        </button>
      </section>

      <section className="quickArchive">
        <button
          className="uploadQuick"
          disabled={uploadingFiles}
          onClick={() =>
            mediaInput.current?.click()
          }
        >
          {uploadingFiles
            ? "Subiendo archivos..."
            : "+ Agregar fotos, documentos o videos"}
        </button>

        <input
          ref={mediaInput}
          hidden
          multiple
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={(event) =>
            handleMediaInput(
              event,
              "archivo"
            )
          }
        />
      </section>
    </>
  );
}

function Workflow({ n, title, children }) {
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
  openRecorder,
  editorLoading,
  editorProposal,
  editorError,
  updateEditorText,
  acceptEditorProposal,
  discardEditorProposal,
  retryEditor,
  draftSeed,
}) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [immersive, setImmersive] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);

    try {
      const savedTitle =
        localStorage.getItem(
          "nqs_story_draft_title"
        );

      const savedText =
        localStorage.getItem(
          "nqs_story_draft_text"
        );

      if (savedTitle) setTitle(savedTitle);
      if (savedText) setText(savedText);
    } catch {}
  }, []);

  useEffect(() => {
    if (!draftSeed?.id) return;

    setText(draftSeed.text || "");
    setImmersive(true);
  }, [draftSeed?.id]);

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

  async function save() {
    const ok = await saveStory({
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
      {portalReady &&
        immersive &&
        createPortal(
          <ImmersiveWriter
            title={title}
            setTitle={setTitle}
            text={text}
            setText={setText}
            close={() =>
              setImmersive(false)
            }
            save={save}
            loading={loading}
            editorLoading={editorLoading}
            openRecorder={openRecorder}
          />,
          document.body
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
              onClick={openRecorder}
            >
              🎙 Grabar audio
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
            onFocus={() =>
              setImmersive(true)
            }
            placeholder="Escribí el recuerdo como te venga a la memoria..."
          />

          <div className="writerBottom">
            <span>
              Tocá el cuadro para escribir en pantalla completa.
            </span>

            <button
              className="primaryButton"
              onClick={() =>
                setImmersive(true)
              }
            >
              Escribir
            </button>
          </div>
        </div>

        <aside className="historyHelp">
          <span>
            PODRÍAS CONTAR
          </span>

          <button>
            ¿Cuál es tu primer recuerdo?
          </button>

          <button>
            ¿Cómo era la casa donde creciste?
          </button>

          <button>
            ¿Quién marcó tu infancia?
          </button>

          <button>
            ¿Cuál fue una decisión que cambió tu vida?
          </button>
        </aside>
      </div>

      {text.trim() && (
        <div className="nqsDraftResume">
          <div className="nqsDraftResumeInfo">
            <span>
              BORRADOR EN CURSO
            </span>

            <strong>
              {title ||
                "Recuerdo sin título"}
            </strong>

            <small>
              {countWords(text)} palabras · guardado automáticamente
            </small>
          </div>

          <button
            className="secondaryButton"
            onClick={() =>
              setImmersive(true)
            }
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

function ImmersiveWriter({
  title,
  setTitle,
  text,
  setText,
  close,
  save,
  loading,
  editorLoading,
  openRecorder,
}) {
  const textRef =
    useRef(null);

  useEffect(() => {
    document.documentElement.classList.add(
      "nqs-lock"
    );

    document.body.classList.add(
      "nqs-lock"
    );

    const timer =
      setTimeout(() => {
        textRef.current?.focus();
      }, 150);

    return () => {
      clearTimeout(timer);

      document.documentElement.classList.remove(
        "nqs-lock"
      );

      document.body.classList.remove(
        "nqs-lock"
      );
    };
  }, []);

  return (
    <div className="nqsImmersiveOverlay">
      <header className="nqsImmersiveTop">
        <button
          onClick={close}
        >
          ← Volver
        </button>

        <div className="nqsImmersiveBrand">
          <strong>
            NO SE QUIEN SOY
          </strong>

          <small>
            ESCRITURA
          </small>
        </div>

        <div className="nqsImmersiveSaved">
          Borrador guardado
        </div>
      </header>

      <div className="nqsImmersiveScroll">
        <main className="nqsImmersivePage">
          <div className="nqsImmersiveEyebrow">
            NUEVO RECUERDO
          </div>

          <input
            className="nqsImmersiveTitle"
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
            placeholder="Título del recuerdo"
          />

          <textarea
            ref={textRef}
            className="nqsImmersiveText"
            value={text}
            onChange={(event) =>
              setText(
                event.target.value
              )
            }
            placeholder="Escribí el recuerdo como te venga a la memoria..."
          />

          <div className="nqsImmersiveBottom">
            <div>
              <strong
                style={{
                  color: "#ddc99e",
                }}
              >
                {countWords(text)} palabras
              </strong>
            </div>

            <div className="nqsRecorderActions">
              <button
                className="nqsRecButton nqsRecSecondary"
                onClick={openRecorder}
              >
                🎙 Audio
              </button>

              <button
                className="nqsRecButton nqsRecPrimary"
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
        </main>
      </div>
    </div>
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

  if (loading) {
    return (
      <section style={panel}>
        <h2>
          IA Editora analizando…
        </h2>
      </section>
    );
  }

  if (error) {
    return (
      <section style={panel}>
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
      <div className="eyebrow">
        IA EDITORA · PROPUESTA
      </div>

      <h2>
        Así podría entrar este recuerdo en el libro
      </h2>

      {proposal.summary && (
        <p>
          {proposal.summary}
        </p>
      )}

      <h3>
        {proposal.chapter_title ||
          "Nuevo capítulo"}
      </h3>

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
          boxSizing: "border-box",
          marginTop: 10,
          padding: 20,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
          background:
            "rgba(0,0,0,.25)",
          color:
            "var(--text)",
          fontSize: 18,
          lineHeight: 1.7,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 20,
          flexWrap: "wrap",
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
          Descartar
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
          <h2>
            El libro todavía está esperando su primer capítulo.
          </h2>
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
                updateChapter={
                  updateChapter
                }
                deleteChapter={
                  deleteChapter
                }
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

  useEffect(() => {
    setTitle(
      chapter.title || ""
    );

    setContent(
      chapter.content || ""
    );
  }, [chapter]);

  async function runAI(action) {
    if (!content.trim()) return;

    setAiLoading(true);
    setAiError("");
    setAiProposal(null);

    try {
      const response = await fetch(
        "/api/editor",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            mode: "chapter",
            action,
            chapter: {
              ...chapter,
              title,
              content,
            },
            memories: stories,
            chapters,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Claude no pudo editar el capítulo."
        );
      }

      setAiProposal(data.result);
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function acceptAI() {
    const newText =
      aiProposal
        ?.proposed_text
        ?.trim();

    if (!newText) return;

    setContent(newText);

    await updateChapter(
      chapter.id,
      "content",
      newText
    );

    setAiProposal(null);
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
      />

      <div
        style={{
          marginTop: 18,
          padding: 18,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
        }}
      >
        <div className="eyebrow">
          IA EDITORA · CLAUDE
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {[
            [
              "improve",
              "Mejorar redacción",
            ],
            [
              "literary",
              "Más literario",
            ],
            [
              "emotional",
              "Más emocional",
            ],
            [
              "cinematic",
              "Más cinematográfico",
            ],
            [
              "expand",
              "Ampliar",
            ],
            [
              "shorten",
              "Resumir",
            ],
            [
              "coherence",
              "Revisar coherencia",
            ],
          ].map(
            ([
              action,
              label,
            ]) => (
              <button
                key={action}
                className="secondaryButton"
                disabled={aiLoading}
                onClick={() =>
                  runAI(action)
                }
              >
                {label}
              </button>
            )
          )}
        </div>

        {aiLoading && (
          <p>
            Claude está revisando…
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
              marginTop: 18,
            }}
          >
            <textarea
              className="chapterContent"
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

            <button
              className="primaryButton"
              onClick={acceptAI}
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
        )}
      </div>

      <div className="chapterFooter">
        <span>
          Los cambios se guardan al salir del texto.
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

function ArchivePage({
  stories,
  chapters,
  mediaFiles,
  mediaLoading,
  mediaInput,
  handleMediaInput,
  uploadingFiles,
  deleteMedia,
  updateMediaDate,
  refreshMedia,
}) {
  const [sortOrder, setSortOrder] = useState("asc");

  const photosAndVideos = mediaFiles.filter(
    (item) =>
      item.mime?.startsWith("image/") ||
      item.mime?.startsWith("video/")
  );

  const audios = mediaFiles.filter(
    (item) =>
      item.mime?.startsWith("audio/")
  );

  const sortedMedia = [...mediaFiles].sort((a, b) => {
    const aDate = a.photo_date
      ? new Date(`${a.photo_date}T00:00:00`).getTime()
      : null;

    const bDate = b.photo_date
      ? new Date(`${b.photo_date}T00:00:00`).getTime()
      : null;

    if (aDate === null && bDate === null) {
      const ac = new Date(a.created_at || 0).getTime();
      const bc = new Date(b.created_at || 0).getTime();
      return bc - ac;
    }

    if (aDate === null) return 1;
    if (bDate === null) return -1;

    return sortOrder === "asc"
      ? aDate - bDate
      : bDate - aDate;
  });

  const withoutDate = photosAndVideos.filter(
    (item) => !item.photo_date
  ).length;

  return (
    <SimplePage
      eyebrow="ARCHIVO GENERAL"
      title="Archivo"
      description="Todo el material original de la historia en un mismo lugar. Asigná una fecha a cada foto para construir la cronología visual."
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
          number={audios.length}
        />

        <ArchiveCard
          title="Fotos y videos"
          number={photosAndVideos.length}
        />
      </div>

      <div className="mediaToolbar">
        <div>
          <h2>
            Fotos, videos y archivos
          </h2>

          <div className="mediaChronologyHint">
            {withoutDate > 0
              ? `${withoutDate} archivo${
                  withoutDate === 1 ? "" : "s"
                } visual${
                  withoutDate === 1 ? "" : "es"
                } todavía sin fecha.`
              : "Toda la galería visual tiene fecha asignada."}
          </div>
        </div>

        <div className="mediaToolbarActions">
          <select
            className="mediaSortSelect"
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value)
            }
          >
            <option value="asc">
              Más antiguas primero
            </option>

            <option value="desc">
              Más recientes primero
            </option>
          </select>

          <button
            className="secondaryButton"
            disabled={mediaLoading}
            onClick={refreshMedia}
          >
            {mediaLoading
              ? "Actualizando..."
              : "Actualizar"}
          </button>

          <button
            className="primaryButton"
            disabled={uploadingFiles}
            onClick={() =>
              mediaInput.current?.click()
            }
          >
            {uploadingFiles
              ? "Subiendo..."
              : "+ Subir archivos"}
          </button>
        </div>
      </div>

      <input
        ref={mediaInput}
        hidden
        multiple
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        onChange={(event) =>
          handleMediaInput(
            event,
            "archivo"
          )
        }
      />

      {mediaLoading ? (
        <div className="mediaEmpty">
          Cargando archivo…
        </div>
      ) : mediaFiles.length === 0 ? (
        <div className="mediaEmpty">
          Todavía no hay archivos visibles. Si acabás de subirlos, tocá “Actualizar”.
        </div>
      ) : (
        <div className="mediaGrid">
          {sortedMedia.map((item) => (
            <MediaCard
              key={item.path}
              item={item}
              onDelete={() =>
                deleteMedia(item)
              }
              onDateChange={(value) =>
                updateMediaDate(
                  item,
                  value
                )
              }
            />
          ))}
        </div>
      )}
    </SimplePage>
  );
}

function MediaCard({
  item,
  onDelete,
  onDateChange,
}) {
  const isImage =
    item.mime?.startsWith("image/");

  const isVideo =
    item.mime?.startsWith("video/");

  const isAudio =
    item.mime?.startsWith("audio/");

  const isVisual =
    isImage || isVideo;

  return (
    <article className="mediaCard">
      {isImage ? (
        <img
          className="mediaThumb"
          src={item.url}
          alt={item.name}
        />
      ) : isVideo ? (
        <video
          className="mediaVideo"
          controls
          preload="metadata"
          src={item.url}
        />
      ) : isAudio ? (
        <div className="mediaFilePlaceholder">
          <div>
            <div
              style={{
                fontSize: 34,
                marginBottom: 12,
              }}
            >
              🎙
            </div>

            <audio
              controls
              src={item.url}
              style={{
                width: "100%",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mediaFilePlaceholder">
          <div>
            <div
              style={{
                fontSize: 38,
                marginBottom: 10,
              }}
            >
              ▣
            </div>

            Archivo
          </div>
        </div>
      )}

      <div className="mediaMeta">
        <div
          className="mediaName"
          title={item.name}
        >
          {cleanDisplayName(item.name)}
        </div>

        <div className="mediaType">
          {item.folder} · {friendlyMime(item.mime)}
        </div>

        {isVisual && (
          <div className="mediaDateEditor">
            <label>
              Fecha de la foto
            </label>

            <input
              type="date"
              value={item.photo_date || ""}
              onChange={(event) =>
                onDateChange(
                  event.target.value
                )
              }
            />

            <small>
              {item.photo_date
                ? formatPhotoDate(item.photo_date)
                : "Sin fecha · queda al final de la cronología"}
            </small>
          </div>
        )}
      </div>

      <div className="mediaActions">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir
        </a>

        <button
          onClick={onDelete}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}

function PodcastPage({
  texts,
  updateText,
  podcastInput,
  handleMediaInput,
  uploadingFiles,
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
          <h2>
            Crear desde la historia
          </h2>

          <p>
            Más adelante podrás elegir un recuerdo o capítulo y convertirlo en un guion.
          </p>
        </div>

        <div className="podcastCard">
          <h2>
            Subir un podcast
          </h2>

          <button
            className="secondaryButton"
            disabled={uploadingFiles}
            onClick={() =>
              podcastInput.current?.click()
            }
          >
            {uploadingFiles
              ? "Subiendo..."
              : "Subir audio"}
          </button>

          <input
            ref={podcastInput}
            hidden
            type="file"
            accept="audio/*"
            onChange={(event) =>
              handleMediaInput(
                event,
                "podcast"
              )
            }
          />
        </div>
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
            Personalizá completamente la apariencia de NO SE QUIEN SOY. Todos los cambios se guardan automáticamente.
          </p>
        </div>

        <button
          className="secondaryButton"
          onClick={restorePremium}
        >
          Restaurar diseño PREMIUM
        </button>
      </div>

      <div className="designGrid">
        <DesignGroup title="Fondo general">
          <ColorField
            label="Color de fondo"
            value={design.background}
            onChange={(value) =>
              updateDesign(
                "background",
                value
              )
            }
          />

          <div className="field">
            <label>
              Imagen de fondo
            </label>

            <button
              className="secondaryButton"
              onClick={() =>
                backgroundInput.current?.click()
              }
            >
              Subir imagen
            </button>

            {design.backgroundImage && (
              <button
                className="secondaryButton"
                onClick={() =>
                  updateDesign(
                    "backgroundImage",
                    ""
                  )
                }
              >
                Quitar imagen
              </button>
            )}

            <input
              ref={backgroundInput}
              hidden
              type="file"
              accept="image/*"
              onChange={uploadBackground}
            />
          </div>

          <RangeField
            label="Visibilidad de la imagen"
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

          <RangeField
            label="Desenfoque del fondo"
            value={design.backgroundBlur}
            min={0}
            max={20}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "backgroundBlur",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Paleta de colores">
          <ColorField
            label="Color principal"
            value={design.accent}
            onChange={(value) =>
              updateDesign(
                "accent",
                value
              )
            }
          />

          <ColorField
            label="Texto principal"
            value={design.text}
            onChange={(value) =>
              updateDesign(
                "text",
                value
              )
            }
          />

          <ColorField
            label="Texto secundario"
            value={design.secondary}
            onChange={(value) =>
              updateDesign(
                "secondary",
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
            label="Menú lateral"
            value={design.sidebar}
            onChange={(value) =>
              updateDesign(
                "sidebar",
                value
              )
            }
          />

          <ColorField
            label="Bordes"
            value={design.border}
            onChange={(value) =>
              updateDesign(
                "border",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Tarjetas y paneles">
          <RangeField
            label="Transparencia"
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
            label="Redondeo de tarjetas"
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
            label="Redondeo de botones"
            value={design.buttonRadius}
            min={0}
            max={30}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "buttonRadius",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Estructura">
          <RangeField
            label="Ancho del menú lateral"
            value={design.sidebarWidth}
            min={200}
            max={360}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "sidebarWidth",
                value
              )
            }
          />

          <RangeField
            label="Ancho máximo del contenido"
            value={design.contentWidth}
            min={800}
            max={1600}
            suffix=" px"
            onChange={(value) =>
              updateDesign(
                "contentWidth",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Tipografía">
          <SelectField
            label="Fuente de títulos"
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
            label="Fuente general"
            value={design.bodyFont}
            options={[
              "Arial",
              "Georgia",
              "Helvetica",
            ]}
            onChange={(value) =>
              updateDesign(
                "bodyFont",
                value
              )
            }
          />
        </DesignGroup>

        <DesignGroup title="Vista previa">
          <div
            className="designPreview"
            style={{
              background:
                hexToRgba(
                  design.card,
                  design.cardOpacity /
                    100
                ),
              borderRadius:
                `${design.radius}px`,
              borderColor:
                design.border,
            }}
          >
            <div
              style={{
                color:
                  design.accent,
                fontSize: 10,
                letterSpacing:
                  ".2em",
                marginBottom: 12,
              }}
            >
              NO SE QUIEN SOY
            </div>

            <div
              style={{
                color:
                  design.text,
                fontFamily:
                  design.titleFont ===
                  "Georgia"
                    ? "Georgia, serif"
                    : `${design.titleFont}, sans-serif`,
                fontSize: 28,
                marginBottom: 12,
              }}
            >
              Una historia que merece ser contada
            </div>

            <p
              style={{
                color:
                  design.secondary,
                lineHeight: 1.6,
              }}
            >
              Esta vista te permite ver en tiempo real cómo quedan los colores,
              la transparencia, los bordes, las tipografías y el estilo general.
            </p>

            <button
              style={{
                marginTop: 12,
                minHeight: 44,
                padding:
                  "0 18px",
                border:
                  `1px solid ${design.accent}`,
                borderRadius:
                  `${design.buttonRadius}px`,
                background:
                  design.accent,
                color: "#111",
                fontWeight: 700,
              }}
            >
              Botón de ejemplo
            </button>
          </div>
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
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref}
      className={`${className} editableText`}
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
      <span>{title}</span>
      <strong>{number}</strong>
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
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
        />

        <span>{value}</span>
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}) {
  return (
    <div className="field">
      <div className="fieldTop">
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
      <label>{label}</label>

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

function guessMimeFromName(
  name = ""
) {
  const ext =
    name
      .split(".")
      .pop()
      ?.toLowerCase();

  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    mov: "video/quicktime",
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    webm: "video/webm",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  return (
    map[ext] ||
    "application/octet-stream"
  );
}

function friendlyMime(
  mime = ""
) {
  if (
    mime.startsWith(
      "image/"
    )
  ) {
    return "Foto";
  }

  if (
    mime.startsWith(
      "video/"
    )
  ) {
    return "Video";
  }

  if (
    mime.startsWith(
      "audio/"
    )
  ) {
    return "Audio";
  }

  if (
    mime ===
    "application/pdf"
  ) {
    return "PDF";
  }

  return "Archivo";
}

function cleanDisplayName(
  name = ""
) {
  return name.replace(
    /^\d+-\d+-[a-z0-9]+-/i,
    ""
  );
}

function formatPhotoDate(value) {
  if (!value) return "";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function countWords(value) {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) return 0;

  return text
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function formatTimer(
  totalSeconds
) {
  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const seconds =
    totalSeconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
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
    hex.replace(
      "#",
      ""
    );

  const bigint =
    parseInt(
      value,
      16
    );

  const r =
    (bigint >> 16) &
    255;

  const g =
    (bigint >> 8) &
    255;

  const b =
    bigint &
    255;

  return `rgba(${r},${g},${b},${opacity})`;
}
