// sap.ui.define([
//     "sap/ui/core/mvc/Controller"
// ], (Controller) => {
//     "use strict";

//     return Controller.extend("zppmigobatch.controller.View1", {
//         onInit() {
//         }
//     });
// });
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, Filter, FilterOperator, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("zppmigobatch.controller.View1", {

        onInit: function () {
            // 1. Get the current View
            var oView = this.getView();

            // 2. Find the Posting Date control
            var oPostingDatePicker = oView.byId("inputPostingDate");

            // 3. Set it to exactly right now (Today)
            if (oPostingDatePicker) {
                oPostingDatePicker.setDateValue(new Date());
            }
        },

        // ==========================================
        // 1. TYPE-AHEAD SUGGESTION LOGIC (Cascading)
        // ==========================================

        onSalesOrderSuggest: function (oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var sPlant = this.getView().byId("inputPlant").getValue();
            var aFilters = [];

            if (!sPlant) {
                MessageToast.show("Please select a Plant first");
                oEvent.getSource().getBinding("suggestionItems").filter([]);
                return;
            }

            aFilters.push(new Filter("Plant", FilterOperator.EQ, sPlant));
            if (sTerm) {
                aFilters.push(new Filter("SalesOrder", FilterOperator.StartsWith, sTerm));
            }
            oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
        },

        onSalesOrderItemSuggest: function (oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var sSalesOrder = this.getView().byId("inputSalesOrder").getValue();
            var aFilters = [];

            if (!sSalesOrder) {
                MessageToast.show("Please select a Sales Order first");
                oEvent.getSource().getBinding("suggestionItems").filter([]);
                return;
            }

            aFilters.push(new Filter("SalesOrder", FilterOperator.EQ, sSalesOrder));
            if (sTerm) {
                aFilters.push(new Filter("SalesOrderItem", FilterOperator.StartsWith, sTerm));
            }
            oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
        },

        // ==========================================
        // 2. VALUE HELP DIALOG LOGIC (F4 Pop-ups)
        // ==========================================

        // --- PLANT F4 ---
        onPlantValueHelp: function (oEvent) {
            var oView = this.getView();
            if (!this._oPlantDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "zppmigobatch.view.PlantVH", // Points to PlantVH.fragment.xml
                    controller: this
                }).then(function (oDialog) {
                    this._oPlantDialog = oDialog;
                    oView.addDependent(this._oPlantDialog);
                    this._oPlantDialog.open();
                }.bind(this));
            } else {
                this._oPlantDialog.open();
            }
        },

        onPlantVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                this.getView().byId("inputPlant").setValue(oSelectedItem.getTitle());
                // Clear dependent fields when parent changes
                this.getView().byId("inputSalesOrder").setValue("");
                this.getView().byId("inputSalesOrderItem").setValue("");
            }
        },

        // --- SALES ORDER F4 ---
        onSalesOrderValueHelp: function (oEvent) {
            var oView = this.getView();
            var sPlant = oView.byId("inputPlant").getValue();

            if (!sPlant) {
                MessageToast.show("Please select a Plant first");
                return;
            }

            if (!this._oSalesOrderDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "zppmigobatch.view.SalesOrderVH",
                    controller: this
                }).then(function (oDialog) {
                    this._oSalesOrderDialog = oDialog;
                    oView.addDependent(this._oSalesOrderDialog);
                    // Apply Plant Filter to Dialog
                    var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                    this._oSalesOrderDialog.getBinding("items").filter([oFilter]);
                    this._oSalesOrderDialog.open();
                }.bind(this));
            } else {
                var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                this._oSalesOrderDialog.getBinding("items").filter([oFilter]);
                this._oSalesOrderDialog.open();
            }
        },

      onSalesOrderVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                // Read the first column's cell (Sales Order)
                var sSalesOrder = oSelectedItem.getCells()[0].getText();
                
                this.getView().byId("inputSalesOrder").setValue(sSalesOrder);
                this.getView().byId("inputSalesOrderItem").setValue("");
            }
        },

        // --- SALES ORDER ITEM F4 ---
        onSalesOrderItemValueHelp: function (oEvent) {
            var oView = this.getView();
            var sSalesOrder = oView.byId("inputSalesOrder").getValue();

            if (!sSalesOrder) {
                MessageToast.show("Please select a Sales Order first");
                return;
            }

            if (!this._oItemDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "zppmigobatch.view.SalesOrderItemVH",
                    controller: this
                }).then(function (oDialog) {
                    this._oItemDialog = oDialog;
                    oView.addDependent(this._oItemDialog);
                    // Apply Sales Order Filter to Dialog
                    var oFilter = new Filter("SalesOrder", FilterOperator.EQ, sSalesOrder);
                    this._oItemDialog.getBinding("items").filter([oFilter]);
                    this._oItemDialog.open();
                }.bind(this));
            } else {
                var oFilter = new Filter("SalesOrder", FilterOperator.EQ, sSalesOrder);
                this._oItemDialog.getBinding("items").filter([oFilter]);
                this._oItemDialog.open();
            }
        },

       // --- SALES ORDER ITEM CONFIRM ---
        onItemVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                // Read the first column's cell (Sales Order Item)
                var sSalesOrderItem = oSelectedItem.getCells()[0].getText();
                
                this.getView().byId("inputSalesOrderItem").setValue(sSalesOrderItem);
            }
        }

    });
});