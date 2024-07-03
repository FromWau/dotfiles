import icons from "libs/icons"

const mpris = await Service.import("mpris")

type Player = import("types/service/mpris").MprisPlayer
const min_size = 150

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
        class_name: "cover",
        css: Utils.merge(
            [player.bind("cover_path"), player.bind("track_cover_url")],
            (path, url) =>
                `background-image: url('${path || url}'); min-width: ${min_size * 2}px; min-height: ${min_size}px;`
        ),
    })

    const positionSlider = Widget.Slider({
        class_name: "positionSlider",
        draw_value: false,
        on_change: ({ value }) => (player.position = value * player.length),
        setup: (self) => {
            const update = () => {
                const { length, position } = player
                self.visible = length > 0
                self.value = length > 0 ? position / length : 0
            }
            self.hook(player, update)
            self.hook(player, update, "position")
            self.poll(1000, update)
        },
    })

    const playPause = Widget.Button({
        on_primary_click: () => player.playPause(),
        child: Widget.Icon({
            icon: player
                .bind("play_back_status")
                .as((status) =>
                    status === "Playing" ? icons.media.pause : icons.media.play
                ),
        }),
    })

    const next = Widget.Button({
        on_primary_click: () => player.next(),
        child: Widget.Icon({ icon: icons.media.next }),
    })

    const previous = Widget.Button({
        on_primary_click: () => player.previous(),
        child: Widget.Icon({ icon: icons.media.previous }),
    })

    const shuffle = Widget.Button({
        on_primary_click: () => player.shuffle(),
        child: Widget.Icon({ icon: icons.media.shuffle }),
    })

    const forward = Widget.Button({
        on_primary_click: () => player.position + 5,
        child: Widget.Icon({ icon: icons.media.forward }),
    })

    const backward = Widget.Button({
        on_primary_click: () => player.position - 5,
        child: Widget.Icon({ icon: icons.media.backward }),
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
        children: [backward, previous, playPause, next, forward, shuffle],
    })

    return Widget.Box({
        vertical: true,
        children: [cover, positionSlider, header, controls],
    })
}

export const Players = () =>
    Widget.Box({
        vertical: true,
        children: getPlayers(),
    })
