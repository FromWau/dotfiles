const main = "/tmp/ags/main.js"
const entry = `${App.configDir}/main.ts`

const checks = () => {
    const v = {
        ags: pkg.version?.split(".").map(Number) || [],
        expect: [1, 8, 1],
    }

    if (v.ags[1] < v.expect[1] || v.ags[2] < v.expect[2]) {
        print(
            `my config needs at least v${v.expect.join(".")}, yours is v${v.ags.join(".")}`
        )
        return false
    }

    const pwd = Utils.exec('bash -c "echo $PWD"')
    if (pwd !== App.configDir) {
        print(
            "Please run this script from the root of your config directory. If not dependencies will not be installed correctly."
        )
        return false
    }

    return true
}

const deploy = async () => {
    try {
        await Utils.execAsync(["bun", "add", "fzf"])

        await Utils.execAsync([
            "bun", "build", entry,
            "--outfile", main,
            "--external", "resource://*",
            "--external", "gi://*",
            "--external", "file://*",
        ])

        await import(`file://${main}`)
    } catch (error) {
        console.error("An error occurred:", error)
        App.quit()
    }
}

if (checks()) {
    deploy()
} else {
    App.quit()
}

export {}
