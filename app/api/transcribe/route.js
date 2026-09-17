export const runtime = "nodejs";

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Falta OPENAI_API_KEY en Vercel." },
        { status: 500 }
      );
    }

    const incoming = await req.formData();
    const audio = incoming.get("audio");

    if (!audio || typeof audio === "string") {
      return Response.json(
        { error: "No se recibió ningún audio." },
        { status: 400 }
      );
    }

    const form = new FormData();

    form.append(
      "file",
      audio,
      audio.name || "recuerdo.m4a"
    );

    form.append("model", "gpt-4o-transcribe");
    form.append("language", "es");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI transcription error:", data);

      return Response.json(
        {
          error:
            data?.error?.message ||
            "OpenAI no pudo transcribir el audio.",
        },
        { status: response.status }
      );
    }

    return Response.json({
      text: data.text || "",
    });
  } catch (error) {
    console.error("TRANSCRIBE ERROR:", error);

    return Response.json(
      {
        error:
          error?.message ||
          "Error interno al transcribir el audio.",
      },
      { status: 500 }
    );
  }
}
