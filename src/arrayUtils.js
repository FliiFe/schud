/*
 *  Compares two arrays for stric equality
 *
 * @param {Array} a
 * @param {Array} b
 */
const arrayCompare = (a, b) => {
    if (a.length - b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

const unique = a => [...new Set(a)]

module.exports = {unique, arrayCompare}
