import { Fzf } from "node_modules/fzf/dist/fzf.es"

const list = [
    "go",
    "javascript",
    "python",
    "rust",
    "swift",
    "kotlin",
    "elixir",
    "java",
    "lisp",
    "v",
    "zig",
    "nim",
    "rescript",
    "d",
    "haskell",
]

const fzf = new Fzf(list)

const entries = fzf.find("li")
const ranking = entries.map((entry) => entry.item).join(", ")
console.log(ranking) // Output: lisp, kotlin, elixir

export default {}
