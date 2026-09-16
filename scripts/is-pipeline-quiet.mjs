/** True when run under `pipeline:nightly` (errors/oddities only). */
export const PIPELINE_QUIET = process.env.PIPELINE_QUIET === "1";
