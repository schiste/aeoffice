pub const ADD_WEB_WORKER_BOUNDARY: &str = "worker-host-boundary";

pub fn worker_boundary_note() -> &'static str {
    add_core::boundary_note()
}
