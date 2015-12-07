//  analytics.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//    @description: Analytics manager

(function () {
    'use strict'

    var now         = require('performance-now')
    var uuid        = require('uuid')

    var Sync        = require('./sync')

    var stats = []

//    Basic usage
//
//
//    var Analytics = require('analytics')
//
//    var information = {
//        bytesRead: null,
//        statusCode: null,
//        argumentString: 'BLG'
//    }
//
//    var token = Analytics.getToken('fetcher', information)
//
//    setTimeout(function () {
//        token.information.bytesRead = 5285
//        token.information.statusCode = 200
//
//        var lapInformation = 'HTTP Request'
//
//        token.lap(lapInformation)
//
//        token.finalize()
//        Analytics.commit()
//    }, 1234)

    class PerformanceToken {
        constructor(moduleName, information) {
            if (information !== null && typeof moduleName === 'string') {
                this.module = moduleName
                this.information = information
                this.dateCreated = new Date()
                this.uuid = uuid.v1()
                this.reference = now()
                this.finalized = false
                this.unnamedLaps = 0

                stats.push(this)
            }
        }

        lap(information) {
            if (information === null) {
                information = "unnamedLap_" + this.unnamedLaps++
            }

            if (this.lapTimes === null) {
                this.lapTimes = []
            }

            this.lapTimes.push({
                description: information,
                time: now() - this.reference,
            })

            this.reference = this.lapTimes[this.lapTimes.length - 1].time
        }

        finalize(callback) {
            if (!this.finalized) {
                this.finalized = true

                if (module.exports.autoUpdate && !module.exports.localOnly) {
                    module.exports.commit(stats, callback)
                }
            }

            throw Error('Performance token is already finalized')
        }
    }

    module.exports.getToken = function (moduleName, information) {
        stats.forEach(function (element) {
            if (element.module === moduleName && element.information = information) {
                return element
            } else {
                return new PerformanceToken(moduleName, information)
            }
        })
    }

    module.exports.commit = function (callback) {
        if (typeof module.exports.commitRule === 'function') {
            if (!module.exports.localOnly) {
                return module.exports.commitRule(stats, callback)
            } else {
                throw Error('Local only specified, attempted to commit.')
            }
        } else {
            throw Error('Commit rule is undefined or not a function: ' + typeof module.exports.commitRule)
        }
    }

    module.exports.localOnly = true
    module.exports.autoUpdate = true
})();



