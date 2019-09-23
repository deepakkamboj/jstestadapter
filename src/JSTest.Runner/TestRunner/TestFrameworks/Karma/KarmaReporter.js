var KarmaCallbacks = require('./KarmaCallbacks');
var TestOutcome = require('../../../ObjectModel/Common');
var EqtTrace = require('../../../ObjectModel/EqtTrace');

var KarmaReporter = function(baseReporterDecorator, config, emitter, logger, helper, formatError) {
    var shortTestName = !!config.shortTestName;
    var discovery = !!config.discovery;
    var configFilePath = config.configFilePath;

    var log = logger.create('reporter.karma');

    var karmaCallbacks = KarmaReporter.karmaCallbacks;

    baseReporterDecorator(this);

    this.getBrowser = function(browser) {
        var b = browsers[browser.id];

        if (b) {
            return b;
        }

        var newRecord = {
            browser: browser,
            logs: []
        };

        browsers[browser.id] = newRecord;
        return newRecord;
    };

    this.clear = function() {
       browsers = {};
    };

    this.onRunStart = function() {
        EqtTrace.EqtTrace.info(`KarmaReporter: run started`);
    };

    this.onRunComplete = function(browsers, summary) {
        this.clear();
        EqtTrace.EqtTrace.info(`KarmaReporter: run complete`);
        karmaCallbacks.handleKarmaRunComplete();
    };

    this.onBrowserStart = function(browser) {
        this.getBrowser(browser).logs = [];
    };

    this.onBrowserError = function(browser, error) {
        this.getBrowser(browser).logs.push(error);
    };

    this.onBrowserLog = function(browser, log, type) {
        this.getBrowser(browser).logs.push(log);
    };

    this.onBrowserComplete = function(browser) {
        EqtTrace.EqtTrace.info(`KarmaReporter: browser complete`);
        var result = browser.lastResult;
        const executed = result.total - result.skipped;
        const failed = executed - result.success;
        const error = result.error || failed > 0 || result.failed > 0;

        if (error && result.failed === 0) {
            const browserLogs = this.getBrowser(browser).logs;
            var logMessage = '';
            browserLogs.forEach(function (log) {
                logMessage += log + '\n';
            });

            const failedResult = Object.assign({}, result);
            failedResult.success = false;
            failedResult.suite = ['Catastrophic Failure'];
            failedResult.log = browserLogs;
            this.specFailure(browser, failedResult);
        }
    };

    this.specSuccess = this.specSkipped = this.specFailure = function (browser, result) {
        EqtTrace.EqtTrace.info(`KarmaReporter: handling spec`);
        var className = result.suite.join('.');
        var unitTestName = shortTestName
            ? className + ': ' + result.description
            : className + ': ' + result.description + ' [' + browser.name + ']';
        var codeBase = unitTestName;
        var outcome = TestOutcome.TestOutcome.None;

        if (result.skipped === true) {
            outcome = TestOutcome.TestOutcome.Skipped;
        } else if (result.success === true) {
            outcome = TestOutcome.TestOutcome.Passed;
        } else if (result.success === false) {
            outcome = TestOutcome.TestOutcome.Failed;
        }

        var specName = result.suite.slice();
        specName.push(result.description);
        specName = specName.join(':');
        var failedExpectations = [];
        if (!result.log) {
          result.log = [];
        }

       for (let i = 0; i < result.log.length; i++) {
           var expectation = result.log[i];
           var message = '';
            if(result.assertionErrors) {
                message = result.assertionErrors[i].name + ': ' + result.assertionErrors[i].message;
            } else {
                message = 'Error Occurred';
            }

           var failedExpectation = {
               Message: formatError(message),
               StackTrace: formatError(expectation)
           };
           failedExpectations.push(failedExpectation);
       }

        var startTime =  result.startTime;
        var endTime =  result.endTime;

        if (startTime === undefined || startTime === null) {
            var time = result.time;
            endTime = new Date();
            console.log('End Time: ' + endTime);
            var seconds = endTime.getSeconds() - time;
            startTime = new Date(endTime);
            startTime.setSeconds(seconds);
            console.log('Start Time: ' + startTime);
        }

        if (discovery) {
            karmaCallbacks.handleSpecFound(specName,
                                           unitTestName,
                                           configFilePath,
                                           undefined,
                                           codeBase,
                                           undefined);
        } else {
            karmaCallbacks.handleSpecResult(specName,
                                            unitTestName,
                                            configFilePath,
                                            outcome,
                                            failedExpectations, //failedExpectations,
                                            new Date(startTime),
                                            new Date(endTime),
                                            codeBase,
                                            undefined); //attachmentId
        }

        this.getBrowser(browser).logs = [];
    };

    this.clear();
};

KarmaReporter.$inject = ['baseReporterDecorator', 'config.karmaReporter', 'emitter', 'logger', 'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
    'reporter:karma': ['type', KarmaReporter],
    initializeKarmaReporter: function(callbacks) {
        KarmaReporter.karmaCallbacks = callbacks;
        return callbacks;
    }
};