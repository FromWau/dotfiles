import { runner_location, runner_mode, show_runner } from "libs/variables"
import { fetch } from "resource:///com/github/Aylur/ags/utils/fetch.js"

type FetchResult = {
    results: City[]
}

type City = {
    name: string
    latitude: number
    longitude: number
    elevation: number
    population: number
    country: string
    timezone: string
}

async function getCity(city: string): Promise<undefined | City> {
    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`)
        }

        const result = (await response.json()) as FetchResult

        if (!result.results) {
            throw new Error("No results")
        }

        return result.results[0] as City
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message)
        }
    }

    return undefined
}

export const queryLocation = (input: string) => {
    if (!input || input === "") {
        runner_mode.setValue("location")
        show_runner.setValue(true)
        return
    }

    getCity(input)
        .then((result) => {
            if (result) {
                runner_location.setValue(result)
                runner_mode.setValue("none")
                show_runner.setValue(false)
            }
        })
        .catch((error) => {
            console.log("error: ", error)
        })
}
