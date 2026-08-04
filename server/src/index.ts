// =============================================================================
// URS-DMS — entrypoint. Loads env (which validates + exits on error),
// then imports the server bootstrap. Keeping imports at the bottom ensures
// env validation runs first.
// =============================================================================
import "@/config/env";
import "@/server";
