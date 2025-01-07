-- FIXME: Fix comment mappings
return {
    "echasnovski/mini.comment",
    version = false,
    opts = {
        mappings = {
            -- Toggle comment (like `gcip` - comment inner paragraph) for both
            -- Normal and Visual modes
            comment = "gc",
            comment = "<C-7>",
            comment = "<C-kdivide>",

            -- Toggle comment on current line
            comment_line = "gcc",
            comment_line = "<C-7>",
            comment_line = "<C-kdivide>",

            -- Toggle comment on visual selection
            comment_visual = "gc",
            comment_visual = "<C-7>",
            comment_visual = "<C-kdivide>",

            -- Define 'comment' textobject (like `dgc` - delete whole comment block)
            -- Works also in Visual mode if mapping differs from `comment_visual`
            textobject = "gc",
            textobject = "<C-7>",
            textobject = "<C-kdivide>",
        },
    },
}
