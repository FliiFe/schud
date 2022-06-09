const SteamControllerDevice = require('./src/hid.js')
const theme = require('./theme.js')

const dev = new SteamControllerDevice()
// dev.on('tpl_pos_x', s => console.log(s.tpl.pos.x))
// setInterval(_ => document.getElementById('hey').innerHTML = JSON.stringify(dev.state), 10)

// Canva
const lctx = document.getElementById('lpad').getContext('2d')
const rctx = document.getElementById('rpad').getContext('2d')
const buttonpad = document.getElementById('buttonpad').getContext('2d')
const rtriggerctx = document.getElementById('rtrigger').getContext('2d')
const ltriggerctx = document.getElementById('ltrigger').getContext('2d')
const lbumperctx = document.getElementById('lbumper').getContext('2d')
const rbumperctx = document.getElementById('rbumper').getContext('2d')
const stickctx = document.getElementById('stick').getContext('2d')

// Vars
const canvasSize = 200
const padCanvasSize = 200
const triggerCanvasSize = 150
const stickCanvasSize = 150
const rbCanvasSize = 190
const maxPointerRadius = 20
const maxStickRadius = 40
const previousStackSize = 60
const lPreviousStack = []
const rPreviousStack = []

// Steam controller raw value to canvas coordinate conversions
const rawToCanvasCoord = x => Math.floor((x + (1 << 15)) / (1 << 16) * (canvasSize - 2 * maxPointerRadius)) + maxPointerRadius
const rawToStickCoord = x => Math.floor((x + (1 << 15)) / (1 << 16) * (stickCanvasSize - 2 * maxStickRadius)) + maxStickRadius
const triggerValueToCanvasCoord = value => value * (triggerCanvasSize - 30) / 255 + 30

// Transform canva based on theme.js
document.getElementById('lpad').setAttribute('style', `top: ${theme.canvas_l.top}%; left: ${theme.canvas_l.left}%; width: ${theme.canvas_l.size}%;; transform: rotate(${theme.canvas_l.rotate}deg);`)
document.getElementById('rpad').setAttribute('style', `top: ${theme.canvas_r.top}%; right: ${theme.canvas_r.right}%; width: ${theme.canvas_r.size}%; transform: rotate(${theme.canvas_r.rotate}deg);`)
document.getElementById('buttonpad').setAttribute('style', `top: ${theme.canvas_buttons.top}%; right: ${theme.canvas_buttons.right}%; width: ${theme.canvas_buttons.size}%; transform: rotate(${theme.canvas_buttons.rotate}deg);`)
document.getElementById('rtrigger').setAttribute('style', `top: ${theme.canvas_rtrigger.top}%; right: ${theme.canvas_rtrigger.right}%; width: ${theme.canvas_rtrigger.size}%; transform: rotate(${theme.canvas_rtrigger.rotate}deg);`)
document.getElementById('ltrigger').setAttribute('style', `top: ${theme.canvas_ltrigger.top}%; left: ${theme.canvas_ltrigger.left}%; width: ${theme.canvas_ltrigger.size}%; transform: rotate(${theme.canvas_ltrigger.rotate}deg);`)
document.getElementById('lbumper').setAttribute('style', `top: ${theme.canvas_lbumper.top}%; left: ${theme.canvas_lbumper.left}%; width: ${theme.canvas_lbumper.size}%; transform: rotate(${theme.canvas_lbumper.rotate}deg);`)
document.getElementById('rbumper').setAttribute('style', `top: ${theme.canvas_rbumper.top}%; right: ${theme.canvas_rbumper.right}%; width: ${theme.canvas_rbumper.size}%; transform: rotate(${theme.canvas_rbumper.rotate}deg);`)
document.getElementById('stick').setAttribute('style', `top: ${theme.canvas_stick.top}%; left: ${theme.canvas_stick.left}%; width: ${theme.canvas_stick.size}%; transform: rotate(${theme.canvas_stick.rotate}deg);`)


/**
 * Main logic to draw on canvas
 */
