use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn portable_pty::Child + Send>>,
}

impl PtySession {
    pub fn spawn(cols: u16, rows: u16) -> Result<(Self, Box<dyn Read + Send>), String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {e}"))?;

        let mut cmd = CommandBuilder::new("engram");
        cmd.arg("studio");

        // Ensure Homebrew paths are available (Finder doesn't inherit shell PATH)
        let path = std::env::var("PATH").unwrap_or_default();
        let extended_path = format!("/opt/homebrew/bin:/usr/local/bin:{path}");
        cmd.env("PATH", &extended_path);
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn engram studio: {e}"))?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {e}"))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take writer: {e}"))?;

        let session = PtySession {
            master: pair.master,
            writer: Mutex::new(writer),
            child: Mutex::new(child),
        };

        Ok((session, reader))
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        self.writer
            .lock()
            .map_err(|e| e.to_string())?
            .write_all(data)
            .map_err(|e| format!("PTY write failed: {e}"))
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        self.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("PTY resize failed: {e}"))
    }

    pub fn kill(&self) {
        if let Ok(mut child) = self.child.lock() {
            let _ = child.kill();
        }
    }
}
