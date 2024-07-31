import { queryLocation } from "modules/runner/mode/location/queryLocation"
import { USER } from "resource:///com/github/Aylur/ags/utils.js"

type UserData = {
    location: string,
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
