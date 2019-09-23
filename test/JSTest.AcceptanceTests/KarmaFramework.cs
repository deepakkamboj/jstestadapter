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
        }


        [ClassInitialize]
        public static void ClassInitialize(TestContext context)
        {
            KarmaFramework.InitializeBase("karma", "Karma", "Karma");
        }

        [TestMethod]
        public void TestExecutionKarma()
        {
            this.TestExecution();
        }

        [TestMethod]
        public void TestExecutionWithTestsKarma()
        {
            this.TestExecutionWithTests();
        }

        [TestMethod]
        public void TestDiscoveryKarma()
        {
            this.TestDiscovery();
        }
    }
}
