import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as builder from 'xmlbuilder';

// tslint:disable:no-default-export
class DeepakReporter {
    //Reporter specific variables
   // private karmaConfig: any;
    private logger: any;
  //  private emitter: any;
  //  private helper: any;
 //   private formatError: any;


    constructor(baseReporterDecorator: any, karmaConfig: any, emitter: any, logger: any, helper: any, formatError: any) {
       // this.karmaConfig = karmaConfig;
        this.logger = logger;
       // this.emitter = emitter;
        //this.helper = helper;
       // this.karmaConfig = karmaConfig;
        //this.formatError = formatError;

        this.logger = logger.create('reporter.deepak');
        this.logger.info('Created');

        baseReporterDecorator(this);
    }

    public onRunStart = () => {
        console.log(`DeepakReporter: run start`);
        const userName = process.env.USERNAME || process.env.USER || 'karma-trx';
    }

    public onBrowserStart = (browser: any) => {
        console.log(`DeepakReporter: browser start`);
    }

    public onBrowserComplete = (browser: any) => {
        console.log(`DeepakReporter: browser complete`);

        const result = browser.lastResult;
        const passed = result.failed <= 0 && !result.error;
    }

    public onRunComplete = () => {
        console.log(`DeepakReporter: run complete`);
    }
}

DeepakReporter.$inject = ['baseReporterDecorator', 'config.deepakReporter', 'emitter', 'logger',
    'helper', 'formatError'];

module.exports = {
    'reporter:deepak': ['type', DeepakReporter]