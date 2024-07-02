const mpris = await Service.import("mpris")

type Player = import("types/service/mpris").MprisPlayer
const cover_size_scale = 0.85

const getPlayers = () =>
    mpris
        .bind("players")
        .transform((players) =>
            players
                .filter((player) => player.name !== "playerctld")
                .flatMap((player) => [Player(player)])
        )

const Player = (player: Player) => {
    const cover = Widget.Box({
        class_name: "player",
        css: player.bind("cover_path").transform((path) => {
            const size = Utils.exec(`bash -c "file ${path} | cut -d , -f2"`)
            const sizes = size
                .split("x")
                .map((s) => parseInt(s.trim()) * cover_size_scale + "px")

            return `background-image: url('${path}'); min-width: ${sizes[0]}; min-height: ${sizes[1]};`
        }),
    })

    const playPause = Widget.Button({
        on_primary_click: () => player.playPause(),
        child: Widget.Icon({
            icon: player
                .bind("play_back_status")
                .as((status) =>
                    status === "Playing"
                        ? "media-playback-pause"
                        : "media-playback-start"
                ),
        }),
    })

    const next = Widget.Button({
        on_primary_click: () => player.next(),
        child: Widget.Icon({ icon: "media-skip-forward" }),
    })

    const previous = Widget.Button({
        on_primary_click: () => player.previous(),
        child: Widget.Icon({ icon: "media-skip-backward" }),
    })

    const shuffle = Widget.Button({
        on_primary_click: () => player.shuffle(),
        child: Widget.Icon({ icon: "media-shuffle" }),
    })

    const title = Widget.Label({
        label: player.bind("track_title").as((title) => title),
    })

    const artist = Widget.Label({
        label: player.bind("track_artists").as((artists) => artists.join(", ")),
    })

    const header = Widget.Box({
        vertical: true,
        children: [title, artist],
    })

    const controls = Widget.Box({
        vertical: false,
        spacing: 10,
        children: [previous, playPause, next, shuffle],
    })

    return Widget.Box({
        vertical: true,
        children: [cover, header, controls],
    })
}

export const Players = () =>
    Widget.Box({
        vertical: true,
        children: getPlayers(),
    })
