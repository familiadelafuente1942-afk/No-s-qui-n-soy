export async function POST(req) {
  try {
    const apiKey =
      process.env.ANTHROPIC_API_KEY;

    const model =
      process.env.ANTHROPIC_MODEL ||
      "claude-sonnet-5";

    if (!apiKey) {
      return Response.json(
        {
          error:
            "Falta ANTHROPIC_API_KEY en Vercel.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      await req.json();

    const {
      mode = "memory",

      memory = "",

      memories = [],

      chapters = [],

      chapter = null,

      action = "",

      instruction = "",
    } = body;

    /*
    ==========================================
    MODO 1
    ANALIZAR UN RECUERDO NUEVO
    ==========================================
    */

    if (mode === "memory") {
      if (!memory?.trim()) {
        return Response.json(
          {
            error:
              "No hay ningún recuerdo para analizar.",
          },
          {
            status: 400,
          }
        );
      }

      const previousMemories =
        memories
          .slice(0, 150)
          .map(
            (
              item,
              index
            ) => `
RECUERDO ${index + 1}

ID:
${item.id || ""}

TÍTULO:
${item.title || "Sin título"}

TEXTO ORIGINAL:
${item.original_text || ""}
`
          )
          .join("\n\n");

      const currentBook =
        chapters
          .map(
            (
              item,
              index
            ) => `
CAPÍTULO ${index + 1}

ID:
${item.id || ""}

TÍTULO:
${item.title || ""}

CONTENIDO:
${item.content || ""}
`
          )
          .join("\n\n");

      const prompt = `
Sos la IA EDITORA del proyecto biográfico:

"NO SE QUIEN SOY"

Tu trabajo no es simplemente resumir.

Tu función es actuar como una editora profesional de un libro biográfico.

==============================
REGLA ABSOLUTA
==============================

NO INVENTAR.

Nunca inventes:

- hechos
- fechas
- lugares
- edades
- nombres
- parentescos
- acontecimientos
- diálogos
- pensamientos
- emociones
- motivaciones
- descripciones físicas
- circunstancias

Si falta información importante, no la completes.

Marcá que falta información.

Podés mejorar:

- redacción
- ritmo
- estructura
- claridad
- fuerza narrativa
- elegancia literaria

Pero jamás modificar los hechos.

==============================
NUEVO RECUERDO
==============================

${memory}

==============================
RECUERDOS ANTERIORES
==============================

${
  previousMemories ||
  "Todavía no existen recuerdos anteriores."
}

==============================
LIBRO ACTUAL
==============================

${
  currentBook ||
  "El libro todavía no tiene capítulos."
}

==============================
ANÁLISIS
==============================

Analizá profundamente el nuevo recuerdo.

Determiná:

1. Qué ocurrió realmente.

2. Qué personas aparecen.

3. Qué lugares aparecen.

4. Qué fechas, edades o períodos aparecen.

5. Cuáles son los temas centrales.

6. Si este recuerdo amplía otro recuerdo anterior.

7. Si existen contradicciones con información anterior.

8. Si existe información incompleta que convendría preguntarle al protagonista.

9. En qué capítulo del libro debería incorporarse.

10. Si corresponde crear un capítulo nuevo.

11. Qué importancia narrativa tiene dentro de la historia general.

12. Cómo debería escribirse para que tenga calidad de libro.

==============================
ESTILO
==============================

La escritura propuesta debe ser:

- biográfica
- elegante
- humana
- natural
- cinematográfica cuando el material lo permita
- emocional solamente cuando los hechos lo justifiquen
- sin exageraciones
- sin frases artificiales
- sin convertir el recuerdo en ficción

No transformes automáticamente frases indirectas en diálogos textuales.

No inventes escenas.

No agregues detalles sensoriales que no existan en las fuentes.

==============================
CAPÍTULO
==============================

Si el recuerdo corresponde claramente a un capítulo existente:

recommended_action:
"existing_chapter"

chapter_id:
usar exactamente el ID real del capítulo.

Si debería crear un capítulo nuevo:

recommended_action:
"new_chapter"

chapter_id:
null

Elegí también un título editorial apropiado.

==============================
RESPUESTA
==============================

Respondé EXCLUSIVAMENTE JSON válido.

Sin markdown.

Sin texto antes.

Sin texto después.

Usá exactamente esta estructura:

{
  "summary": "",
  "people": [],
  "places": [],
  "dates": [],
  "themes": [],
  "contradictions": [],
  "related_material": [],
  "missing_information": [],
  "questions_for_author": [],
  "narrative_importance": "",
  "recommended_action": "existing_chapter",
  "chapter_id": null,
  "chapter_title": "",
  "reason": "",
  "proposed_text": ""
}
`;

      const result =
        await callClaude({
          apiKey,
          model,
          prompt,
        });

      return Response.json({
        success: true,
        mode: "memory",
        result,
      });
    }

    /*
    ==========================================
    MODO 2
    EDITAR UN CAPÍTULO
    ==========================================
    */

    if (mode === "chapter") {
      if (
        !chapter ||
        !chapter.content?.trim()
      ) {
        return Response.json(
          {
            error:
              "El capítulo no tiene contenido para editar.",
          },
          {
            status: 400,
          }
        );
      }

      const sourceMemories =
        memories
          .slice(0, 200)
          .map(
            (
              item,
              index
            ) => `
RECUERDO ${index + 1}

TÍTULO:
${item.title || "Sin título"}

TEXTO ORIGINAL:
${item.original_text || ""}
`
          )
          .join("\n\n");

      const bookContext =
        chapters
          .filter(
            (item) =>
              String(item.id) !==
              String(chapter.id)
          )
          .map(
            (
              item,
              index
            ) => `
OTRO CAPÍTULO ${index + 1}

TÍTULO:
${item.title || ""}

CONTENIDO:
${item.content || ""}
`
          )
          .join("\n\n");

      const actionInstructions =
        getActionInstructions(
          action,
          instruction
        );

      const prompt = `
Sos la IA EDITORA profesional del libro biográfico:

"NO SE QUIEN SOY"

Estás trabajando sobre un capítulo ya existente.

==============================
PRINCIPIO FUNDAMENTAL
==============================

EL TEXTO ORIGINAL DEL AUTOR ES LA FUENTE.

No podés inventar información.

No agregues:

- fechas inexistentes
- nombres inexistentes
- lugares inexistentes
- hechos inexistentes
- diálogos inventados
- emociones no documentadas
- pensamientos no documentados
- descripciones físicas inventadas
- explicaciones causales que las fuentes no demuestren

Podés reorganizar la forma.

No podés alterar el fondo factual.

==============================
ACCIÓN SOLICITADA
==============================

${actionInstructions}

==============================
CAPÍTULO A EDITAR
==============================

TÍTULO:

${chapter.title || ""}

CONTENIDO ACTUAL:

${chapter.content || ""}

==============================
RECUERDOS ORIGINALES
==============================

${
  sourceMemories ||
  "No hay recuerdos adicionales cargados."
}

==============================
RESTO DEL LIBRO
==============================

${
  bookContext ||
  "No existen otros capítulos."
}

==============================
TU TRABAJO COMO EDITORA
==============================

Antes de reescribir:

1. Analizá si el capítulo es coherente con las fuentes.

2. Detectá contradicciones.

3. Detectá repeticiones.

4. Detectá saltos temporales confusos.

5. Detectá información importante que falta.

6. Conservá las partes fuertes del texto.

7. Mejorá solamente de acuerdo con la acción solicitada.

8. Conservá la voz humana y personal.

9. Evitá lenguaje genérico de inteligencia artificial.

10. No llenes espacios vacíos inventando.

==============================
RESULTADO
==============================

La versión propuesta debe poder reemplazar al capítulo actual completo.

Respondé EXCLUSIVAMENTE JSON válido.

Sin markdown.

Sin explicación fuera del JSON.

Formato exacto:

{
  "analysis": "",
  "changes_made": [],
  "contradictions": [],
  "missing_information": [],
  "questions_for_author": [],
  "suggested_title": "",
  "proposed_text": ""
}
`;

      const result =
        await callClaude({
          apiKey,
          model,
          prompt,
        });

      return Response.json({
        success: true,
        mode: "chapter",
        action,
        result,
      });
    }

    return Response.json(
      {
        error:
          "Modo de IA Editora no reconocido.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "IA EDITORA:",
      error
    );

    return Response.json(
      {
        error:
          error?.message ||
          "Error interno de la IA Editora.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
==========================================
INSTRUCCIONES DE EDICIÓN
==========================================
*/

function getActionInstructions(
  action,
  instruction
) {
  switch (action) {
    case "improve":
      return `
MEJORAR REDACCIÓN.

Corregí y mejorá el capítulo sin cambiar su personalidad.

Mejorá:

- claridad
- fluidez
- puntuación
- ritmo
- repeticiones
- construcción de frases

No lo vuelvas artificial ni excesivamente literario.
`;

    case "literary":
      return `
HACER MÁS LITERARIO.

Mejorá la calidad narrativa y literaria.

Trabajá especialmente:

- ritmo
- elección de palabras
- transiciones
- construcción narrativa
- fuerza de los párrafos

Debe seguir pareciendo una historia real.

No inventes escenas ni detalles.
`;

    case "emotional":
      return `
DAR MAYOR PROFUNDIDAD EMOCIONAL.

Resaltá la dimensión humana que YA existe en los hechos.

No inventes emociones.

No digas que una persona sintió algo si las fuentes no permiten saberlo.

La emoción debe surgir de lo ocurrido.
`;

    case "cinematic":
      return `
DAR MAYOR FUERZA CINEMATOGRÁFICA.

Mejorá:

- ritmo de escenas
- tensión narrativa
- orden de acontecimientos
- entradas y cierres
- visualidad basada exclusivamente en los detalles reales disponibles

No inventes escenarios.

No inventes clima.

No inventes diálogos.

No inventes acciones.
`;

    case "expand":
      return `
AMPLIAR EL CAPÍTULO.

Desarrollá mejor aquello que YA está documentado.

No agregues información nueva.

Cuando falte información necesaria para ampliar bien una parte, mantenela prudente y agregá esa carencia a "missing_information".
`;

    case "shorten":
      return `
RESUMIR Y HACER MÁS POTENTE.

Reducí repeticiones y partes débiles.

Conservá:

- hechos esenciales
- momentos importantes
- personalidad
- información necesaria para comprender la historia

El resultado debe ser más breve pero no superficial.
`;

    case "coherence":
      return `
REVISAR COHERENCIA GLOBAL.

Compará este capítulo con todos los recuerdos originales y con el resto del libro.

Detectá especialmente:

- contradicciones
- fechas incompatibles
- edades incompatibles
- personas confundidas
- lugares inconsistentes
- repeticiones
- hechos duplicados
- saltos temporales

Después proponé una versión más coherente sin inventar ninguna solución factual.
`;

    case "custom":
      return `
INSTRUCCIÓN PERSONAL DEL AUTOR:

${
  instruction?.trim() ||
  "Mejorar el capítulo manteniendo absolutamente todos los hechos."
}

Cumplí esta instrucción siempre respetando las reglas de no invención.
`;

    default:
      return `
REVISIÓN EDITORIAL GENERAL.

Mejorá el capítulo manteniendo todos los hechos y la voz original.
`;
  }
}

/*
==========================================
CONEXIÓN CLAUDE
==========================================
*/

async function callClaude({
  apiKey,
  model,
  prompt,
}) {
  const response =
    await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",

          "x-api-key":
            apiKey,

          "anthropic-version":
            "2023-06-01",
        },

        body: JSON.stringify({
          model,

          max_tokens: 7000,

          temperature: 0.4,

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Claude API:",
      data
    );

    throw new Error(
      data?.error?.message ||
        "Claude no pudo procesar la solicitud."
    );
  }

  const rawText =
    data?.content
      ?.filter(
        (item) =>
          item.type ===
          "text"
      )
      ?.map(
        (item) =>
          item.text
      )
      ?.join("\n")
      ?.trim() || "";

  if (!rawText) {
    throw new Error(
      "Claude no devolvió contenido."
    );
  }

  try {
    const cleaned =
      rawText
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/,
          ""
        )
        .replace(
          /```$/,
          ""
        )
        .trim();

    return JSON.parse(
      cleaned
    );
  } catch {
    console.error(
      "Respuesta Claude no JSON:",
      rawText
    );

    throw new Error(
      "Claude respondió, pero la respuesta no pudo interpretarse."
    );
  }
}
