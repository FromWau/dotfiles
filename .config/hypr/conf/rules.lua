-- Workspace + window rules.

hl.workspace_rule {
    workspace = "special",
    gaps_in = 5,
    gaps_out = 50,
}

-- xwaylandvideobridge: hide and prevent it from grabbing focus / animating / blurring.
hl.window_rule {
    name = "xwaylandvideobridge-hide",
    match = { class = "xwaylandvideobridge" },
    opacity = "0.0 override",
    no_anim = true,
    no_initial_focus = true,
    max_size = { 1, 1 },
    no_blur = true,
}

-- AGS settings windows
hl.window_rule {
    name = "ags-settings-float",
    match = { title = "^(AGS Settings)$" },
    float = true,
}
hl.window_rule {
    name = "monitor-settings-float",
    match = { title = "^(Monitor Settings)$" },
    float = true,
}

-- Suppress self-maximize for all apps
hl.window_rule {
    name = "suppress-maximize",
    match = { class = ".*" },
    suppress_event = "maximize",
}
