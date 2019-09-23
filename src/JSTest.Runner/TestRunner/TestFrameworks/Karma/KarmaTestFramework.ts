import { ITestFrameworkEvents, ITestFramework } from '../../../ObjectModel/TestFramework';
import { EnvironmentType } from '../../../ObjectModel/Common';
import { Exception, ExceptionType } from '../../../Exceptions';
import { BaseTestFramework } from '../BaseTestFramework';
import { EqtTrace } from '../../../ObjectModel/EqtTrace';
import { KarmaCallbacks } from './KarmaCallbacks';
import { Whitelist } from './Whitelist';
import { TaskController } from './TaskController';
import * as path from 'path';

enum ReporterEvent {
    BrowserRegister,
    BrowserError,
    BrowserStart,
    BrowserComplete,
    BrowsersChange,
    BrowsersReady,
    RunStarted,
    RunCompleted,
    Error
}

class Config {
    //tslint:disable:no-reserved-keywords
    public set(vars: any) {
        for (const key of Object.keys(vars)) {
            this[key] = vars[key];
        }
    }
    //tslint:disable:no-reserved-keywords
}

export class KarmaTestFramework extends BaseTestFramework implements ITestFramework {
    public readonly environmentType: EnvironmentType;
    public readonly canHandleMultipleSources: boolean = false;
    public readonly supportsJsonOptions: boolean = false;
    public readonly supportsCodeCoverage: boolean = false;

    protected sources: Array<string>;

    private karma: any;
    private skipCurrentSpec: boolean = false;
    private nextPort: number = 9900;
    private karmaConfig: any;
    private karmaReporter: any;
    private discoveryMode: boolean = false;
    private karmaServer: any;
    private karmaArgv: any;
    private controller: any = new TaskController();

    //PowerApps Specific Requirements
    private baseConfig: any;
    private defaultTestFilters: string[] = [];

    private static tagRegex: any = /^[\w\d_]+$/;
    private static tagDescription: string = `contain only letters, numbers,
            hyphen (-) and underscore (_), and be at least one character long`;
    private name: string;
    private rootPath: string;
    private config: any;

    private getKarma() {
        switch (this.environmentType) {
            case EnvironmentType.NodeJS:
                // tslint:disable-next-line
                return require('karma');
            default:
                throw new Exception('Not implemented.', ExceptionType.NotImplementedException);
        }
    }

    constructor(testFrameworkEvents: ITestFrameworkEvents, environmentType: EnvironmentType) {
        super(testFrameworkEvents);
        this.environmentType = environmentType;
    }

    public initialize() {
        EqtTrace.info('KarmaTestFramework: initializing Karma');
        this.karma = this.getKarma();
        //tslint:disable:no-require-imports
        this.karmaReporter = require('./KarmaReporter');
        this.karmaReporter.initializeKarmaReporter(<KarmaCallbacks>{
             handleKarmaRunComplete: this.reporterRunCompleteHandler.bind(this),
             handleSpecFound: this.handleSpecStarted.bind(this),
             handleSpecResult: this.handleSpecResult.bind(this),
             handleErrorMessage: this.handleErrorMessage.bind(this)
         });
        //tslint:disable:no-require-imports
        this.karmaArgv = new Object();
    }

    public startExecutionWithSources(sources: Array<string>, options: JSON): void {
        EqtTrace.info('KarmaTestFramework: Start test execution with Sources');
        this.sources = sources;
        try {
             this.runKarmaTests(sources, options);
        } catch (err) {
            this.handleErrorMessage(err.message, err.stack);
        }
    }

    public startDiscovery(sources: Array<string>): void {
        EqtTrace.info('KarmaTestFramework: Start test discovery');
        const options: JSON = null;
        this.sources = sources;
        this.discoveryMode = true;
        try {
            this.runKarmaTests(sources, options);
       } catch (err) {
           this.handleErrorMessage(err.message, err.stack);
       }
    }

    private runKarmaTests(sources: Array<string>, options: JSON) {
        let isPowerApps: boolean = false;
        this.sources = sources;
        const karmaServer = this.karma.Server;
        const karmaArgv = this.karmaArgv;
        if (options instanceof Object) {
            Object.keys(options).forEach(key => {
                karmaArgv[key] = options[key];
            });
        }
        if (karmaArgv.isPowerApps) {
            isPowerApps = karmaArgv.isPowerApps === 'true' ? true : false;
        }
        if (isPowerApps) {
            sources.forEach(source => {
                this.loadTestSuiteForPowerApps(source);
            });
            this.addKarmaReporter(karmaArgv, this.config.files[0]);

        } else {
            // default settings
            if (!karmaArgv.frameworks) {
                karmaArgv.frameworks = ['mocha', 'chai'];
            }
            this.loadTestSuite(sources, karmaArgv.frameworks);
            this.addKarmaReporter(karmaArgv, this.sources[0]);
        }

        EqtTrace.info(`KarmaTestFramework: starting with options: ${JSON.stringify(options)}`);
        EqtTrace.info(`KarmaTestFramework: Karma Server starting with config: ${JSON.stringify(this.karmaConfig)}`);
        EqtTrace.info(`KarmaTestFramework: Karma Server started with:
        frameworks: ${this.karmaConfig.frameworks.join(', ')}   port: ${this.karmaConfig.port} ...`);
        const server = this.karmaServer = new karmaServer(this.karmaConfig, (exitCode: any) => {
            if (exitCode === 0 || exitCode === null || exitCode === 'undefined') {
                EqtTrace.info('KarmaTestFramework: Karma Server exited with code: ' + exitCode + ' ...');
            } else {
                this.handleErrorMessage('KarmaTestFramework: Karma Server exited with code: ' + exitCode, exitCode);
            }
            this.handleSessionDone();
        }
        );

        this.initializeReporter(server);

        server.start()
        .then((...args: any[]) => {
            EqtTrace.info('KarmaTestFramework: Karma server started. Printing Args: ' + args);
        });
    }

