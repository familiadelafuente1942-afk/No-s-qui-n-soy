# NO SE QUIEN SOY — V3 lista para Vercel

## Qué funciona
- Escritura y edición de recuerdos.
- Grabación directa desde micrófono.
- Carga múltiple de audios, fotos, videos y documentos.
- Los archivos reales se guardan en IndexedDB del dispositivo (no sólo su nombre).
- Reproducción de audio/video y vista previa de fotos.
- Borrar elementos.
- Exportar/importar respaldo JSON de textos y metadatos.
- IA documental por /api/ask (no inventar).
- Transcripción por /api/transcribe.
- Instalable como PWA desde Safari/Chrome cuando está publicada.

## Publicar en Vercel
1. Subir esta carpeta a GitHub.
2. Importarla en Vercel.
3. En Project Settings > Environment Variables crear OPENAI_API_KEY.
4. Deploy.

## Importante
Esta versión guarda los archivos multimedia en el navegador del dispositivo. Para sincronizar entre varios dispositivos/usuarios, el siguiente paso es agregar Supabase Storage + Auth.
