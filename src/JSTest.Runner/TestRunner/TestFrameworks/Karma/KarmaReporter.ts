import { KarmaCallbacks } from './KarmaCallbacks';
import { TestOutcome } from '../../../ObjectModel/Common';
import { FailedExpectation } from '../../../ObjectModel/TestFramework';
import { EqtTrace } from '../../../ObjectModel/EqtTrace';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as builder from 'xmlbuilder';

// tslint:disable:no-default-export
class KarmaReporter {
    private static callbacks: KarmaCallbacks;
    private static configFilePath: string;

    //Reporter specific variables
    private karmaConfig: any;
    private logger: any;
    private emitter: any;
    private helper: any;
    private formatError: any;

    //Reporter specific derived variables
    //private outputFile: any;
	private shortTestName: any;
	private discovery: boolean = false;
    private trimTimestamps: any;
    private nameFormatter: any;
    private coverageMap: WeakMap<any, any>;

    private testRun: any;
    private resultSummary: any;
    private counters: any;
    private testDefinitions: any;
    private testListIdNotInAList: any;
    private testEntries: any;
    private results: any;
    private times: any;

    constructor(baseReporterDecorator: any, karmaConfig: any, emitter: any, logger: any, helper: any, formatError: any) {
        this.karmaConfig = karmaConfig;
        this.logger = logger;
        this.emitter = emitter;
        this.helper = helper;
        this.karmaConfig = karmaConfig;
        this.formatError = formatError;

        const outputFile = this.karmaConfig.outputFile;
		this.shortTestName = !!this.karmaConfig.shortTestName;
		this.discovery = !!this.karmaConfig.discovery;
        this.trimTimestamps = !!this.karmaConfig.trimTimestamps;
        this.nameFormatter = this.karmaConfig.nameFormatter; //|| this.defaultNameFormatter;

        this.logger = logger.create('reporter.karmatest');
        this.logger.info('Created');

        baseReporterDecorator(this);
    }
/*
    public static INITIALIZE_REPORTER(callbacks: KarmaCallbacks) {
        this.callbacks = callbacks;
        EqtTrace.info(`KarmaReporter: initializing`);
    }

    public static UPDATE_CONFIG(configFilePath: string) {
        this.configFilePath = configFilePath;
    }

    formatDuration = (duration: any) => {
        duration = duration ? duration : 0;
        const ms = duration % 1000;
        duration -= ms;
        const s = (duration / 1000) % 60;
        duration -= s * 1000;
        const m = (duration / 60000) % 60;
        duration -= m * 60000;
        const h = (duration / 3600000) % 24;
        duration -= h * 3600000;
        const d = duration / 86400000;

        return (d > 0 ? d + '.' : '') +
            (h < 10 ? '0' + h : h) + ':' +
            (m < 10 ? '0' + m : m) + ':' +
            (s < 10 ? '0' + s : s) + '.' +
            (ms < 10 ? '00' + ms : ms < 100 ? '0' + ms : ms);
    }

    getTimestamp = () => {
        // todo: use local time ?
        return this.trimTimestamps
            ? new Date().toISOString().substr(0, 19)
            : new Date().toISOString();
    }

    s4 = () => {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    newGuid = () => {
        return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' + this.s4() + this.s4() + this.s4();
    }
*/
    public onRunStart = () => {
		EqtTrace.info(`KarmaReporter: run start`);
		const userName = process.env.USERNAME || process.env.USER || 'karma-trx';
		/*
        const userName = process.env.USERNAME || process.env.USER || 'karma-trx';
        const runStartTimestamp = this.getTimestamp();
        this.testRun = builder.create('TestRun', {version: '1.0', encoding: 'UTF-8'})
            .att('id', this.newGuid())
            .att('name', userName + '@' + os.hostname() + ' ' + runStartTimestamp)
            .att('runUser', userName)
            .att('xmlns', 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010');

        this.testRun.ele('TestSettings')
            .att('name', 'Karma Test Run')
            .att('id', this.newGuid());

        this.times = this.testRun.ele('Times');
            this.times.att('creation', runStartTimestamp);
            this.times.att('queuing', runStartTimestamp);
            this.times.att('start', runStartTimestamp);

        this.resultSummary = this.testRun.ele('ResultSummary');
        this.counters = this.resultSummary.ele('Counters');
        this.testDefinitions = this.testRun.ele('TestDefinitions');

        this.testListIdNotInAList = '8c84fa94-04c1-424b-9868-57a2d4851a1d';
        const testLists = this.testRun.ele('TestLists');

        testLists.ele('TestList')
            .att('name', 'Results Not in a List')
            .att('id', this.testListIdNotInAList);

        // seems to be VS is expecting that exact id
        testLists.ele('TestList')
            .att('name', 'All Loaded Results')
            .att('id', '19431567-8539-422a-85d7-44ee4e166bda');

        this.testEntries = this.testRun.ele('TestEntries');
        this.results = this.testRun.ele('Results');
		//KarmaReporter.callbacks.handleRunComplete();
		*/
    }

