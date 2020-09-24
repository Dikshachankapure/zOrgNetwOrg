sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/suite/ui/commons/networkgraph/layout/LayeredLayout",
	"sap/suite/ui/commons/networkgraph/layout/ForceBasedLayout",
	"sap/suite/ui/commons/networkgraph/ActionButton",
	"sap/suite/ui/commons/networkgraph/Node"
], function(JSONModel, Controller, LayeredLayout, ForceBasedLayout, ActionButton, Node) {
	"use strict";

	var GraphController = Controller.extend("NetworkGraphZOrgNetwGraph.controller.View1");
	var STARTING_PROFILE = "Patel";

	GraphController.prototype.onInit = function() {
		var graph = this.getView().byId("graph");

		this._oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZEMPLOYY_DATA_SRV/", true);
		this.getView().setModel(this._oModel);

		var NewJsonModel = new JSONModel();
		var oModel = this.getView().getModel();

		oModel.read("/DummySet?$expand=NODES,LINES", {

			success: function(oData, oResponse) {
				NewJsonModel.setData(oData.results[0]);

				graph.setModel(NewJsonModel);
			},
			error: function(oData, oResponse) {

			}
		});

		this._sTopSupervisor = STARTING_PROFILE;
		this._mExplored = [this._sTopSupervisor];

		this._setFilter();

		graph.attachEvent("beforeLayouting", function(oEvent) {
			// nodes are not rendered yet (bOutput === false) so their invalidation triggers parent (graph) invalidation
			// which results in multiple unnecessary loading
			graph.preventInvalidation(true);
			graph.getNodes().forEach(function(oNode) {
				var oExpandButton, oDetailButton, oUpOneLevelButton,
					sTeamSize = this._getCustomDataValue(oNode, "Team"),
					sSupervisor;

				oNode.removeAllActionButtons();

				if (!sTeamSize) {
					// employees without team - hide expand buttons
					oNode.setShowExpandButton(false);
				} else {
					if (this._mExplored.indexOf(oNode.getKey()) === -1) {
						// managers with team but not yet expanded
						// we create custom expand button with dynamic loading
						oNode.setShowExpandButton(false);

						// this renders icon marking collapse status
						oNode.setCollapsed(true);
						oExpandButton = new ActionButton({
							title: "Expand",
							icon: "sap-icon://sys-add",
							press: function() {
								oNode.setCollapsed(false);
								this._loadMore(oNode.getKey());
							}.bind(this)
						});
						oNode.addActionButton(oExpandButton);
					} else {
						// manager with already loaded data - default expand button
						oNode.setShowExpandButton(true);
					}
				}

				// add detail link -> custom popover
				oDetailButton = new ActionButton({
					title: "Detail",
					icon: "sap-icon://person-placeholder",
					press: function(oEvent) {
						this._openDetail(oNode, oEvent.getParameter("buttonElement"));
					}.bind(this)
				});
				oNode.addActionButton(oDetailButton);

				// if current user is root we can add 'up one level'
				if (oNode.getKey() === this._sTopSupervisor) {
					sSupervisor = this._getCustomDataValue(oNode, "Supervisor");
					if (sSupervisor) {
						oUpOneLevelButton = new ActionButton({
							title: "Up one level",
							icon: "sap-icon://arrow-top",
							press: function() {
								var aSuperVisors = oNode.getCustomData().filter(function(oData) {
										return oData.getKey() === "Supervisor";
									}),
									sSupervisor = aSuperVisors.length > 0 && aSuperVisors[0].getValue();

								this._loadMore(sSupervisor);
								this._sTopSupervisor = sSupervisor;
							}.bind(this)
						});
						oNode.addActionButton(oUpOneLevelButton);
					}
				}
			}, this);
			graph.preventInvalidation(false);
		}.bind(this));

	};

	GraphController.prototype.search = function(oEvent) {
		var sKey = oEvent.getParameter("key");

		var graph = this.getView().byId("graph");

		if (sKey) {
			this._mExplored = [sKey];
			this._sTopSupervisor = sKey;
			graph.destroyAllElements();
			this._setFilter();

			oEvent.bPreventDefault = true;
		}
	};
	GraphController.prototype.suggest = function(oEvent) {
		var graph = this.getView().byId("graph");
		graph = this.getView().byId("graph");
		this._oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZEMPLOYY_DATA_SRV/", true);
		this.getView().setModel(this._oModel);

		var NewJsonModel = new JSONModel();
		var oModel = this.getView().getModel();

		var aSuggestionItems = [],
			aItems = [],
			aFilteredItems = [],
			sTerm = oEvent.getParameter("term");

		oModel.read("/DummySet?$expand=NODES,LINES", {

			success: function(oData, oResponse) {
				NewJsonModel.setData(oData.results[0]);
				aItems = NewJsonModel.getData().NODES.results;

				sTerm = sTerm ? sTerm : "";

				aFilteredItems = aItems.filter(function(oItem) {
					var sTitle = oItem.Title ? oItem.Title : "";
					return sTitle.toLowerCase().indexOf(sTerm.toLowerCase()) !== -1;
				});

				aFilteredItems.sort(function(oItem1, oItem2) {
					var sTitle = oItem1.Title ? oItem1.Title : "";
					return sTitle.localeCompare(oItem2.Title);
				}).forEach(function(oItem) {
					aSuggestionItems.push(new sap.m.SuggestionItem({
						key: oItem.Id
							//	text: oItem.Title
					}));
				});

				graph.setSearchSuggestionItems(aSuggestionItems);
				oEvent.bPreventDefault = true;
			},
			error: function(oData, oResponse) {

			}
		});

	};

	GraphController.prototype.onExit = function() {
		if (this._oQuickView) {
			this._oQuickView.destroy();
		}
	};

	GraphController.prototype._loadMore = function(sName) {
	//	var graph = this.getView().byId("graph");

	//	this._graph.deselect();
		this._mExplored.push(sName);
	this._graph.destroyAllElements();
		this._setFilter();
	};

	GraphController.prototype._setFilter = function() {
		var graph = this.getView().byId("graph");
//
		var aNodesCond = [],
			aLinesCond = [];
		var fnAddBossCondition = function(sBoss) {
			aNodesCond.push(new sap.ui.model.Filter({
				path: 'Id',
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sBoss
			}));

			aNodesCond.push(new sap.ui.model.Filter({
				path: 'Supervisor',
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sBoss
			}));
		};

		var fnAddLineCondition = function(sLine) {
			aLinesCond.push(new sap.ui.model.Filter({
				path: "From",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sLine
			}));
		};

		this._mExplored.forEach(function(oItem) {
			fnAddBossCondition(oItem);
			fnAddLineCondition(oItem);
		});

		graph.getBinding("nodes").filter(new sap.ui.model.Filter({
			filters: aNodesCond,
			and: false
		}));

		graph.getBinding("lines").filter(new sap.ui.model.Filter({
			filters: aLinesCond,
			and: false
		}));
	};

	GraphController.prototype._getCustomDataValue = function(oNode, sName) {
		var aItems = oNode.getCustomData().filter(function(oData) {
			return oData.getKey() === sName;
		});

		return aItems.length > 0 && aItems[0].getValue();
	};

	GraphController.prototype._openDetail = function(oNode, oButton) {
		var sTeamSize = this._getCustomDataValue(oNode, "Team");

		if (!this._oQuickView) {
			this._oQuickView = sap.ui.xmlfragment("NetworkGraphZOrgNetwGraph.fragments.Tooltip", this);
		}

		this._oQuickView.setModel(new JSONModel({
			icon: oNode.getImage() && oNode.getImage().getProperty("src"),
			title: oNode.getDescription(),
			description: this._getCustomDataValue(oNode, "Position"),
			location: this._getCustomDataValue(oNode, "Location"),
			showTeam: !!sTeamSize,
			teamSize: sTeamSize,
			email: this._getCustomDataValue(oNode, "Email"),
			phone: this._getCustomDataValue(oNode, "Phone")
		}));

		jQuery.sap.delayedCall(0, this, function() {
			this._oQuickView.openBy(oButton);
		});
	};

	GraphController.prototype.linePress = function(oEvent) {
		oEvent.bPreventDefault = true;
	};

	return GraphController;

});