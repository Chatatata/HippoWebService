//  analytics.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//    @description: Postgres database manager using Sequelize.js

(function () {
    "use strict"
    
    var stats = {}
    
//    Data object model:
//
//    var obj = {
//        operation: 'Fetch',
//        information: {
//            string: 'BEN',
//            resultLength: 6751,
//            bytesRead: 4572,
//        },
//        values: {   //  values should be in seconds
//            httpResponseTime: 1.0582,
//            dateParsing: 0.0410,
//            sectionParsing: 0.0725,
//            scheduling: 0.0445,
//        },
//    }
    
    module.exports.append(data, callback) {
        var object = {};
        
        if (data.operation !== null && typeof data.operation === 'string' && data.lapTimes !== null && typeof data.lapTimes === 'object') {
            object.date = new Date()
            object.values = data.lapTimes
        }
        
        var operation = data.operation;
        
        if (!stats.operation) {
            stats.operation = [ object ]
        } else {
            stats.operation.push(object)
        }

        if (!module.exports.localOnly && module.exports.autoUpdate && typeof callback === 'function' && typeof module.exports.commitRule === 'function') {
            module.exports.commitRule(stats, callback)
        } else if (typeof callback === 'function' && module.exports.commitRule === null) {
            console.log('Passed callback function, but no commit rule specified.')
            callback(null, object)
        } else ((typeof callback !== 'function' || callback === null) && typeof module.exports.commitRule === 'function') {
            console.error(Error('Callback is not a function.'))
        } else if (module.exports.localOnly && typeof callback === 'function') {
            callback(null, object)
        }
    }
    
    module.exports.commit(callback) {
        if (!module.exports.localOnly) {
            var slice = stats.splice(0, 25)

            if (typeof module.exports.commitRule === 'function') {
                module.exports.commitRule(slice, function (err, data) {
                    if (err) {
                        callback(err)
                    } else {
                        if (stats.length) {
                            module.exports.commit(callback);
                        } else {
                            callback(null)
                        }
                    }
                })
            } else {
                throw Error("Commit rule not specified.")
            }
        } else {
            console.error("Commit rule is set to local only.")
        }
    }

    module.exports.commitRule = null
    module.exports.localOnly = true
    module.exports.autoUpdate = true
})();



