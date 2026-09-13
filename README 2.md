# NO SE QUIEN SOY — Next.js + Supabase

## Variables necesarias en Vercel
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

## Opcional para IA/transcripción
- OPENAI_API_KEY (Secret, sólo servidor)

## Supabase
La base debe contener: projects, stories, people, chapters, episodes, media, app_settings y bucket privado `memorias`, con RLS como en el SQL preparado para el proyecto.

## Publicación
Subir todo el contenido de esta carpeta al repositorio GitHub conectado a Vercel. Framework: Next.js. No configurar Output Directory manualmente.