    private loadTestSuiteForPowerApps(testSuiteFile: string) {
        EqtTrace.info(`KarmaTestFramework: Running tests for PowerApps.`);
        const config = new Config();
        //tslint:disable:non-literal-require
        const configProc = require(path.resolve(testSuiteFile));
        //tslint:disable:non-literal-require
        configProc(config);
        this.config = config;
        this.rootPath = path.dirname(testSuiteFile);
        this.name = testSuiteFile;

        KarmaTestFramework.configWhitelist.verifyObject(config, key => {
            throw new Error(`Unsupported karma config parameter '${key}' in TestSuite '${name}'`);
        });

        this.parseBaseConfig(this.config.ScriptTestOrchestrator, this.rootPath);
        this.rootPath = path.dirname(testSuiteFile);
        this.name = testSuiteFile;

        this.generateKarmaConfigForPowerApps();

        // Load the default tasks. These tasks are always available, even without importing.
        this.controller.addTasksFromFile(path.resolve(__dirname, './tasks.js'));
        try {
            this.controller.execute('testSuite[' + this.name + ']');
        } catch (err) {
            this.handleErrorMessage('Error in Task Runner: ' + err.message, err.stack);
            EqtTrace.info('Some tasks failed.');
        }
    }

    private cleanupTasks() {
        if (this.karmaArgv.isPowerApps) {
            const isPowerApps = this.karmaArgv.isPowerApps === 'true' ? true : false;
            if (isPowerApps) {
                try {
                    if (this.controller.variables.callCleanup) {
                        this.controller.execute('cleanup');
                    }
                } catch (err) {
                    this.handleErrorMessage('Error in Task Runner: ' + err.message, err.stack);
                    EqtTrace.info('Some tasks failed.');
                }
                finally {
                    this.controller = null;
                }
            }
        }
    }

    private generateKarmaConfigForPowerApps() {
        let basePath = this.rootPath;
        if (this.config.basePath) {
            basePath = path.resolve(basePath, this.config.basePath);
        }
        const oneSecond = 1000;
        const oneMinute = 60 * oneSecond;
        this.karmaConfig = {
            files: this.config.files.slice(),
            frameworks: this.config.frameworks,
            customClientContextFile: this.config.customClientContextFile,
            customDebugFile: this.config.customDebugFile,
            basePath: basePath,
            baseUrl: this.config.baseUrl,
            proxies: this.config.proxies,
            preprocessors: this.config.preprocessors,
            port: this.nextPort++,
            autoWatch: true, //true
            failOnEmptyTestSuite: true, //false
            reporters: ['spec'],
            // Note: Browser startup on cold lab machines is observed as taking
            // significantly longer than the 10s default timeout for no activity, 2sm for disconnect.
            // Increasing browser timeout options to reduce test flakiness.
            captureTimeout: 5 * oneMinute,
            browserNoActivityTimeout: 10 * oneMinute,
            browserDisconnectTimeout: 3 * oneMinute,
            browserDisconnectTolerance: 2,
            browserSocketTimeout: 30 * oneSecond,
            plugins: ['karma-*'].concat(this.config.plugins || []),
            client: this.config.client,
            specReporter: {
                suppressSkipped: this.skipCurrentSpec
            },
            logLevel:  this.karma.constants.LOG_WARN
        };
    }

    private addKarmaReporter(options: any, configFilePath: string) {
        EqtTrace.info(`KarmaTestFramework: Add Karma Reporter`);
        const debug = options.debug === 'true' ? true : false;
        if (debug) {
            this.karmaConfig.singleRun = false;
            this.karmaConfig.useIframe = false;
        } else {
            this.karmaConfig.singleRun = true;
        }
        if (options.browsers) {
            this.karmaConfig.browsers = options.browsers;
        } else {
            this.karmaConfig.browsers = ['ChromeHeadless'];
        }

        this.karmaConfig.plugins.push(require.resolve('./KarmaReporter.js'));
        this.karmaConfig.reporters.push('karma');
        this.karmaConfig.karmaReporter = {
            shortTestName: false,
            discovery: this.discoveryMode,
            configFilePath: configFilePath
        };
    }

