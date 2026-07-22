Name = "wallpapers"
NamePretty = "Theme"
Description = "Pick a wallpaper and re-theme via hypr-wal"
Icon = "preferences-desktop-wallpaper"
SearchName = true
Action = "hypr-wal '%VALUE%'"

function GetEntries()
    local entries = {}

    table.insert(entries, {
        Text = "Shuffle",
        Subtext = "random wallpaper",
        Icon = "media-playlist-shuffle",
        Actions = { shuffle = "hypr-wal" },
    })

    -- wallpaper-thumbs prints "<thumb>\t<original>"; full-res images are too
    -- slow to decode as list icons, so icons use the cached thumbnails.
    local handle = io.popen("wallpaper-thumbs")
    if handle then
        for line in handle:lines() do
            local thumb, orig = line:match("^(.-)\t(.+)$")
            if thumb and orig then
                table.insert(entries, {
                    Text = orig:match("([^/]+)$"),
                    Value = orig,
                    Icon = thumb,
                    Preview = orig,
                    PreviewType = "file",
                })
            end
        end
        handle:close()
    end

    return entries
end
