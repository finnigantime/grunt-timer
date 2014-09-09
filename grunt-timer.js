var duration = require("duration"),
    color = require("bash-color"),
    fjs = require("functional.js"),
    hooker = require("hooker");

exports = module.exports = (function () {
    "use strict";
    var timer = {}, grunt, last, task,
        total = 0,
        deferLogs = false,
        totalOnly = false,
        friendlyTime = false,
        ignoreDefault = false,
        deferredMessages = [],
        options = {};

    var write = process.stdout.write.bind(process.stdout);

    var writeLn = function (msg) {
        write(msg + "\n");
    };

    var useColor = function (chosenColor) {
        writeLn = function (msg, intensity) {
            write(color[chosenColor](msg, (intensity === true)) + "\n");
        };
    };

    var logCurrent = function () {
        var dur = new duration(last).milliseconds;
        if (dur > 2) {
            var logMsg = "Task '" + task + "' took " + getDisplayTime(dur);
            if (!totalOnly) {
                if (deferLogs) {
                    deferredMessages.push(logMsg);
                } else {
                    writeLn(logMsg);
                }
            }
            addToTotal(dur);
        }
    };

    var logTotal = function () {
        var msg = "All tasks took " + getDisplayTime(total);
        writeLn(msg, true);
    };

    var logDeferred = function () {
        fjs.each(writeLn, deferredMessages);
    };

    var addToTotal = function (ms) {
        total = total + ms;
    };

    var getDisplayTime = function (s) {
        if (!friendlyTime) {
            return s + "ms";
        }
        if (s < 1000) {
            return "<1 second";
        }

        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;

        return (hrs ? hrs + (hrs > 1 ? " hours " : " hour ") : "") +
            (mins ? mins + (mins > 1 ? " minutes " : " minute ") : "") +
            secs + (secs > 1 ? " seconds " : " second ");
    };

    timer.init = function (_grunt, _options) {
        grunt = _grunt;
        total = 0;

        options = _options || {};

        deferLogs = !! options.deferLogs;
        friendlyTime = !! options.friendlyTime;
        totalOnly = !! options.totalOnly;
        ignoreDefault = !! options.ignoreDefault;

        if (ignoreDefault && grunt.cli.tasks.length === 0) {
            return;
        }

        options.color = options.color || "purple";
        if (grunt.option("color") !== false) {
            useColor(options.color);
        }

        hooker.hook(grunt.log, "header", function () {
            if (!task) {
                last = new Date();
                task = grunt.task.current.nameArgs;
            }
            if (task === grunt.task.current.nameArgs) {
                return;
            }
            logCurrent();
            task = grunt.task.current.nameArgs;
            last = new Date();
        });

        process.on("exit", function () {
            logCurrent();
            if (deferLogs) {
                logDeferred();
            }
            logTotal();
            hooker.unhook(grunt.log, "header");
        });
    };

    return timer;
})();
