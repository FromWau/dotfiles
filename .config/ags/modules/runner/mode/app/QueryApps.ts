import {
    runner_apps_query_result,
    runner_mode,
    show_runner,
} from "libs/variables"
import { fzfApps } from "libs/Fzf"
import { Application } from "resource:///com/github/Aylur/ags/service/applications.js"

const applications = await Service.import("applications")

export const queryApps = (input: string) => {
    const allApps: Application[] = applications.list

    const result = fzfApps(input, allApps)

    runner_apps_query_result.setValue(result)
    runner_mode.setValue("apps")
    show_runner.setValue(true)
}
