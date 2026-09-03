// Section registry, kept separate from admin.js on purpose.
//
// Section files do `import { registerSection } from '../admin.js'` and call
// registerSection() at their own top level; admin.js statically imports every section
// file at its bottom. That is a circular module reference (admin.js <-> section file).
// If `sections`/`registerSection` lived directly in admin.js as a `const`, the section
// file's top-level call would run — per the ES module evaluation order, which runs all
// of a module's static imports (regardless of where they're written) before that
// module's own top-level code — before admin.js's own `const sections = new Map()` line
// had executed, hitting `sections` in its temporal dead zone and crashing the app at
// load. (A dynamic `await import(...)` in admin.js does not fix this either: it turns
// admin.js into an async module, and a *static* back-edge into a still-evaluating async
// module deadlocks instead of erroring — confirmed empirically, not just in theory.)
//
// This module has no imports of its own, so it fully evaluates the moment anything
// first touches it, before any dependent module's body runs, regardless of which side
// of the cycle gets evaluated first. admin.js imports `sections`/`registerSection` from
// here and re-exports `registerSection` so `import { registerSection } from '../admin.js'`
// in section files keeps working unchanged.
export const sections = new Map();
export function registerSection(key, def) { sections.set(key, def); }
