/** @param {('vertical'|'horizontal')} orientation */
/** @param {number} space */
export const Spacer = (orientation = "vertical", space: number = 10) =>
    Widget.Box({
        class_name: "spacer",
        css: `${orientation === "vertical" ? "margin-right" : "margin-top"}:${space}px;`,
        child: Widget.Label(""),
    })
