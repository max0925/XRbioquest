# Supabase teaching model catalog

New lesson assembly reads the current public `ngss_assets` catalog, not the
build-time asset registry. No database migration or environment-variable change
is needed. Deploy this code once before using this workflow.

## Add a model

1. Upload a web-ready GLB to the existing public `assets` bucket, using a new
   versioned filename (for example `ribosome-v3.glb`).
2. Insert a row in `ngss_assets`: name, model_url (public HTTPS URL), category,
   and keywords (text array). Keep keywords specific and unique; include aliases
   such as `polypeptide`. Retain the table's existing required fields/defaults.
3. Generate a lesson using its exact name or keyword. No code deployment needed.

The generated object stores `supabase_id` separately from its lesson `id`.
Three draggable copies may share a single library UUID and still have distinct
interaction IDs. Lesson roles and phase targets control interaction; uploading
a GLB does not add click/grab behavior or activate physics colliders.

## Replace a model

Upload a new versioned file, then update `model_url` on the SAME catalog row.
Reopening a new-style lesson resolves that UUID to the latest URL. Keep old
files so saved URL fallbacks and legacy lessons continue working. This is not
a live replacement in an already-open session.

Old lessons without a library UUID retain their saved URLs. No historical
lesson records are rewritten. If the catalog is unavailable, playback uses its
saved URLs; new assembly returns a retryable error instead of pretending the
library is empty. Unknown or ambiguous matches use the existing placeholder
behavior; register a distinctive keyword to resolve ambiguity.

## Verification (run manually)

    node --experimental-strip-types --test tests/asset-catalog.test.ts
    npm run typecheck
    npm run build

After deployment, verify a newly registered keyword resolves to its library
UUID, then change that row's URL and reopen the lesson. Confirm three copies
keep separate IDs and that click/collect/deliver progression is unchanged.
Actual WebXR controller behavior still requires headset verification.
