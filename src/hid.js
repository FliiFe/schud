const HID = require('node-hid')
const EventEmitter = require('events')
const {arrayCompare, unique} = require('./arrayUtils.js')

/**
 *  Get a list of events to dispatch given an initial state and a final state.
 *  The returned list corresponds to paths of changed values. This function is
 *  only meant to receive two states with identical structure.
 *
 *  @param {Object} is - Initial state
 *  @param {Object} fs - Final state
 *  @param {string} p - current path, internal use only
 *  @return {string[]} - The list of events to be emitted
 */
function eventListFromStateDiff(is, fs, p = '') {
    let events = []
    for (let k in is) {
        let newpath = p === '' ? k : `${p}_${k}`
        if (typeof is[k] === 'object')
            events = events.concat(eventListFromStateDiff(is[k], fs[k], newpath))
        else if (is[k] !== fs[k])
            events.push(newpath)
    }
    return events
}

class SteamControllerDevice extends EventEmitter {
    constructor(steamControllerPath) {
        super()
        const matchingDevices = HID.devices()
            .filter(device => device.manufacturer.match(/Valve/i) && device.usagePage > 1)
        if (!matchingDevices.length) {
            console.log('Could not find Steam Controller')
            process.exit(1)
        }
        this.steamControllerPath = steamControllerPath || matchingDevices[0].path

        this.steamController = new HID.HID(this.steamControllerPath)
        this.steamController.on('data', d => this.dispatch(d))
        this.state = {
            tpr: {
                touched: false,
                clicked: false,
                pos: {
                    x: 0,
                    y: 0
                }
            },
            tpl: {
                touched: false,
                clicked: false,
                pos: {
                    x: 0,
                    y: 0
                }
            },
            buttons: {
                a: false,
                b: false,
                x: false,
                y: false,
                start: false,
                select: false,
                steam: false,
                br: false,
                bl: false,
                rb: false,
                lb: false
            },
            triggers: {
                right: {
                    value: 0,
                    fullpull: false
                },
                left: {
                    value: 0,
                    fullpull: false
                }
            },
            joystick: {
                pos: {
                    x: 0,
                    y: 0,
                },
                clicked: false
            },
            dpad: {
                up: false,
                down: false,
                right: false,
                left: false
            }
        }
    }

    /**
     *  Dispatches the data event into a steam controller event
     *
     *  @param {Buffer} event - the raw hid event
     */
    dispatch(event) {
        const byteAr = Array.from(event)
        if (!arrayCompare(byteAr.slice(0, 4), [1, 0, 1, 60])) {
            // TODO: check that it is a heartbeat
            this.emit('heartbeat', this.state)
            return
        }
        const [abxy_rlbt, dpad_bl, tp, lt, rt] = byteAr.slice(8, 13)
        const rtFullpull = Boolean(abxy_rlbt & 1)
        const ltFullpull = Boolean(abxy_rlbt >> 1 & 1)
        const rb = Boolean(abxy_rlbt >> 2 & 1)
        const lb = Boolean(abxy_rlbt >> 3 & 1)
        const yPressed = Boolean(abxy_rlbt >> 4 & 1)
        const bPressed = Boolean(abxy_rlbt >> 5 & 1)
        const xPressed = Boolean(abxy_rlbt >> 6 & 1)
        const aPressed = Boolean(abxy_rlbt >> 7 & 1)
        const rTrackpadTouched = Boolean(tp >> 4 & 1)
        const lTrackpadTouched = Boolean(tp >> 3 & 1)
        const lTrackpadClicked = Boolean(tp >> 1 & lTrackpadTouched)
        const rTrackpadClicked = Boolean(tp >> 2 & rTrackpadTouched)
        const joystickClicked = Boolean(tp >> 1 & tp >> 6 & 1)
        const steamPressed = Boolean(dpad_bl >> 5 & 1)
        const startPressed = Boolean(dpad_bl >> 6 & 1)
        const selectPressed = Boolean(dpad_bl >> 4 & 1)
        const dpadUp = Boolean(dpad_bl & 1)
        const dpadDown = Boolean(dpad_bl >> 3 & 1)
        const dpadLeft = Boolean(dpad_bl >> 2 & 1)
        const dpadRight = Boolean(dpad_bl >> 1 & 1)
        const bl = Boolean(dpad_bl >> 7 & 1)
        const br = Boolean(tp & 1)
        const newState = {
            tpr: {
                touched: rTrackpadTouched,
                clicked: rTrackpadClicked,
                pos: {
                    x: 0,
                    y: 0
                }
            },
            tpl: {
                touched: lTrackpadTouched,
                clicked: lTrackpadClicked,
                pos: {
                    x: 0,
                    y: 0
                }
            },
            buttons: {
                a: aPressed,
                b: bPressed,
                x: xPressed,
                y: yPressed,
                start: startPressed,
                select: selectPressed,
                steam: steamPressed,
                br: br,
                bl: bl,
                rb: rb,
                lb: lb
            },
            triggers: {
                right: {
                    value: rt,
                    fullpull: rtFullpull
                },
                left: {
                    value: lt,
                    fullpull: ltFullpull
                }
            },
            joystick: {
                pos: {
                    x: 0,
                    y: 0,
                },
                clicked: joystickClicked
            },
            dpad: {
                up: dpadUp,
                down: dpadDown,
                right: dpadRight,
                left: dpadLeft
            }
        }
        const lpadcoord = byteAr.slice(16, 20)

        // The axis of the pad are mapped to the range [-2**15, 2**15]
        let lpadx = (lpadcoord[1] << 8) + lpadcoord[0]
        lpadx = lpadx < 1 << 15 ? lpadx : lpadx - (1 << 16)

        let lpady = (lpadcoord[3] << 8) + lpadcoord[2]
        lpady = lpady < 1 << 15 ? lpady : lpady - (1 << 16)


        let joystickx = lpadx
        let joysticky = lpady
        joystickx = lTrackpadTouched ? 0 /* this.state.joystick.pos.x */ : joystickx
        joysticky = lTrackpadTouched ? 0 /* this.state.joystick.pos.y */ : joysticky

        lpadx = lTrackpadTouched ? lpadx : 0 //this.state.tpl.pos.x
        lpady = lTrackpadTouched ? lpady : 0 //this.state.tpl.pos.y

        newState.tpl.pos = {x: lpadx, y: lpady}
        newState.joystick.pos = {
            x: joystickx,
            y: joysticky
        }

        const rpadcoord = byteAr.slice(20, 24)
        let rpadx = (rpadcoord[1] << 8) + rpadcoord[0]
        rpadx = rpadx < 1 << 15 ? rpadx : rpadx - (1 << 16)

        let rpady = (rpadcoord[3] << 8) + rpadcoord[2]
        rpady = rpady < 1 << 15 ? rpady : rpady - (1 << 16)

        newState.tpr.pos = {x: rpadx, y: rpady}

        let events = eventListFromStateDiff(this.state, newState)
        let newevents = []
        events.forEach(e => {
            e.split('_').forEach((_, i, a) =>
                newevents.push(a.slice(0, i + 1).join('_')))
        })
        events = unique(newevents)
        this.state = newState
        events.forEach(en => {
            this.emit(en, this.state)
        })
        // console.log(lTrackpadTouched)
    }
}

module.exports = SteamControllerDevice
