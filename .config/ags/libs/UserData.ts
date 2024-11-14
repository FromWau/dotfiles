import { queryLocation } from "modules/runner/mode/location/queryLocation"
import { USER } from "resource:///com/github/Aylur/ags/utils.js"
import { runner_location } from "./variables"

type UserData = {
    location: string
}

export const loadUserData = () => {
    try {
        const data: UserData = JSON.parse(
            Utils.readFile(`/home/${USER}/.cache/ags/UserSettings.json`)
        )

        if (data.location) {
            queryLocation(data.location)
        }
    } catch (e) {
        console.log("unable to load user cache data")
    }
}

export const saveUserData = () => {
    try {
        const c = runner_location.getValue()

        if (c === "unavailable" || c === "searching" || c === undefined) {
            throw new Error("no location data")
        }

        const data = `
{
    "location": "${c.name}"
}`

        Utils.writeFileSync(data, `/home/${USER}/.cache/ags/UserSettings.json`)
    } catch (e) {
        console.log("unable to save user cache data")
    }
}