    private loadTestSuite(sources: Array<string>, frameworks: Array<string>) {
        EqtTrace.info(`KarmaTestFramework: Load Test Suites`);
        this.sources = sources;
        this.karmaConfig = {
            files: this.sources,
            frameworks: frameworks,
            basePath: '',
            port: this.nextPort++,
            autoWatch: false,
            failOnEmptyTestSuite: false,
            reporters: ['spec'],
            specReporter: {
                suppressSkipped: true
            },
            plugins: ['karma-*'],
            logLevel:  this.karma.constants.LOG_WARN
        };
    }

    private handleReporterEvents(reporterEvent: ReporterEvent, args: any) {
        switch (reporterEvent) {

            case ReporterEvent.BrowserRegister:
                break;

            case ReporterEvent.BrowserError:
                if (args.error === 0 || args.error === null || args.error === 'undefined') {
                    this.handleErrorMessage(args.error, args.error.stack);
                }
                this.handleSuiteDone();
                break;

            case ReporterEvent.BrowserStart:
                EqtTrace.info('KarmaTestFramework: Browser Started. Printing Args: ' + args);
                break;

            case ReporterEvent.BrowsersChange:
                break;

            case ReporterEvent.BrowsersReady:
                break;

            case ReporterEvent.BrowserComplete:
                EqtTrace.info('KarmaTestFramework: Browser Completed. Printing Args: ' + args);
                break;

            case ReporterEvent.RunStarted:
                this.handleSessionStarted();
                break;

            case ReporterEvent.RunCompleted:
                EqtTrace.info('KarmaTestFramework: Run Completed. Printing Args: ' + args);
                this.cleanupTasks();
                break;
            case ReporterEvent.Error:
                EqtTrace.info('KarmaTestFramework: Run Completed. Printing Args: ' + args);
                break;
        }
    }

    protected skipSpec() {
        this.skipCurrentSpec = true;
    }

    private reporterRunCompleteHandler() {
        EqtTrace.info('KarmaTestFramework: Run Completed.');
    }

    private initializeReporter(server: any) {
        EqtTrace.info('KarmaTestFramework: Initialize Reporter.');
        server.on('browser_register', (args) => { this.handleReporterEvents(ReporterEvent.BrowserRegister, args); });
        server.on('browser_error', (args) => { this.handleReporterEvents(ReporterEvent.BrowserError, args); });
        server.on('browser_start', (args) => { this.handleReporterEvents(ReporterEvent.BrowserStart, args); });
        server.on('browser_complete', (args) => { this.handleReporterEvents(ReporterEvent.BrowserComplete, args); });
        server.on('browsers_change', (args) => { this.handleReporterEvents(ReporterEvent.BrowsersChange, args); });
        server.on('browsers_ready', (args) => { this.handleReporterEvents(ReporterEvent.BrowsersReady, args); });
        server.on('run_start', (args) => { this.handleReporterEvents(ReporterEvent.RunStarted, args); });
        server.on('run_complete', (args) => { this.handleReporterEvents(ReporterEvent.RunCompleted, args); });
        server.on('error', (args) => { this.handleReporterEvents(ReporterEvent.Error, args); });
    }

    private static configWhitelist: any = new Whitelist([
        // Whitelist properties we support, so user's aren't surprised when their karma settings aren't applied.
        // Note: we can expand this in the future, but need to think through how those options behave in different modes, e.g. --debug mode.
        'dependencies', 'modules', 'include', 'exclude', 'set',
        'browsers', 'files', 'frameworks', 'baseUrl', 'proxies', 'basePath', 'preprocessors', 'plugins',
        'customClientContextFile', 'customDebugFile', 'client',

        // Also whitelist our extensions on top of karma.
        'ScriptTestOrchestrator'
    ]);

    private parseBaseConfig(baseConfig: any, filepath: string) {
        this.baseConfig = baseConfig || {};

        KarmaTestFramework.configWhitelist.verifyObject(this.baseConfig, key => {
            throw new Error(`Unsupported ScriptTestOrchestrator config parameter '${key}' in TestSuite '${filepath}'`);
        });

        // parse filters
        if (this.baseConfig.include) {
            for (const tag of this.baseConfig.include) {
                if (!tag.match(KarmaTestFramework.tagRegex)) {
                    throw new Error(`All tags must ${KarmaTestFramework.tagDescription}.
                    See tag ${JSON.stringify(tag)} in 'include' property in ${filepath}`);
                }
                // convert tag into a regular expression filter
                this.defaultTestFilters.push(`/@${tag}\\b/`);
            }
        }
        if (this.baseConfig.exclude) {
            for (const tag of this.baseConfig.exclude) {
                if (!tag.match(KarmaTestFramework.tagRegex)) {
                    throw new Error(`All tags must ${KarmaTestFramework.tagDescription}.
                    See tag ${JSON.stringify(tag)} in 'exclude' property in ${filepath}`);
                }
                // convert tag into a regular expression filter
                this.defaultTestFilters.push(`!/@${tag}\\b/`);
            }
        }
    }
}