import { bind, Variable } from "astal"
import { App, Astal, Gtk } from "astal/gtk3"
import AstalMpris from "gi://AstalMpris"
import { showMedia } from "lib/variables"


const mpris = AstalMpris.get_default()
const playerctld = AstalMpris.Player.new("playerctld")

export default function Media() {
    return <window
        name="Media"
        className="Media"
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        application={App} >
        <MediaRevealer />
    </window >
}

function MediaRevealer() {
    return <revealer
        revealChild={bind(showMedia)}
        transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
        transitionDuration={1000}
    >
        <box vertical>
            <box hexpand>
                <label hexpand halign={Gtk.Align.CENTER} label="Media" />
                <button hexpand halign={Gtk.Align.END} onClicked={() => showMedia.set(false)} >
                    <icon icon="window-close-symbolic" />
                </button>
            </box>
            {
                bind(mpris, "players").as(players => players
                    .filter(player => !player.bus_name.endsWith(".playerctld"))
                    .map(player => PlayerItem({ player }))
                )
            }
        </box>
    </revealer >
}

function PlayerItem({ player }: { player: AstalMpris.Player }) {
    const is_active = Variable.derive(
        [bind(player, "identity"), bind(playerctld, "identity")], (player_id, playerctld_id) => player_id === playerctld_id
    )


    return <box vertical>
        <box vertical>
            <box>
                <icon halign={Gtk.Align.START} icon={bind(player, "entry").as(e =>
                    Astal.Icon.lookup_icon(e) ? e : "audio-x-generic-symbolic"
                )} />
                <label hexpand halign={Gtk.Align.END} label={bind(is_active).as(i => i ? "ACTIVE" : "")} />
            </box>
            <label halign={Gtk.Align.START} label={bind(player, "title").as(t => t)} />
            <label halign={Gtk.Align.START} label={bind(player, "artist").as(a => a)} />
        </box>

        <box vertical>
            <box hexpand>
                <slider
                    visible={bind(player, "length").as(length => length > 0)}
                    on_dragged={({ value }) => player.set_position(value * player.length)}
                    value={bind(player, "position").as(position => player.length > 0 ? position / player.length : 0)}
                />
                <label hexpand halign={Gtk.Align.END} label={bind(player, "position").as(lengthStr)} />
            </box>

            <box hexpand halign={Gtk.Align.CENTER}>
                <button
                    onClicked={() => player.previous()}
                    visible={bind(player, "can_go_previous").as(can_go_previous => can_go_previous)}>
                    <icon icon="media-skip-backward-symbolic" />
                </button>

                <button
                    onClicked={() => player.play_pause()}
                    visible={bind(player, "can_control").as(can_control => can_control)}>
                    <icon icon={bind(player, "playback_status").as(status =>
                        status === AstalMpris.PlaybackStatus.PLAYING
                            ? "media-playback-pause-symbolic"
                            : "media-playback-start-symbolic")
                    } />
                </button>

                <button
                    onClicked={() => player.next()}
                    visible={bind(player, "can_go_next").as(can_go_next => can_go_next)} >
                    <icon icon="media-skip-forward-symbolic" />
                </button>
            </box >
        </box>
    </box>
}

function lengthStr(length: number) {
    const min = Math.floor(length / 60)
    const sec = Math.floor(length % 60)
    const sec0 = sec < 10 ? "0" : ""
    return `${min}:${sec0}${sec}`
}
