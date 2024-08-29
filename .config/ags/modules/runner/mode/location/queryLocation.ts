import { saveUserData } from "libs/UserData"
import { runner_location, runner_mode, show_runner } from "libs/variables"
import { fetch } from "resource:///com/github/Aylur/ags/utils/fetch.js"

type City = {
    name: string
    latitude: number
    longitude: number
    elevation: number
    population: number
    country: string
    timezone: string
}

type Weather = {
    hourly_untis: {
        time: string
        temperature_2m: string
    }
    hourly: {
        time: string[]
        temperature_2m: string[]
    }
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

        const result = (await response.json()) as {
            results: City[]
        }

        if (!result.results) {
            throw new Error("No results")
        }

        const c: City = result.results[0]
        getWeather(c)

        return c
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message)
        }
    }

    return undefined
}

async function getWeather(city: City) {
    console.log("getWeather:", city.name)

    const url_timezone = city.timezone.split("/").join("%2F")

    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&hourly=temperature_2m&timezone=${url_timezone}&forecast_days=1`,
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

        const result: Weather = await response.json()

        function getCurrentLocaleDateTime(): string {
            const currentDate = new Date()

            const year = currentDate.getFullYear()
            const month = String(currentDate.getMonth() + 1).padStart(2, "0")
            const day = String(currentDate.getDate()).padStart(2, "0")
            const hours = String(currentDate.getHours()).padStart(2, "0")

            return `${year}-${month}-${day}T${hours}:00`
        }

        const formattedDateTime = getCurrentLocaleDateTime()

        result.hourly.time
            .map((time, index) => {
                return { index: index, time: time }
            })
            .filter((e) => e.time === formattedDateTime)
            .forEach((e) => {
                console.log("time:", e.time)
                console.log(
                    "temp:",
                    result.hourly.temperature_2m[e.index]
                )
            })

        return undefined
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

                saveUserData()
            }
        })
        .catch((error) => {
            console.log("error: ", error)
        })
}
