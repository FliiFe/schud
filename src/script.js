const SteamControllerDevice = require('./src/hid.js')
const theme = require('./theme.js')

const dev = new SteamControllerDevice()
// dev.on('tpl_pos_x', s => console.log(s.tpl.pos.x))
// setInterval(_ => document.getElementById('hey').innerHTML = JSON.stringify(dev.state), 10)

const lctx = document.getElementById('lpad').getContext('2d')
const rctx = document.getElementById('rpad').getContext('2d')
const buttonpad = document.getElementById('buttonpad').getContext('2d')

const canvasSize = 200
const padCanvasSize = 200
const maxPointerRadius = 20
const previousStackSize = 60
const lPreviousStack = []
const rPreviousStack = []

const rawToCanvasCoord = x => Math.floor((x + (1 << 15)) / (1 << 16) * (canvasSize - 2 * maxPointerRadius)) + maxPointerRadius

document.getElementById('lpad').setAttribute('style', `top: ${theme.canvas_l.top}%; left: ${theme.canvas_l.left}%; width: ${theme.canvas_l.size}%;; transform: rotate(${theme.canvas_l.rotate}deg);`)
document.getElementById('rpad').setAttribute('style', `top: ${theme.canvas_r.top}%; right: ${theme.canvas_r.right}%; width: ${theme.canvas_r.size}%; transform: rotate(${theme.canvas_r.rotate}deg);`)
document.getElementById('buttonpad').setAttribute('style', `top: ${theme.canvas_buttons.top}%; right: ${theme.canvas_buttons.right}%; width: ${theme.canvas_buttons.size}%; transform: rotate(${theme.canvas_buttons.rotate}deg);`)

/**
 * Main logic to draw on canvas
 */
function refreshCanvas() {
    const lposx = rawToCanvasCoord(dev.state.tpl.pos.x)
    const lposy = rawToCanvasCoord(-dev.state.tpl.pos.y)
    const rposx = rawToCanvasCoord(dev.state.tpr.pos.x)
    const rposy = rawToCanvasCoord(-dev.state.tpr.pos.y)
    lctx.clearRect(0, 0, canvasSize, canvasSize)
    rctx.clearRect(0, 0, canvasSize, canvasSize)
    buttonpad.clearRect(0, 0, padCanvasSize, padCanvasSize)

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

    // Trackpad clicks
    if (dev.state.tpr.clicked) {
        trackpadClick(rctx)
    }
    if (dev.state.tpl.clicked) {
        trackpadClick(lctx)
    }

    // ABXY Buttons
    if (dev.state.buttons.a){
        drawA(buttonpad)
    }
    if (dev.state.buttons.y){
        drawY(buttonpad)
    }
    if (dev.state.buttons.x){
        drawX(buttonpad)
    }
    if (dev.state.buttons.b){
        drawB(buttonpad)
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
 * Draw the A button
 * @param {CanvasRenderingContext2D} - a 2D context to render with
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
 * @param {CanvasRenderingContext2D} - a 2D context to render with
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
 * @param {CanvasRenderingContext2D} - a 2D context to render with
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
 * @param {CanvasRenderingContext2D} - a 2D context to render with
 */
function drawB (pad) {
    pad.beginPath()
    pad.arc(143, 82, 27, 2 * Math.PI, false)
    pad.fillStyle = `rgba(255,255,255,${1})`
    pad.fill()
    pad.closePath()
}




refreshCanvas()