    public onBrowserStart = (browser: any) => {
        EqtTrace.info(`KarmaReporter: browser start`);
       // KarmaReporter.callbacks.handleRunComplete();
    }

    public onBrowserComplete = (browser: any) => {
        EqtTrace.info(`KarmaReporter: browser complete`);

        const result = browser.lastResult;
        const passed = result.failed <= 0 && !result.error;
/*
        if(this.resultSummary === undefined) {
            this.resultSummary = this.testRun.ele('ResultSummary');
        }

        this.resultSummary.att('outcome', passed ? 'Passed' : 'Failed');

        // todo: checkout if all theses numbers map well
        this.counters.att('total', result.total)
            .att('executed', result.total - result.skipped)
            .att('passed', result.success)
            .att('error', result.error ? 1 : 0)
            .att('failed', result.failed);
*/
        //KarmaReporter.callbacks.handleRunComplete();
    }

	public onRunComplete = () => {
        EqtTrace.info(`KarmaReporter: run complete`);
/*
        this.times.att('finish', this.getTimestamp());
        const xmlToOutput = this.testRun;

        this.helper.mkdirIfNotExists(path.dirname(this.outputFile), function () {
            fs.writeFile(this.outputFile, xmlToOutput.end({pretty: true}), function (err: any) {
                if (err) {
                    this.logger.warn('Cannot write TRX testRun\n\t' + err.message);
                } else {
                    this.logger.debug('TRX results written to "%s".', this.outputFile);
                }
            });
		});
		*/
       //KarmaReporter.callbacks.handleRunComplete();
	}

	public specSuccess = (browser: any, result: any) => {
		EqtTrace.info(`KarmaReporter: spec complete`);
		/*
        const unitTestId = this.newGuid();
        const unitTestName = this.shortTestName
            ? result.description
            : this.nameFormatter(browser, result);
        const className = result.suite.join('.');
        const codeBase = className + '.' + unitTestName;
*/
	}

    public specSkipped = (browser: any, result: any) => {
        EqtTrace.info(`KarmaReporter: spec complete`);
/*
        const unitTestId = this.newGuid();
        const unitTestName = this.shortTestName
            ? result.description
            : this.nameFormatter(browser, result);
        const className = result.suite.join('.');
        const codeBase = className + '.' + unitTestName;

        const unitTest = this.testDefinitions.ele('UnitTest')
            .att('name', unitTestName)
            .att('id', unitTestId);

        const executionId = this.newGuid();
        unitTest.ele('Execution')
            .att('id', executionId);
        unitTest.ele('TestMethod')
            .att('codeBase', codeBase)
            .att('name', unitTestName)
            .att('className', className);

        this.testEntries.ele('TestEntry')
            .att('testId', unitTestId)
            .att('executionId', executionId)
            .att('testListId', this.testListIdNotInAList);

        const unitTestResult = this.results.ele('UnitTestResult')
            .att('executionId', executionId)
            .att('testId', unitTestId)
            .att('testName', unitTestName)
            .att('computerName', os.hostname())
            .att('duration', this.formatDuration(result.time > 0 ? result.time : 0))
            .att('startTime', this.getTimestamp())
            .att('endTime', this.getTimestamp())
            // todo: are there other test types?
            .att('testType', '13cdc9d9-ddb5-4fa4-a97d-d965ccfc6d4b') // that guid seems to represent 'unit test'
            .att('outcome', result.skipped ? 'NotExecuted' : (result.success ? 'Passed' : 'Failed'))
            .att('testListId', this.testListIdNotInAList);

        if (!result.success) {
            unitTestResult.ele('Output')
                .ele('ErrorInfo')
                .ele('Message', this.formatError(result.log[0]));
        }

        let resultTitle = result.title;
        resultTitle = codeBase;

        const testFilePath = path.relative(path.dirname(KarmaReporter.configFilePath), result.path);

        const attachmentId = `${result.fullName}|spec${result.index}`;

        KarmaReporter.callbacks.handleSpecFound(result.fullName,
            resultTitle,
            KarmaReporter.configFilePath,
            undefined,
            '::' + result.fullName + '::' + testFilePath,
            attachmentId);
*/
    }

    public specFailure = (browser: any, result: any) => {
		/*
        const unitTestId = this.newGuid();
        const unitTestName = this.shortTestName
            ? result.description
            : this.nameFormatter(browser, result);
            const className = result.suite.join('.');
        const codeBase = className + '.' + unitTestName;
*/
    }
}

KarmaReporter.$inject = ['baseReporterDecorator', 'config.karmatestReporter', 'emitter', 'logger',
    'helper', 'formatError'];

module.exports = {
    'reporter:karmatest': ['type', KarmaReporter]
    //KarmaReporter
};
//export = KarmaReporter;