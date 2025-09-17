export function numberToPercent(value: number, decimalPlaces = 2): string {
    const percentValue = (value * 100).toFixed(decimalPlaces)
    return `${percentValue}%`
}
