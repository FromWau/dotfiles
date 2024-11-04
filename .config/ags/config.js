const outdir = '/tmp/ags/js'
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

    return true
}

const deploy = async () => {
    try {

        const cwd = Utils.exec('bash -c "echo $PWD"')
        await Utils.execAsync(["bash", "-c",
            "cd", `${App.configDir}`,
            "bun", "add", "fzf",
            "cd", cwd,
        ])

        await Utils.execAsync([
            "bun", "build", entry,
            "--outdir", outdir,
            "--external", "resource://*",
            "--external", "gi://*",
        ])

        await import(`file://${outdir}/main.js`)
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
