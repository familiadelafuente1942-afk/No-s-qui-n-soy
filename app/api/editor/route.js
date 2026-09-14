export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

    if (!apiKey) {
      return Response.json(
        { error: "Falta ANTHROPIC_API_KEY en Vercel." },
        { status: 500 }
      );
    }

    const {
      memory,
      memories = [],
      chapters = []
    } = await req.json();

    if (!memory?.trim()) {
      return Response.json(
        { error: "No hay ningún recuerdo para analizar." },
        { status: 400 }
      );
    }

    const previousMemories = memories
      .slice(0, 100)
      .map(
        (item, index) => `
RECUERDO ${index + 1}
Título: ${item.title || "Sin título"}
Texto: ${item.original_text || ""}
`
      )
      .join("\n");

    const currentBook = chapters
      .map(
        (chapter, index) => `
CAPÍTULO ${index + 1}
ID: ${chapter.id || ""}
Título: ${chapter.title || ""}
Contenido:
${chapter.content || ""}
`
      )
      .join("\n");

    const prompt = `
Sos la IA EDITORA del libro biográfico "NO SE QUIEN SOY".

Tu misión es transformar recuerdos reales en un libro de alta calidad narrativa.

REGLA FUNDAMENTAL:
NO INVENTES NADA.

No inventes:
- hechos
- fechas
- lugares
- nombres
- diálogos
- relaciones
- acontecimientos

Podés mejorar la narración, el ritmo y la estructura,
pero siempre respetando exactamente los hechos disponibles.

NUEVO RECUERDO:

${memory}

RECUERDOS ANTERIORES:

${previousMemories || "Todavía no existen recuerdos anteriores."}

LIBRO ACTUAL:

${currentBook || "El libro todavía no tiene capítulos."}

Analizá el nuevo recuerdo.

Necesito que determines:

1. Qué ocurrió.
2. Qué personas aparecen.
3. Qué lugares aparecen.
4. Fechas, edades o períodos.
5. Temas importantes.
6. Relación con recuerdos anteriores.
7. Posibles contradicciones.
8. En qué capítulo corresponde.
9. Si conviene crear un capítulo nuevo.
10. Cómo quedaría escrito para el libro.

La propuesta literaria debe conservar los hechos
pero tener calidad de libro biográfico profesional.

Respondé ÚNICAMENTE JSON válido:

{
  "summary": "",
  "people": [],
  "places": [],
  "dates": [],
  "themes": [],
  "contradictions": [],
  "related_material": [],
  "recommended_action": "existing_chapter",
  "chapter_id": null,
  "chapter_title": "",
  "reason": "",
  "proposed_text": ""
}
`;

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 5000,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error:
            data?.error?.message ||
            "Claude no pudo analizar el recuerdo."
        },
        { status: response.status }
      );
    }

    const rawText =
      data?.content
        ?.filter((item) => item.type === "text")
        ?.map((item) => item.text)
        ?.join("\n")
        ?.trim() || "";

    let result;

    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();

      result = JSON.parse(cleaned);
    } catch {
      return Response.json(
        {
          error: "Claude respondió pero no pude interpretar la respuesta.",
          raw: rawText
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      result
    });
  } catch (error) {
    return Response.json(
      {
        error: error?.message || "Error interno de la IA Editora."
      },
      { status: 500 }
    );
  }
}
