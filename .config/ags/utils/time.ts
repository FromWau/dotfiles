declare global {
  interface Number {
    readonly seconds: number
    readonly minutes: number
    readonly hours: number
    readonly days: number
  }
}

Object.defineProperties(Number.prototype, {
  milliseconds: {
    get() {
      return this.valueOf()
    },
  },
  seconds: {
    get() {
      return this.valueOf() * 1000
    },
  },
  minutes: {
    get() {
      return this.valueOf() * 60 * 1000
    },
  },
  hours: {
    get() {
      return this.valueOf() * 60 * 60 * 1000
    },
  },
  days: {
    get() {
      return this.valueOf() * 24 * 60 * 60 * 1000
    },
  },
})

export {}
