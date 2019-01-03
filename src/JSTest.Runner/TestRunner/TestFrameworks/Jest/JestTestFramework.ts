import { ITestFrameworkEvents } from '../../../ObjectModel/TestFramework';
import { EnvironmentType, TestCase } from '../../../ObjectModel/Common';
import { Exception, ExceptionType } from '../../../Exceptions';
import { BaseTestFramework } from '../BaseTestFramework';
import { JestCallbacks } from './JestCallbacks';
import * as rewire from 'rewire';
import * as path from 'path';
import { EqtTrace } from '../../../ObjectModel/EqtTrace';

export class JestTestFramework extends BaseTestFramework {
    public readonly environmentType: EnvironmentType;
    public readonly canHandleMultipleSources: boolean = false;
    public readonly supportsJsonOptions: boolean = true;

    protected sources: Array<string>;

    private jest: any;
    private jestArgv: any;
    private jestProjects: any;
    private jestReporter: any;

    private getJest() {
        switch (this.environmentType) {
            case EnvironmentType.NodeJS:
                // tslint:disable-next-line
                // tslint:disable-next-line:no-require-imports
                return require('jest');
            default:
                throw new Exception('Not implemented.', ExceptionType.NotImplementedException);
                /*
                 * TODO CHECK FOR FRAMEWORK SPECIFIC ERRORS
                 * report as test framework threw an error,
                 * rethrow all errors wrapped in exception
                 * don't take dependency on exception here
                 */
        }
    }

    constructor(testFrameworkEvents: ITestFrameworkEvents, envrionmentType: EnvironmentType) {
        super(testFrameworkEvents);
        this.environmentType = envrionmentType;
    }

    public initialize() {
        EqtTrace.info('JestTestFramework: initializing jest');

        this.jest = this.getJest();

        const jestjs = require.resolve('jest');
        const jestCLI = rewire(path.join(path.dirname(path.dirname(jestjs)), 'node_modules', 'jest-cli', 'build', 'cli'));

        this.jestArgv = jestCLI.__get__('buildArgv')();
        this.jestArgv.reporters = ['./JestReporter.js'];

        this.jestProjects = jestCLI.__get__('getProjectListFromCLIArgs')(this.jestArgv);

        //tslint:disable:no-require-imports
        this.jestReporter = require('./JestReporter');
        this.jestReporter.INITIALIZE_REPORTER(<JestCallbacks> {
            handleSessionDone: this.handleSessionDone.bind(this),
            handleSpecFound: this.handleSpecStarted.bind(this),
            handleSpecResult: this.handleSpecResult.bind(this),
            handleErrorMessage: this.handleErrorMessage.bind(this)
        });

        //tslint:disable:no-require-imports
        // const jestSetup = require('./JestSetup');
        // jestSetup.INITIALIZE(Environment.instance.reinitializeConsoleLogger);
    }

    public startExecutionWithTests(sources: Array<string>, testCollection: Map<string, TestCase>, options: JSON) {
        const configToSourceMap: Map<string, Array<string>> = new Map();

            // tslint:disable-next-line:no-string-literal
            sources.forEach((src) => {
                const testCase = testCollection.get(src);
                const fqnRegex = testCase.FullyQualifiedName.match(/.*::(.*)/);
                if (fqnRegex) {
                    // config path appended to the fqn is relative to the source
                    const config = path.normalize(path.dirname(src) + '\\' + fqnRegex[1]);
                    if (configToSourceMap.has(config)) {
                        configToSourceMap.get(config).push(src);
                    } else {
                        configToSourceMap.set(config, [src]);
                    }
                } else {
                    console.warn('Config file not provided in fqn for source:', src);
                }
            });
        this.sources = sources;
        this.runTestsAsync(configToSourceMap, options);
    }

    public startExecutionWithSources(sources: Array<string>, options: JSON): void {
        EqtTrace.info(`JestTestFramework: starting with options: ${JSON.stringify(options)}`);

        this.sources = sources;
        
        const map = new Map();
        map.set(sources[0], []);

        this.runTestsAsync(map, options);
    }

    public startDiscovery(sources: Array<string>): void {
        this.sources = sources;
        this.jestReporter.discovery = true;
        this.runTestAsync(sources[0], null, null, true);
    }

    protected skipSpec(specObject: any) {
        // Cannot skip at test case level in jest
    }

    private async runTestAsync(runConfigPath: string, sources: Array<string>, configOverride: JSON, discovery: boolean = false) {
        const jestArgv = this.jestArgv;
        sources = sources || [];
        
        if (configOverride instanceof Object) {
            Object.keys(configOverride).forEach(key => {
                jestArgv[key] = configOverride[key];
            });
        }

        if (discovery) {
            // ^$a is a regex that will never match any string and force jest to skip all tests
            jestArgv.testNamePattern = '^$a';
        }

        jestArgv.$0 = runConfigPath;
        jestArgv.config = runConfigPath;
        jestArgv.rootDir = path.dirname(runConfigPath);
        jestArgv.reporters = [ require.resolve('./JestReporter.js') ];

        const src = [];
        sources.forEach((source, i) => {
            src.push(source.replace(/\\/g, '/'));  //  Cannot run specific test files in jest unless path separator is '/'
        });

        // the property '_' will be set as process.argv which in this case are for TestRunner not for jest
        jestArgv._ = src;

        EqtTrace.info(`JestTestFramework: JestArgv: ${JSON.stringify(jestArgv)}`);

        this.handleSessionStarted();
        this.jestReporter.UPDATE_CONFIG(runConfigPath);

        return this.jest.runCLI(jestArgv, this.jestProjects);
    }

    private async runTestsAsync(configToSourceMap: Map<string, Array<string>>, configOverride: JSON) {
        
        if (!configToSourceMap.size) {
            this.handleErrorMessage('JestTestFramework: No configs in config source map', '');
            this.handleSessionDone();
            return;
        }

        const entries = configToSourceMap.entries();
        let kvp = entries.next();

        while (!kvp.done) {
            try {
                await this.runTestAsync(kvp.value[0], kvp.value[1], configOverride);
            } catch (err) {
                this.handleErrorMessage(err.message, err.stack);
            }

            kvp = entries.next();
        }

        this.handleSessionDone();
    }
}