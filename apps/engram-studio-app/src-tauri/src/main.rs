#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pty;

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use pty::PtySession;
use std::io::Read;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

struct PtyState(Mutex<Option<PtySession>>);

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

    // Reader thread: PTY output → base64 → frontend event
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

fn main() {
    tauri::Builder::default()
        .manage(PtyState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            spawn_pty, pty_write, pty_resize, pty_kill
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<PtyState>() {
                    if let Ok(guard) = state.0.lock() {
                        if let Some(ref session) = *guard {
                            session.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Failed to run Engram Studio");
}
