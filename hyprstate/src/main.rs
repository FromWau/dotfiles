use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, ExitCode, Stdio};

use clap::{Parser, Subcommand};
use serde_json::Value;

#[derive(Parser)]
#[command(version, about = "Get/set Hyprland desktop state")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Print a value (or the entire state when KEY is omitted).
    Get { key: Option<String> },

    /// Set KEY to VALUE. Reload and notify are opt-in.
    Set {
        key: String,
        value: String,
        /// Issue `hyprctl reload` after writing.
        #[arg(long)]
        reload: bool,
        /// Send a desktop notification with this body.
        #[arg(long, value_name = "BODY")]
        notify: Option<String>,
        /// Title for the notification (default: KEY).
        #[arg(long, value_name = "TITLE")]
        notify_title: Option<String>,
        /// Icon name for the notification.
        #[arg(long, value_name = "ICON")]
        notify_icon: Option<String>,
        /// Parse VALUE as JSON instead of a plain string.
        #[arg(long)]
        json: bool,
    },

    /// Rotate KEY through a comma-separated VALUES list.
    Cycle {
        key: String,
        values: String,
        #[arg(long)]
        reload: bool,
        #[arg(long, value_name = "BODY")]
        notify: Option<String>,
        #[arg(long, value_name = "TITLE")]
        notify_title: Option<String>,
        #[arg(long, value_name = "ICON")]
        notify_icon: Option<String>,
    },

    /// Print the resolved state.json path.
    Path,
}

fn state_path() -> PathBuf {
    let xdg = std::env::var("XDG_STATE_HOME").ok().filter(|s| !s.is_empty());
    let base = match xdg {
        Some(p) => PathBuf::from(p),
        None => {
            let home = std::env::var("HOME").expect("HOME not set");
            PathBuf::from(home).join(".local/state")
        }
    };
    base.join("hypr/state.json")
}

fn read_state() -> Value {
    match fs::read_to_string(state_path()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| Value::Object(Default::default())),
        Err(_) => Value::Object(Default::default()),
    }
}

fn write_state(state: &Value) -> std::io::Result<()> {
    let path = state_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("json.tmp");
    {
        let mut f = fs::File::create(&tmp)?;
        let serialized = serde_json::to_string_pretty(state).expect("serialize state");
        f.write_all(serialized.as_bytes())?;
        f.write_all(b"\n")?;
        f.sync_all()?;
    }
    fs::rename(&tmp, &path)?;
    Ok(())
}

fn hyprctl_reload() -> Result<(), String> {
    let out = Command::new("hyprctl")
        .arg("reload")
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("spawn hyprctl: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "hyprctl reload failed: {}",
            String::from_utf8_lossy(&out.stderr).trim()
        ));
    }
    Ok(())
}

fn notify_send(title: &str, body: &str, icon: Option<&str>) {
    let mut cmd = Command::new("notify-send");
    cmd.arg(title).arg(body);
    if let Some(i) = icon {
        cmd.arg("-i").arg(i);
    }
    let _ = cmd.spawn();
}

fn print_value(v: &Value) {
    match v {
        Value::String(s) => println!("{s}"),
        Value::Null => {}
        other => println!("{other}"),
    }
}

fn parse_value(raw: &str, as_json: bool) -> Result<Value, String> {
    if as_json {
        serde_json::from_str(raw).map_err(|e| format!("invalid JSON for VALUE: {e}"))
    } else {
        Ok(Value::String(raw.to_string()))
    }
}

fn apply_side_effects(
    key: &str,
    do_reload: bool,
    notify_body: Option<String>,
    notify_title: Option<String>,
    notify_icon: Option<String>,
) -> Result<(), String> {
    if do_reload {
        hyprctl_reload()?;
    }
    if notify_body.is_some() || notify_title.is_some() || notify_icon.is_some() {
        let body = notify_body.unwrap_or_default();
        let title = notify_title.unwrap_or_else(|| key.to_string());
        notify_send(&title, &body, notify_icon.as_deref());
    }
    Ok(())
}

fn run() -> Result<(), String> {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Get { key } => {
            let state = read_state();
            match key {
                Some(k) => match state.get(&k) {
                    Some(v) => print_value(v),
                    None => return Err(format!("key not found: {k}")),
                },
                None => println!(
                    "{}",
                    serde_json::to_string_pretty(&state)
                        .map_err(|e| format!("serialize state: {e}"))?
                ),
            }
            Ok(())
        }

        Cmd::Set {
            key,
            value,
            reload,
            notify,
            notify_title,
            notify_icon,
            json,
        } => {
            let v = parse_value(&value, json)?;
            let mut state = read_state();
            if !state.is_object() {
                state = Value::Object(Default::default());
            }
            state.as_object_mut().unwrap().insert(key.clone(), v);
            write_state(&state).map_err(|e| format!("write state: {e}"))?;
            apply_side_effects(&key, reload, notify, notify_title, notify_icon)
        }

        Cmd::Cycle {
            key,
            values,
            reload,
            notify,
            notify_title,
            notify_icon,
        } => {
            let opts: Vec<String> = values
                .split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect();
            if opts.is_empty() {
                return Err("VALUES must not be empty".into());
            }
            let mut state = read_state();
            if !state.is_object() {
                state = Value::Object(Default::default());
            }
            let current = state.get(&key).and_then(|v| v.as_str()).map(String::from);
            let next_idx = current
                .as_deref()
                .and_then(|c| opts.iter().position(|v| v == c))
                .map(|i| (i + 1) % opts.len())
                .unwrap_or(0);
            let next = opts[next_idx].clone();
            state
                .as_object_mut()
                .unwrap()
                .insert(key.clone(), Value::String(next.clone()));
            write_state(&state).map_err(|e| format!("write state: {e}"))?;
            let body = notify.map(|t| t.replace("{value}", &next));
            apply_side_effects(&key, reload, body, notify_title, notify_icon)
        }

        Cmd::Path => {
            println!("{}", state_path().display());
            Ok(())
        }
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("hyprstate: {e}");
            ExitCode::FAILURE
        }
    }
}
