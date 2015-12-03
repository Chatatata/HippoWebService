//  utility.js
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Command line utilities

(function () {
    "use strict"
    
    module.exports.process = function () {
        return process;
    }
    
    //
    var process = require("child_process");
    
    //	Console commands listing helper
    var table = require("text-table");
    
    const cleanSheet = "printf '\\33c\\e[3J'";
    
    module.exports.flushConsole = function (callback) {
        process.exec(cleanSheet, function(err, stdout, stderr) {
            if (err != null) {
                console.error(stderr);
                
                return callback(err);
            } else {
                console.log(stdout);
                
                return callback();
            }
        });
    }
}());

 
 
 
 
 
 