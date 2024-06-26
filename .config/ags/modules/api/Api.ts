import { reloadScss, toggleMediaMenu, toggleSessionMenu } from "libs/utils"

globalThis.togglePowerMenu = () => toggleSessionMenu()
globalThis.toggleMediaMenu = () => toggleMediaMenu()
globalThis.reloadScss = () => reloadScss()
