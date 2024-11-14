import { Fzf, extendedMatch } from "node_modules/fzf/dist/fzf.es"
import { Application } from "resource:///com/github/Aylur/ags/service/applications.js"
type FzfResultItem = import("node_modules/fzf/dist/fzf.es").FzfResultItem
type Selector = import("node_modules/fzf/dist/fzf.es").Selector

const byTrimmedLengthAsc = (
    a: FzfResultItem,
    b: FzfResultItem,
    selector: Selector
) => selector(a.item).trim().length - selector(b.item).trim().length

export function fzfStrings(input: string, array: string[]): string[] {
    const fzf = new Fzf(array, {
        selector: (e: string) => e,
        match: extendedMatch,
        tiebreakers: [byTrimmedLengthAsc],
        // sort: false,
        // fuzzy: "v1",
    })
    const entries: {
        item: string
        start: number
        end: number
        score: number
        positions: any
    }[] = fzf.find(input)

    return entries.sort((a, b) => a.score - b.score).map((e) => e.item)
    // .map((e) => `${e.score}-${e.item}`)
}

export function fzfApps(input: string, array: Application[]): Application[] {
    const fzf = new Fzf(array, {
        selector: (e: Application) => e.name,
        match: extendedMatch,
        tiebreakers: [byTrimmedLengthAsc],
        // sort: false,
        // fuzzy: "v1",
    })
    const entries: {
        item: Application
        start: number
        end: number
        score: number
        positions: any
    }[] = fzf.find(input)

    return entries.sort((a, b) => a.score - b.score).map((e) => e.item)
}
