import {
    runner_mode,
    runner_ssh_query_result,
    show_runner,
} from "libs/variables"
import { fzfStrings } from "libs/Fzf"
import { USER } from "resource:///com/github/Aylur/ags/utils.js"

export const querySshAgentKeys = (input: string) => {
    var exec = `fd . --base-directory /home/${USER}/.ssh/ --strip-cwd-prefix -E '*.pub' -E '*hosts*' -E 'config'`

    if (input !== "") {
        exec += ` -E '${input}'`
    }

    Utils.execAsync(exec)
        .then((r) => {
            const sshKeys: string[] = r.split("\n").filter((e) => e !== "")

            const result = fzfStrings(input, sshKeys)

            runner_ssh_query_result.setValue(result)
            runner_mode.setValue("sshAgent")
            show_runner.setValue(true)
        })
        .catch((error) => {
            console.log("error: ", error)
        })
}
