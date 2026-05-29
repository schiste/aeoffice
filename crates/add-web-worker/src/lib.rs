//! Worker-side runtime helpers will live here once the browser worker
//! boundary is wired directly to the Rust WebAssembly bindings.
//!
//! For now, the crate reserves the boundary in the workspace and makes the
//! intended architecture explicit.

pub const WORKER_PROTOCOL_VERSION: u16 = 1;

pub fn runtime_boundary_note() -> &'static str {
    "Run the simulation in the worker, keep the UI shell thin."
}
