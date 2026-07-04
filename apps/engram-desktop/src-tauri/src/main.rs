// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pty;

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use pty::PtySession;
use std::io::Read;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

struct EngineProcess(Mutex<Option<std::process::Child>>);
struct PtyState(Mutex<Option<PtySession>>);

const ENGINE_PORT: u16 = 3939;

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

#[tauri::command]
fn get_engine_port() -> u16 {
    ENGINE_PORT
}

#[tauri::command]
fn check_engram_cli() -> bool {
    std::process::Command::new("which")
        .arg("engram")
        .env(
            "PATH",
            format!(
                "/opt/homebrew/bin:/usr/local/bin:{}",
                std::env::var("PATH").unwrap_or_default()
            ),
        )
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
fn get_connection_method(method: String) -> String {
    method
}

#[tauri::command]
fn spawn_pty(app: AppHandle, state: State<PtyState>, cols: u16, rows: u16) -> Result<(), String> {
    // Check for tmux
    if std::process::Command::new("which")
        .arg("tmux")
        .env(
            "PATH",
            format!(
                "/opt/homebrew/bin:/usr/local/bin:{}",
                std::env::var("PATH").unwrap_or_default()
            ),
        )
        .output()
        .map(|o| !o.status.success())
        .unwrap_or(true)
    {
        app.emit("pty-error", "tmux not found. Install it:\n\n  brew install tmux")
            .ok();
        return Err("tmux not installed".into());
    }

    // Check for engram
    if std::process::Command::new("which")
        .arg("engram")
        .env(
            "PATH",
            format!(
                "/opt/homebrew/bin:/usr/local/bin:{}",
                std::env::var("PATH").unwrap_or_default()
            ),
        )
        .output()
        .map(|o| !o.status.success())
        .unwrap_or(true)
    {
        app.emit(
            "pty-error",
            "engram not found. Install it:\n\n  npm i -g engram-harness",
        )
        .ok();
        return Err("engram not installed".into());
    }

    // Kill existing session if any
    if let Ok(mut guard) = state.0.lock() {
        if let Some(ref session) = *guard {
            session.kill();
        }
        *guard = None;
    }

    let (session, mut reader) = PtySession::spawn(cols, rows)?;

    // Store session
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(session);
    }

    // Reader thread: PTY output -> base64 -> frontend event
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let encoded = B64.encode(&buf[..n]);
                    app_handle.emit("pty-output", &encoded).ok();
                }
            }
        }
        app_handle.emit("pty-exit", ()).ok();
    });

    Ok(())
}

#[tauri::command]
fn pty_write(state: State<PtyState>, data: String) -> Result<(), String> {
    let decoded = B64.decode(&data).map_err(|e| format!("Base64 decode failed: {e}"))?;
    if let Ok(guard) = state.0.lock() {
        if let Some(ref session) = *guard {
            return session.write(&decoded);
        }
    }
    Err("No active PTY session".into())
}

#[tauri::command]
fn pty_resize(state: State<PtyState>, cols: u16, rows: u16) -> Result<(), String> {
    if let Ok(guard) = state.0.lock() {
        if let Some(ref session) = *guard {
            return session.resize(cols, rows);
        }
    }
    Ok(())
}

#[tauri::command]
fn pty_kill(state: State<PtyState>) {
    if let Ok(guard) = state.0.lock() {
        if let Some(ref session) = *guard {
            session.kill();
        }
    }
}

fn spawn_engine() -> Option<std::process::Child> {
    match std::process::Command::new("engram")
        .args(["serve-http", "--port", &ENGINE_PORT.to_string()])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(child) => {
            println!("Engram engine started on port {}", ENGINE_PORT);
            Some(child)
        }
        Err(e) => {
            eprintln!("Failed to start Engram engine: {}", e);
            eprintln!("Make sure 'engram' is installed and in PATH");
            None
        }
    }
}

fn main() {
    let engine = spawn_engine();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(EngineProcess(Mutex::new(engine)))
        .manage(PtyState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            open_url,
            get_engine_port,
            check_engram_cli,
            get_connection_method,
            spawn_pty,
            pty_write,
            pty_resize,
            pty_kill
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Kill engine process when window closes
                if let Some(state) = window.try_state::<EngineProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(ref mut child) = *guard {
                            let _ = child.kill();
                            println!("Engram engine stopped");
                        }
                    }
                }
                // Kill PTY session when window closes
                if let Some(state) = window.try_state::<PtyState>() {
                    if let Ok(guard) = state.0.lock() {
                        if let Some(ref session) = *guard {
                            session.kill();
                            println!("PTY session stopped");
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Engram");
}
