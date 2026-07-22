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

    local dir = os.getenv("HOME") .. "/Pictures/wallpapers"
    local handle = io.popen("fd -e png -e jpg -e jpeg . '" .. dir .. "' | sort")
    if handle then
        for line in handle:lines() do
            local filename = line:match("([^/]+)$")
            if filename then
                table.insert(entries, {
                    Text = filename,
                    Value = line,
                    Icon = line,
                    Preview = line,
                    PreviewType = "file",
                })
            end
        end
        handle:close()
    end

    return entries
end
