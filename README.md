<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/733d15f3-6adc-4fe9-9edf-9742253774f6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
## Migrações consolidada

- **Nota:** O arquivo de migração inicial `000_init_consolidated.sql` deve ser o primeiro a ser executado.
- Para resetar o banco local use: `supabase db reset && supabase db push`.
- Após o merge, crie a tag `v2.0-migration-consolidated`.
