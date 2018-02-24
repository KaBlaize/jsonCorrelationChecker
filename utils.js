const {execSync} = require('child_process');
const readline = require('readline');
const fs = require('fs')

const objWalker = (obj, propList, callback) => {
    if (propList.length > 1) {
        const prop = propList.shift()
        return objWalker(obj[prop], propList, callback)
    } else {
        return callback(obj, propList[0])
    }
}
/**
 * read file
 */
exports.readJson = function (fileName) {
    var file = fs.readFileSync(fileName, 'utf8')
    return JSON.parse(file)
}

exports._ls = function () {
    fs.readdirSync('./').forEach(file => {
        if (file.endsWith('.json')) {
            console.log(file);
        }
    })
}
exports.reduceArrays = function (obj) {
    var keys = Object.keys(obj)
    for (var key of keys) {
        if (obj[key] instanceof Array) {
            obj[key] = [obj[key][0]]
        } else if (obj[key] instanceof Object) {
            exports.reduceArrays(obj[key])
        }
    }
}

var makeSkeletion = function (obj) {
    if (obj instanceof String || typeof(obj) == 'string') {
        obj = exports.readJson(obj)
    }
    var keys = Object.keys(obj)
    for (var key of keys) {
        var value = obj[key]
        if (value instanceof Array) {
            delete obj[key]
            if (value.length > 0) {
                value = value[0]
                obj[key + ":array"] = value
                makeSkeletion(value)
            }
        } else if (value instanceof Object) {
            makeSkeletion(value)
        }
    }
    return obj
}

exports.makeSkeletion = makeSkeletion

exports.writeJson = function (fileName, obj) {
    fs.writeFile(fileName, JSON.stringify(obj), function (err) {
        if (err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
}

exports.execRoutine = function (name) {
    const configFolder = './configs'
    console.debug('Reading config..')
    const {cmd, outputFileBase, modifiers} = exports.readJson(configFolder + '/' + name + '.json')
    console.debug('Downloading JSON ', outputFileBase)
    execSync(cmd + " hello")

    console.debug('Reading downloaded file')
    const response = exports.readJson(outputFileBase + '.json')
    const duplicate = (o) => {
        return JSON.parse(JSON.stringify(o))
    }
    const shortResponse = duplicate(response)
    exports.reduceArrays(shortResponse)
    const skeleton = makeSkeletion(duplicate(response))

    const transformedArray = {}

    if (modifiers instanceof Array) {
        for (var modifier of modifiers) {
            const source = objWalker(shortResponse, modifier.from, (obj, property) => {
                return obj[property]
            })

            objWalker(transformedArray, modifier.to, (obj, property) => {
                obj[property] = source
            })
        }
    }


    console.log('skeleton')
    console.log(skeleton)
    console.log('routine ' + name + ' finished')

    const responseDir = 'responses'
    if (!fs.existsSync(responseDir)) {
        fs.mkdirSync(`${responseDir}`)
    }
    exports.writeJson(`${responseDir}/${name}.json`, response)
    exports.writeJson(`${responseDir}/${name}.short.json`, shortResponse)
    exports.writeJson(`${responseDir}/${name}.skeleton.json`, skeleton)
    exports.writeJson(`${responseDir}/${name}.transformed.json`, transformedArray)

    console.log(`${responseDir} written in answers directory`)
    return {shortResponse, response, skeleton, transformed: transformedArray}
}

exports.lsConfig = function () {
    fs.readdir('configs', function (err, items) {
        console.log(items);

        for (var i = 0; i < items.length; i++) {
            console.log(`${i} : ${items[i]}`);
        }
    })
}

exports.runConfig = function (index) {
    fs.readdir('configs', function (err, items) {
        exports.execRoutine(items[index].replace('.json', ''))
    })
}
