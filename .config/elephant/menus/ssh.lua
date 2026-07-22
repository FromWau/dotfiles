Name = "sshkeys"
NamePretty = "SSH Keys"
Description = "Load an ssh key into the agent"
Icon = "dialog-password"
SearchName = true
Keywords = { "ssh", "key", "agent" }
Action = "ghostty -e ssh-key-menu load '%VALUE%'"

function GetEntries()
    local entries = {}

    local handle = io.popen("ssh-key-menu list")
    if handle then
        for line in handle:lines() do
            local name, status = line:match("^(.-)\t(.*)$")
            if name and name ~= "" then
                table.insert(entries, {
                    Text = name,
                    Subtext = status == "loaded" and "currently loaded" or "",
                    Value = name,
                    Icon = "dialog-password",
                })
            end
        end
        handle:close()
    end

    return entries
end
