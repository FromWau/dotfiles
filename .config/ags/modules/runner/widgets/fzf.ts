import { Fzf, extendedMatch } from "node_modules/fzf/dist/fzf.es"
type FzfResultItem = import("node_modules/fzf/dist/fzf.es").FzfResultItem
type Selector = import("node_modules/fzf/dist/fzf.es").Selector

type Application =
    import("resource:///com/github/Aylur/ags/service/applications.js").Application

const applications = await Service.import("applications")

export const searchApps = (input: string): String[] => {
    const allApps: Application[] = applications.list

    // allApps.forEach((app) => {
    //     console.log(app.name)
    // })
    // console.log("================================================")

    function byTrimmedLengthAsc(
        a: FzfResultItem,
        b: FzfResultItem,
        selector: Selector
    ) {
        return selector(a.item).trim().length - selector(b.item).trim().length
    }

    const fzf = new Fzf(allApps, {
        selector: (e: Application) => e.name,
        match: extendedMatch,
        tiebreakers: [byTrimmedLengthAsc],
        // sort: false,
        // fuzzy: "v1",
    })
    const entries = fzf.find(input)

    type Pair = [number, string]

    const results = entries.map(
        (
            e: {
                item: string
                start: number
                end: number
                score: number
                positions: any
            },
            index: number
        ): Pair => [e.score, `${e.score}-${allApps[index].name}`]
    )

    const sorted = results
        .sort((a: Pair, b: Pair) => a[0] - b[0])
        .map((pair: Pair) => pair[1])

    // sorted.forEach((e: string) => {
    //     console.log(e)
    // })
    // console.log("================================================")

    return sorted
}
