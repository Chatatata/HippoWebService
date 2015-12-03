//  main.js
//
//  ECMAScript 6, conforms to ECMA 2015 Javascript Standards.
//
//  Written by Buğra Ekuklu, The Digital Warehouse. Copyright 2015.
//  thedigitalwarehouse.com
//
//	@description: Hippo back-end server implementation
//  
//  "use strict"; over the project due to ES6-dependent architecture!

"use strict"                                //  ES6

var fs = require("fs");

//fs.chownSync("./etc", 777);
//var build = 0;
//try {
//    build  = fs.readFileSync("./etc/buildInfo.json");
//} catch (err) {
//    build = fs.writeFileSync("./etc/buildInfo.json", "{\n    \"buildCount\" = \"0\"\n}", { flag: "w" });
//} finally {
//    build = parseInt(JSON.parse(build).buildCount);
//}

var moment = require("moment");             //	Timing classes, moment.js
var now = require("performance-now");       //	Benchmarking, performance measuring
var table = require("text-table");          //	Console commands listing helper
var assert = require('assert');             //	C type assertion test
var argv = require("yargs").argv;           //	Run argument vector parser
var Q = require("q");                       //  kriskowal/Q's Promises/A+ implementation

var Sync, Elephant;

if (argv._ == "sql") {
    Sync = require("./sql/sync");           //  Root server schedule synchronization subroutine, Sequelize.js kernel
    Elephant = require("./sql/elephant");   //  ORM assistant
} else {
    Sync = require("./dynamodb/sync");      //  Root server schedule synchronization subroutine, AWS DynamoDB kernel
}
var Enrollment = require("./enrollment");   //  Root server account manager subroutine
var Routes = require("./routes");        //  Main routes controller
var Analytics = require("./analytics");  //  Analytics
var Token = Analytics.register("MainExecution");
        
var Util = require("./utility");            //  Utilities

//	Main function execution

var debug = true;

Util.flushConsole(function (err) {
    if (err) console.error(err);
    
        if (argv._ == "cbm") {
        console.log("[DEBUG: Entered 'cbm' debug mode!]");
        Sync.debug = true;
    }

    console.log(table([
        [ "     AWS", "Hippo Web Server", "v 1.1.0, build ()" ],
        [ "" ],
        [ "" ],
        [ "     COMMAND", "DESCRIPTION", "PARAMETERS (?: optional)" ],
        [ "" ],
        [ "  ┌┬ DATABASE MANAGEMENT"],
        [ "  │├┬ build", "Create tables" ],
        [ "  ││├ destroy", "Delete tables" ],
        [ "  ││├ renew", "Renew tables and re-sync", "{string}?: Particular code" ],
        [ "  ││├ get", "Get an item with '%crn'", "{crn}: Identifier" ],
        [ "  ││├ query", "Make a query with JSON", "{json}: Query JSON" ],
        [ "  ││├ count", "Get the number of entries" ],
        [ "  ││└ list", "List all tables on AWS DynamoDB" ],
        [ "  │├ qtime", "Get off and on timestamps" ],
        [ "  │└ stats", "Show stats" ],
        [ "  │" ],
        [ "  ├┬ AUTHENTICATION"],
        [ "  │├ auth", "Authenticate to server", "id password PIN" ],
        [ "  │└ newacc", "Create a new account" ],
        [ "  │" ],
        [ "  ├┬ BENCHMARKING"],
        [ "  │├ _fetch", "Measure root server sync HTTP requests" ],
        [ "  │└ _database", "Measure database ORM with dummy raw data" ],
        [ "  │" ],
        [ "  ├┬ DEBUGGING"],
        [ "  │└ debug", "Switch debug mode" ],
        [ "  │" ],
        [ "  └ quit", "Quit" ]
    ]));
    console.log("\n\nHippo Web Server Console:");

    Routes.start();

    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", function() {
        var chunk = process.stdin.read();

        if (chunk !== null) {
            var argv = chunk.split(" ");

            switch (argv[0].trim()) {
                case "build":
                    return Sync.build(function (err, result) {
                        if (err) console.error(err);
                        else if (debug) console.log(result);

                        if (!err) console.log(new Date() + ": Successfully built.");
                    });

                case "destroy":
                    return Sync.destroy(function (err, result) {
                        if (err) console.error(err);
                        else if (debug) console.log(result);
                        
                        if (!err) console.log(new Date() + ": Successfully destroyed.");
                    });

                case "renew":
                    return Sync.renew(function (err) {
                        if (err) console.error(err);
                        else console.log(new Date() + ": Successfully renewed.");
                    });

                case "qtime":
                    return Sync.qtime();

                case "stats":
                    return Sync.stats();

                case "get":
                    return Sync.get(argv[1].trim(), function (err, results) {
                        if (err) console.error(err);
                        else if (debug) console.log(results);
                    });

                case "query":
                    return Sync.query();

                case "count":
                    return Sync.count(function (err, result) {
                        if (err) console.error(err);
                        else console.log("Number of items: " + result.Table.ItemCount);
                    });


                case "list":
                    return Sync.list(function (err, result) {
                        if (err) console.error(err);
                        else console.log(result);
                    });

                case "_fetch":
                    return Sync.test.fetch(function (err, result, time) {
                        if (err) console.error(err);
                        else console.log(result, time);
                    });

                case "debug":
                    debug = !debug;
                    return;

                case "quit":
                    return process.exit();
            }
        }
    });
})










//console.log(table([
//        [ "AWS", "Hippo Web Server", "v 1.0.0" ],
//        [ "" ],
//        [ "" ],
//        [ "     COMMAND", "DESCRIPTION", "PARAMETERS (?: optional)" ],
//        [ "" ],
//        [ "  ┌┬ DATABASE MANAGEMENT"],
//        [ "  │├┬ build", "Builds ORM structure (aka Sequelize.sync())" ],
//        [ "  ││├ destroy", "Removes all tables from SQL" ],
//        [ "  ││├ renew", "Renew database and sync timers" ],
//        [ "  ││└ fpartial", "Force partial sync", "-all?: Whole partial sync" ],
//        [ "  │├ qtime", "Get off and on timestamps" ],
//        [ "  │├ stats", "Show stats" ],
//        [ "  │├ query", "Make a query", "filter: JSON" ],
//        [ "  │└ count", "Number of documents in database" ],
//        [ "  │" ],
//        [ "  ├┬ AUTHENTICATION"],
//        [ "  │├ auth", "Authenticate to server", "id password PIN" ],
//        [ "  │└ newacc", "Create a new account" ],
//        [ "  │" ],
//        [ "  ├┬ BENCHMARKING"],
//        [ "  │├ _fetch", "Measure root server sync HTTP requests" ],
//        [ "  │└ _database", "Measure database ORM with dummy raw data" ],
//        [ "  │" ],
//        [ "  └ quit", "Quit" ]
//    ]));



















