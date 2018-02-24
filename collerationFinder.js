const utils = require('./utils')
const movements = Object.freeze({
    UP: 0,
    DOWN: 1,
    NEXT: 2,
    ABORT: 3
})

const types = Object.freeze({
    ARRAY: 0,
    OBJECT: 1,
    DATA: 2
})

const skipPatterns = [
    /.+lib\d$/,
    /.+Lib\d$/,
    /prix/,
    /art_libuc/,
    /price/
]


const walker = (obj, callback, path = []) => {
    if (obj === null || obj === undefined) {
        return
    }
    let keys = Object.keys(obj)
    for (let key of keys) {
        path.push(key)
        // console.log(`walking path: ${path.join('/')}`)
        const value = obj[key]
        let type
        if (value instanceof Array) { type = types.ARRAY }
        else if (value instanceof Object) { type = types.OBJECT }
        // else if (value instanceof String || typeof(value) === 'string') { type = types.DATA }
        // else if (Number(value) === value && value % 1 === 0) { type = types.DATA }
        // else if (Number(value) === value && value % 1 !== 0) { type = types.DATA }

        const movement = callback(path, type, value)
        switch (movement) {
            case movements.DOWN:
                walker(value, callback, path)
                break
            case movements.NEXT:
            case movements.UP:
                if (type !== types.ARRAY && type !== types.OBJECT) {
                    console.warn(`next movement is not available for type ${type} at value ${value}`)
                }
                break
            case movements.ABORT:
                return
        }

        path.pop()
    }
}

const arrayWalker = (object, callback) => {
    walker(object, (path, type, value) => {
        if (type === types.OBJECT) {
            return movements.DOWN
        } else if (type === types.ARRAY) {
            if (value.length === 0)  console.warn(`EMPTY array at path: ${path.join('/')}`)
            else callback(path, value)
            return movements.UP
        }
    })
}


const gatherPathValuesForAllObject = (objects) => {

    const pathValues = []
    const addPathValue = (name, path, key, value) => pathValues.push({name, path: path.join('/') + '/' + key, value})

    const shouldSkipKey = (key) =>
        skipPatterns.reduce((previousValue, currentValue) => previousValue || currentValue.test(key), false)

    const gatherPathValues = (name, object) => arrayWalker(object, (path, array) => {
        const keys = Object.keys(array[0])
        for (let key of keys) {
            if (shouldSkipKey(key)) { continue }
            const elementValuesForKey = []
            for (let element of array)  elementValuesForKey.push(element[key])
            addPathValue(name, path, key, new Set(elementValuesForKey))
        }
    })

    const objectNames = Object.keys(objects)
    for (let i = 0; i < objectNames.length; i++) {
        const name = objectNames[i];
        const object = objects[name]
        gatherPathValues(name, object)
    }

    return pathValues
}

exports.findCorrelation = function (objects, minMatch = 1, maxMatch = Infinity) {
    const pathValues = gatherPathValuesForAllObject(objects)
    // console.log(pathValues.map(p => p.name + ' ' + p.path))
    let correlations = []
    const intersection = (a, b) => new Set([...a].filter(x => b.has(x)));
    for (let i = 0; i < pathValues.length; i++) {
        const firstValues = pathValues[i]
        for (let j = i + 1; j < pathValues.length; j++) {
            const secondValues = pathValues[j]
            const nbrOfMatches = intersection(firstValues.value, secondValues.value).size
            if (nbrOfMatches >= minMatch && nbrOfMatches <= maxMatch) {
                correlations.push({
                    matches: nbrOfMatches,
                    paths: [
                        `${firstValues.name}:${firstValues.path}`,
                        `${secondValues.name}:${secondValues.path}`
                    ]
                })


            }
        }
    }
    correlations = correlations.sort((a, b) => b.matches - a.matches)
    console.log('\n\n\nBEGIN correlations')
    correlations.forEach(c => console.log(`\t${c.matches}\t ${c.paths[0]} ${c.paths[1]}`))
    console.log('END correlations\n\n')
    return correlations
}

exports.groupCorrelations = function (correlations) {

    const correlationByFolder = {}
    for (let correlation of correlations) {
        const makeFolder = str => str.substring(0, str.lastIndexOf('/'))
        const makeSelector = str => str.substring(str.lastIndexOf('/') + 1, str.length)
        const folder1 = makeFolder(correlation.paths[0])
        const selector1 = makeSelector(correlation.paths[0])
        const folder2 = makeFolder(correlation.paths[1])
        const selector2 = makeSelector(correlation.paths[1])
        const saveCorrelationToFolder = (correlation, folder) => {
            if (correlationByFolder[folder] === undefined) {
                correlationByFolder[folder] = []
            }
            correlationByFolder[folder].push(correlation)
        }
        saveCorrelationToFolder({...correlation, paths: [selector1 + "\t = \t" + correlation.paths[1]]}, folder1)
        saveCorrelationToFolder({...correlation, paths: [selector2 + "\t = \t" + correlation.paths[0]]}, folder2)
    }
    return correlationByFolder
}

exports.getArrayLenghts = function (objects) {
    const objectNames = Object.keys(objects)
    let arrayLengths = []
    for (let i = 0; i < objectNames.length; i++) {
        const name = objectNames[i];
        const object = objects[name]
        arrayWalker(object, (path, value) => {
            arrayLengths.push({
                name, path: path.join('/'), length: value.length
            })
        })
    }
    arrayLengths = arrayLengths.sort((a, b) => b.length - a.length)

    console.log('\n\nARRAY LENGHTS\n\n')
    arrayLengths.forEach(o => {
        console.log(`\t${o.length}:\t${o.name}: ${o.path}`)
    })
    console.log('\n\nEND ARRAY LENGHTS\n\n')
}

exports.test = function (objects, minMatch = 1, maxMatch = Infinity) {
    const correlations = exports.findCorrelation(objects, minMatch, maxMatch)
    const correlationByFolder = exports.groupCorrelations(correlations)


    for (let key of Object.keys(correlationByFolder)) {
        console.log(`\n\n##${key}\n`)
        const c = correlationByFolder[key].sort((a, b) => b.matches - a.matches)
        for (let x of c) {
            console.log(`\t[${x.matches}]\t ${x.paths[0]}`)
        }
    }
}


const products = utils.readJson('responses/product.json')
const promos = utils.readJson('responses/promo.json')

// exports.test({products, promos}, 15, 500)
// exports.test({products, promos}, 500)
exports.test({products, promos}, 11, 500)
// exports.findCorrelation({products})

exports.getArrayLenghts({products, promos})