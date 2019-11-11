using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace JSTest.AcceptanceTests
{

    [TestClass]
    public class KarmaFramework : BaseFrameworkTest
    {

        protected override string[] ContainerExtension
        {
            get
            {
                return new string[] { ".js" };
            }
        }

        public KarmaFramework() : base()
        {
            this.ExpectedOutput.ExecutionOutput = new List<string>
            {
                "Passed   Test Suite # 1: Array.Test Container # 1: #indexOf(): should return -1 when the value is not present [HeadlessChrome",
                "Passed   Test Suite # 2: Calculator Tests: returns 1+1=2 [HeadlessChrome",
                "Passed   Test Suite # 2: Calculator Tests: returns 2*2=4 [HeadlessChrome",
                "Passed   Test Suite # 3: Calculator Tests 2: should return sum of two numbers [HeadlessChrome",
                "Passed   Test Suite # 4: Test Case # 1 [HeadlessChrome",
                "Failed   Test Suite # 4: Test Case # 2 [HeadlessChrome",
                "Total tests: 6. Passed: 5. Failed: 1. Skipped: 0."
            };
        }


        [ClassInitialize]
        public static void ClassInitialize(TestContext context)
        {
            KarmaFramework.InitializeBase(new List<string>() {
                "karma",
                "jasmine",
                "karma-chrome-launcher" },
            "Karma", "Karma");
        }

        [TestMethod]
        public void TestExecutionKarma()
        {
            this.TestExecution();
        }

        [TestMethod]
        public void TestExecutionWithTestsKarma()
        {
            this.TestExecutionWithTests("Calculator Tests");
        }

        [TestMethod]
        public void TestDiscoveryKarma()
        {
            this.TestDiscovery();
        }
    }
}
