/**
 * Set a vertical divider `|`
 * @param {number} length Define the length of the divider
 */
export const DividerV = (length: number = 30) =>
    Widget.Box({
        css: `
            color: @insensitive_fg_color;
            margin-left: 20px;
            margin-right: 10px;

            background-color: @insensitive_fg_color;
            min-height: ${length}px;
            min-width: 0.5px;
        `,
    })

/**
 * Set a horizontal divider `-`
 * @param {number} length Define the length of the divider
 */
export const DividerH = (length: number = 350) =>
    Widget.Box({
        css: `
            color: @insensitive_fg_color;
            margin-top: 20px;
            margin-bottom: 10px;

            background-color: @insensitive_fg_color;
            min-width: ${length}px;
            min-height: 0.5px;
        `,
    })
