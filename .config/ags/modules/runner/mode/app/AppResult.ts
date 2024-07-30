import { runner_apps_query_result, show_runner } from "libs/variables"
import { RunnerResultContainer } from "modules/runner/Result"

const RunnerAppsContainer = () =>
    RunnerResultContainer({
        setup: (self) => {
            self.hook(runner_apps_query_result, () => {
                self.children = [
                    ...runner_apps_query_result.getValue().map((app) =>
                        Widget.Button({
                            class_name: "resultItem",
                            on_clicked: () => {
                                show_runner.setValue(false)
                                app.launch()
                            },
                            child: Widget.Box({
                                spacing: 8,
                                children: [
                                    Widget.Icon({
                                        icon: app.icon_name || "",
                                        size: 25,
                                    }),
                                    Widget.Label({ label: app.name }),
                                ],
                            }),
                        })
                    ),
                ]
            })
        },
    })

export const AppResult = () => RunnerAppsContainer()
