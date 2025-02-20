import { Variable } from "astal"

export const showPower = Variable(false)
export const showMedia = Variable(false)
export const time = Variable("").poll(1000, "date '+%T %a, %d. %_B(%m) %Y'")
