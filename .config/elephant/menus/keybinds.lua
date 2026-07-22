Name = "keybinds"
NamePretty = "Keybinds"
Description = "Keyboard shortcut help for walker and hyprland"
Icon = "input-keyboard"
SearchName = true
Keywords = { "keys", "keybinds", "shortcuts", "hotkeys", "help", "whichkey" }
FixedOrder = true

function GetEntries()
    local entries = {}

    local handle = io.popen(os.getenv("HOME") .. "/.config/walker/keybinds-list")
    if handle then
        for line in handle:lines() do
            local source, combo, desc = line:match("^(.-)\t(.-)\t(.*)$")
            if combo then
                table.insert(entries, {
                    Text = combo,
                    Subtext = source .. " · " .. desc,
                    Icon = "input-keyboard",
                })
            end
        end
        handle:close()
    end

    return entries
end
