sap.ui.define([
	"sap/ui/core/util/MockServer"
], function (MockServer) {
	"use strict";
	return {
		init: function () {
			// create
			var oMockServer = new MockServer({
				rootUri: "/sap/opu/odata/sap/ZEMPLOYY_DATA_SRV/"
			}); 
			var oUriParameters = jQuery.sap.getUriParameters();
			// configure
			MockServer.config({
				autoRespond: true,
				autoRespondAfter: oUriParameters.get("serverDelay") || 1000
			});
			// simulate
			var sPath = jQuery.sap.getModulePath("NetworkGraphZOrgNetwGraph.localService");
			oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");
			/*oMockServer.simulate("../localService/metadata.xml", {
				sMockdataBaseUrl: "../localService/mockdata",
				bGenerateMissingMockData: true
			});*/
			// start
			oMockServer.start();
		}
	};
});