function refreshCanvas() {
    const lposx = rawToCanvasCoord(dev.state.tpl.pos.x)
    const lposy = rawToCanvasCoord(-dev.state.tpl.pos.y)
    const rposx = rawToCanvasCoord(dev.state.tpr.pos.x)
    const rposy = rawToCanvasCoord(-dev.state.tpr.pos.y)
    const rtposx = triggerValueToCanvasCoord(dev.state.triggers.right.value)
    const ltposx = triggerValueToCanvasCoord(Math.abs(dev.state.triggers.left.value - 255))
    const stickx = rawToStickCoord(dev.state.joystick.pos.x)
    const sticky = rawToStickCoord(-dev.state.joystick.pos.y)

    // Clear canvases
    lctx.clearRect(0, 0, canvasSize, canvasSize)
    rctx.clearRect(0, 0, canvasSize, canvasSize)
    buttonpad.clearRect(0, 0, padCanvasSize, padCanvasSize)
    rtriggerctx.clearRect(0, 0, canvasSize, canvasSize)
    ltriggerctx.clearRect(0, 0, canvasSize, canvasSize)
    lbumperctx.clearRect(0, 0, canvasSize, canvasSize)
    rbumperctx.clearRect(0, 0, canvasSize, canvasSize)
    stickctx.clearRect(0, 0, canvasSize, canvasSize)

    // Touchpad touches
    if (dev.state.tpl.touched) {
        while (lPreviousStack.length < previousStackSize) lPreviousStack.push([lposx, lposy])
    }
    if (dev.state.tpr.touched) {
        while (rPreviousStack.length < previousStackSize) rPreviousStack.push([rposx, rposy])
    }
    lPreviousStack.shift()
    rPreviousStack.shift()
    for (let i = 0; i < lPreviousStack.length; i++) {
        let [x, y] = lPreviousStack[i]
        drawPointer(lctx, x, y, (i + 1) / lPreviousStack.length, i / previousStackSize * maxPointerRadius)
    }
    for (let i = 0; i < rPreviousStack.length; i++) {
        let [x, y] = rPreviousStack[i]
        drawPointer(rctx, x, y, (i + 1) / rPreviousStack.length, i / previousStackSize * maxPointerRadius)
    }

    // Stick
    if (dev.state.joystick.pos.x || dev.state.joystick.pos.y) {
        drawStick(stickctx, stickx, sticky)
    }
    if (dev.state.joystick.clicked) {
        stickClick(stickctx)
    }

    // Trackpad clicks
    if (dev.state.tpr.clicked) {
        trackpadClick(rctx)
    }
    if (dev.state.tpl.clicked) {
        trackpadClick(lctx)
    }

    // ABXY Buttons
    if (dev.state.buttons.a) {
        drawA(buttonpad)
    }
    if (dev.state.buttons.y) {
        drawY(buttonpad)
    }
    if (dev.state.buttons.x) {
        drawX(buttonpad)
    }
    if (dev.state.buttons.b) {
        drawB(buttonpad)
    }

    // Triggers
    if (dev.state.triggers.right.value > 0) {
        drawRightT(rtriggerctx, rtposx)
    }
    if (dev.state.triggers.left.value > 0) {
        drawLeftT(ltriggerctx, ltposx)
    }
    if (dev.state.triggers.right.fullpull) {
        drawRightFull(rtriggerctx)
    }
    if (dev.state.triggers.left.fullpull) {
        drawLeftFull(ltriggerctx)
    }

    // Bumpers
    if (dev.state.buttons.lb) {
        drawLB(lbumperctx)
    }
    if (dev.state.buttons.rb) {
        drawRB(rbumperctx)
    }


    // Refresh canvas
    window.requestAnimationFrame(refreshCanvas)
}

/**
 * trackpadClick
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas corresponding to the correct trackpad
 */
function trackpadClick(ctx) {
    ctx.beginPath()
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 3, 0, 2 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.closePath()

    ctx.beginPath()
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2 - 5, 0, 2 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.closePath()
}

/**
 * Draw a pointer onto the given context
 *
 * @param {CanvasRenderingContext2D} ctx - A 2d context to render with
 * @param {int} x - x coordinate
 * @param {int} y - y coordinate
 * @param {float} o - a float between 0 and 1 for opacity
 * @param {int} r - the radius of the pointer
 */
function drawPointer(ctx, x, y, o = 1, r = 20) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI, false)
    ctx.fillStyle = `rgba(255,255,255,${o})`
    ctx.fill()
    ctx.closePath()
}


/**
 * 
 * @param {CanvasRenderingContext2D} stickctx - a 2D context to render with
 * @param {int} x - x coordinate
 * @param {int} y = y coordinate
 */
