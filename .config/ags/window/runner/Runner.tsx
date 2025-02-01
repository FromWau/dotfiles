import { App, Astal, Gdk, Gtk } from "astal/gtk3";
import Apps from "gi://AstalApps"
import { Variable } from "astal";

function hide() {
    App.get_window("Runner")!.hide()
}

function AppItem(app: Apps.Application) {
    return <button
        className="AppItem"
        onClick={() => { hide(); app.launch() }} >
        <box>
            <icon icon={app.iconName} />
            <box valign={Gtk.Align.CENTER} vertical>
                <label className="name"
                    truncate
                    xalign={0}
                    label={app.name}
                />
                {app.description && <label
                    className="description"
                    wrap
                    xalign={0}
                    label={app.description}
                />}
            </box>
        </box>
    </button >
}


const text = Variable("")
const apps = new Apps.Apps({
    nameMultiplier: 2,
    entryMultiplier: 0,
    executableMultiplier: 2,
})

const list = text(text => apps.fuzzy_query(text).slice(0, 12))
const onEnter = () => {
    apps.fuzzy_query(text.get())?.[0].launch()
    hide()
}


function Runner() {
    return <box>
        <eventbox widthRequest={4000} expand onClick={hide} />
        <box hexpand={false} vertical>
            <eventbox heightRequest={100} onClick={hide} />
            <box widthRequest={500} className="Runner" vertical>
                <entry
                    placeholderText="Search"
                    text={text()}
                    onChanged={self => text.set(self.text)}
                    onActivate={onEnter}
                />
                <box spacing={5} vertical>
                    {list.as(list => list.map(app => AppItem(app)))}
                </box>
                <box
                    halign={Gtk.Align.CENTER}
                    className={"not-found"}
                    vertical
                    visible={list.as(list => list.length === 0)}>
                    <label label="No results" />
                </box>
                <eventbox expand onClick={hide} />
            </box>
            <eventbox widthRequest={4000} expand onClick={hide} />
        </box>
    </box>
}

export default function RunnerWindow() {
    return <window
        name="Runner"
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM}
        exclusivity={Astal.Exclusivity.IGNORE}
        keymode={Astal.Keymode.ON_DEMAND}
        application={App}
        onKeyPressEvent={function(self, event: Gdk.Event) {
            if (event.get_keyval()[1] === Gdk.KEY_Escape) {
                self.hide()
            }
        }}>
        <Runner />
    </window >
}
