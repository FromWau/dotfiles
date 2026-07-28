Name = "sshkeys"
NamePretty = "SSH Keys"
Description = "Load or unload an ssh key in the agent"
Icon = "dialog-password"
SearchName = true
Keywords = { "ssh", "key", "agent" }
Action = "ghostty -e ssh-key toggle '%VALUE%'"

function GetEntries()
    local entries = {}

    local handle = io.popen("ssh-key list")
    if handle then
        for line in handle:lines() do
            local name, status = line:match("^(.-)\t(.*)$")
            if name and name ~= "" then
                table.insert(entries, {
                    Text = name,
                    Subtext = status == "loaded" and "loaded — select to unload" or "select to load",
                    Value = name,
                    Icon = "dialog-password",
                })
            end
        end
        handle:close()
    end

    return entries
end