function drawStick (ctx, x, y) {
    ctx.beginPath()
    ctx.arc(x, y, 40, 0, 2 * Math.PI, false)
    ctx.fillStyle = `rgba(255,255,255,${1})`
    ctx.fill()
    ctx.closePath()

}
/**
 * 
 * @param {CanvasRenderingContext2D} stickctx - a 2D context to render with
 */
function stickClick (ctx) {
    ctx.beginPath()
    ctx.arc(stickCanvasSize / 2, stickCanvasSize / 2, stickCanvasSize / 2.3, 0, 2 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.closePath()

}

/**
 * Draw the A button
 * @param {CanvasRenderingContext2D} pad - a 2D context to render with
 */
function drawA (pad) {
    pad.beginPath()
    pad.arc(87, 141, 27, 2 * Math.PI, false)
    pad.fillStyle = `rgba(255,255,255,${1})`
    pad.fill()
    pad.closePath()
}

/**
 * Draw the Y button
 * @param {CanvasRenderingContext2D} pad - a 2D context to render with
 */
function drawY (pad) {
    pad.beginPath()
    pad.arc(87, 29, 27, 2 * Math.PI, false)
    pad.fillStyle = `rgba(255,255,255,${1})`
    pad.fill()
    pad.closePath()
}

/**
 * Draw the X button
 * @param {CanvasRenderingContext2D} pad - a 2D context to render with
 */
function drawX (pad) {
    pad.beginPath()
    pad.arc(32, 82, 27, 2 * Math.PI, false)
    pad.fillStyle = `rgba(255,255,255,${1})`
    pad.fill()
    pad.closePath()
}

/**
 * Draw the B button
 * @param {CanvasRenderingContext2D} pad - a 2D context to render with
 */
function drawB (pad) {
    pad.beginPath()
    pad.arc(143, 82, 27, 2 * Math.PI, false)
    pad.fillStyle = `rgba(255,255,255,${1})`
    pad.fill()
    pad.closePath()
}

/**
 * Draw right trigger
 * @param {CanvasRenderingContext2D} ctx - a 2D context to render with
 * @param {int} x - x value of rectangle
 */
function drawRightT (ctx, x) {
    ctx.beginPath()
    ctx.fillRect(0, 12, x, 35)
    ctx.fillStyle = `rgba(255,255,255,${1})`
    ctx.fill()
    ctx.closePath()
}

/**
 * Draw left trigger
 * @param {CanvasRenderingContext2D} ctx - a 2D context to render with
 * @param {int} x - x value of rectangle
 */
function drawLeftT (ctx, x) {
    ctx.beginPath()
    ctx.fillRect(x, 12, 200, 35)
    ctx.fillStyle = `rgba(255,255,255,${1})`
    ctx.fill()
    ctx.closePath()
}

/**
 * Draw right trigger full pull
 * @param {CanvasRenderingContext2D} ctx - a 2D context to render with
 */
function drawRightFull (ctx) {
    ctx.beginPath()
    ctx.arc(170, 30, 30, 2 * Math.PI, false)
    ctx.fillStyle = `rgba(255,255,255,${1})`
    ctx.fill()
    ctx.closePath()
}

/**
 * Draw left trigger full pull
 * @param {CanvasRenderingContext2D} ctx - a 2D context to render with
 */
function drawLeftFull (ctx) {
    ctx.beginPath()
    ctx.arc(30, 30, 30, 2 * Math.PI, false)
    ctx.fillStyle = `rgba(255,255,255,${1})`
    ctx.fill()
    ctx.closePath()
}

/**
 * Draw left bumper
 * @param {CanvasRenderingContext2D} ctx - a 2D context to render with
 */
function drawLB (ctx) {
    ctx.beginPath()
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 3, 0.40, 0.75 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.closePath()

    ctx.beginPath()
    ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2 - 5, 0.25, 0.8 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.closePath()
}

/**
 * Draw right bumper
 * @param {CanvasRenderingContext2D} ctx - a 2D context to render with
 */
function drawRB (ctx) {
    ctx.beginPath()
    ctx.arc(rbCanvasSize / 2, rbCanvasSize / 2, rbCanvasSize / 3, 0.75, 0.88 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.closePath()

    ctx.beginPath()
    ctx.arc(rbCanvasSize / 2, rbCanvasSize / 2, rbCanvasSize / 2 - 5, 0.55, 0.93 * Math.PI)
    ctx.strokeStyle = 'white'
    ctx.stroke()
    ctx.lineWidth = 5
    ctx.closePath()
}




refreshCanvas()
