//  schedule.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Schedule endpoints

(function () {
    "use strict"
    
    var Sync = require("../dynamodb/sync");
    
    module.exports.routes = [];
    
    module.exports.routes.push({
        method: "GET",
        path: "/crn/{string}",
        handler: function (request, reply) {   
            console.log("Requested crn: " + request.params.string);
            
            Sync.get(request.params.string, function (err, data) {
                if (err) {
//                    reply(err)
                    console.log(err)
                } 
                else {
                    reply(data)
                }
            })
        }
    });
    
    module.exports.routes.push({
        method: "GET",
        path: "/schedule/{string}",
        handler: function (request, reply) {
            resolveRequest(request.params.string)
            .then(function (results) {
                reply(results);
            })
        }
    });
    
    
    
//    function resolveRequest(string) {
//        if (string.length == 5) {
//            resolveCRN(string)
//            .then(function (results) {
//                return Q.resolve(results);
//            })
//            .catch(function (error) {
//                return resolveCourse(string)
//            })
//            .then(function (results) {
//                //  Result(s) found.
//            })
//            .catch(function (error) {
//                return Elephant.Section().findAll({
//                    where: {
//                        $or: {
//                            [{ instructor: string }, { course.title: string }],
//                        },
//                    },
//                });
//            })
//        }
//    }
//    
//    function resolveCRN(string) {
//        const value = parseInt(string);
//        
//        if (value != NaN) {
//            return Elephant.Section().findAll({
//                where: { crn: value }
//            });
//        } else {
//            Q.reject(Error("5 character string is not valid CRN."));
//        }
//    }
//    
//    function resolveCourse(string) {
//        if (string.length == 3) {
//            
//        }
//    }
}());
