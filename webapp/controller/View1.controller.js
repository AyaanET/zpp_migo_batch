sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "zppmigobatch/model/models",   // <--- 1. ADD THIS IMPORT
    "sap/m/MessageBox",                        // <--- Add this
    "sap/ui/core/format/DateFormat",
    "sap/ui/export/Spreadsheet",       // <--- ADD THIS
    "sap/ui/export/library"
], function (Controller, Filter, FilterOperator, MessageToast, Fragment, models, MessageBox, DateFormat, Spreadsheet, exportLibrary) { // <--- 2. ADD 'models' HERE
    "use strict";

    return Controller.extend("zppmigobatch.controller.View1", {

        onInit: function () {
            var oLocalModel = models.createLocalModel();
            this.getView().setModel(oLocalModel, "local");

        },

        onSelectionChange: function () {
            var oModel = this.getView().getModel("local");
            oModel.setProperty("/scannedBatches", []);
            this._calculateTotalYield();
        },

        onSalesOrderChange: function () {
            var oModel = this.getView().getModel("local");
            oModel.setProperty("/selection/salesOrderItem", "");
            oModel.setProperty("/selection/material", "");
            oModel.setProperty("/selection/materialDescription", "");
            this.onSelectionChange();
        },

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
        onPlantValueHelp: function (oEvent) {
            var oView = this.getView();
            if (!this._oPlantDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "zppmigobatch.view.PlantVH",
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
                this.getView().byId("inputSalesOrder").setValue("");
                this.getView().byId("inputSalesOrderItem").setValue("");

                this.onSalesOrderChange();
                this.onSelectionChange();
            }
        },

        onPlantVHSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var aFilters = [];

            if (sValue) {
                // Search in both Plant ID OR Plant Name
                aFilters.push(new Filter({
                    filters: [
                        new Filter("Plant", FilterOperator.Contains, sValue),
                        new Filter("PlantName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }

            // Apply the filter to the dialog's binding
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

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

        onSalesOrderVHSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var sPlant = this.getView().byId("inputPlant").getValue();

            // 1. ALWAYS keep the Plant filter active
            var aFilters = [new Filter("Plant", FilterOperator.EQ, sPlant)];

            // 2. Add the search term if the user typed one
            if (sValue) {
                aFilters.push(new Filter("SalesOrder", FilterOperator.Contains, sValue));
            }

            // Apply both filters to the dialog
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onSalesOrderVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sSalesOrder = oSelectedItem.getCells()[0].getText();
                this.getView().byId("inputSalesOrder").setValue(sSalesOrder);
                this.onSalesOrderChange();
            }
        },

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

        onItemVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                // var sSalesOrderItem = oSelectedItem.getCells()[0].getText();
                // this.getView().byId("inputSalesOrderItem").setValue(sSalesOrderItem);

                var oData = oSelectedItem.getBindingContext().getObject();

                var oLocalModel = this.getView().getModel("local");

                this.onSelectionChange();

                // Populate fields from the Item row
                oLocalModel.setProperty("/selection/salesOrderItem", oData.SalesOrderItem);
                oLocalModel.setProperty("/selection/material", oData.Material);
                oLocalModel.setProperty("/selection/materialDescription", oData.ProductDescription);
            }
        },

        // ==========================================
        // MANUAL ITEM INPUT CHANGE HANDLER
        // ==========================================
        // ==========================================
        // MANUAL ITEM INPUT CHANGE HANDLER (BACKEND FETCH)
        // ==========================================
        onSalesOrderItemChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sItemValue = oInput.getValue().trim();
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var oODataModel = oView.getModel(); // Main OData V4 Model

            this.onSelectionChange();
            oLocalModel.setProperty("/selection/material", "");
            oLocalModel.setProperty("/selection/materialDescription", "");
            var sSalesOrder = oLocalModel.getProperty("/selection/salesOrder");

            // 1. Safe cleanup if the user clears the entry field manually
            if (!sItemValue) {
                oLocalModel.setProperty("/selection/material", "");
                oLocalModel.setProperty("/selection/materialDescription", "");
                return;
            }

            // 2. Format inputs to structural ABAP requirements (leading zeros)
            var sPaddedItem = sItemValue.padStart(6, '0');
            var sPaddedOrder = (sSalesOrder || "").trim().padStart(10, '0');

            // Push formatted item value back to sync input control string visual state
            // oLocalModel.setProperty("/selection/salesOrderItem", sPaddedItem);

            if (!sPaddedOrder || sPaddedOrder === "0000000000") {
                sap.m.MessageBox.error("Please enter a valid Sales Order before specifying an item.");
                return;
            }

            // 3. Construct an explicit context path pointing to the matching entity instance
            // Syntactical layout: /ZI_SALESITEM_VH(SalesOrder='0010000071',SalesOrderItem='000010')
            var sContextPath = "/ZI_SALESITEM_VH(SalesOrder='" + sPaddedOrder + "',SalesOrderItem='" + sPaddedItem + "')";

            oView.setBusy(true);

            // Create a single context binding instead of a list binding
            var oContextBinding = oODataModel.bindContext(sContextPath);

            // Execute the network request payload download explicitly
            oContextBinding.requestObject().then(function (oData) {
                oView.setBusy(false);

                if (oLocalModel.getProperty("/selection/salesOrder") !== sSalesOrder ||
                        oView.byId("inputSalesOrderItem").getValue().trim() !== sItemValue) {
                    return;
                }
                if (oData) {
                    // Populate data properties safely upon successful return assignment
                    oLocalModel.setProperty("/selection/material", oData.Material);
                    oLocalModel.setProperty("/selection/materialDescription", oData.ProductDescription);
                }
            }).catch(function (oError) {
                oView.setBusy(false);

                // Clear out dependent tracking definitions when entries can't map to a DB profile
                oLocalModel.setProperty("/selection/material", "");
                oLocalModel.setProperty("/selection/materialDescription", "");

                console.error("Direct fetch failed: ", oError);
                sap.m.MessageToast.show("Invalid item specified for this Sales Order.");
            });
        },

        onItemVHSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var sSalesOrder = this.getView().byId("inputSalesOrder").getValue();

            // 1. ALWAYS keep the Sales Order filter active
            var aFilters = [new Filter("SalesOrder", FilterOperator.EQ, sSalesOrder)];

            // 2. Add the search term if the user typed one
            if (sValue) {
                aFilters.push(new Filter("SalesOrderItem", FilterOperator.Contains, sValue));
                aFilters.push(new Filter("Material", FilterOperator.Contains, sValue));
                aFilters.push(new Filter("ProductDescription", FilterOperator.Contains, sValue));
            }

            // Apply both filters to the dialog
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        // ==========================================
        // FROM STORAGE LOCATION LOGIC
        // ==========================================
        onFromSlocSuggest: function (oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var sPlant = this.getView().byId("inputPlant").getValue();
            var aFilters = [];

            if (!sPlant) {
                sap.m.MessageToast.show("Please select a Plant first");
                oEvent.getSource().getBinding("suggestionItems").filter([]);
                return;
            }

            aFilters.push(new Filter("Plant", FilterOperator.EQ, sPlant));
            if (sTerm) {
                aFilters.push(new Filter("StorageLocation", FilterOperator.StartsWith, sTerm));
            }
            oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
        },

        onFromSlocValueHelp: function (oEvent) {
            var oView = this.getView();
            var sPlant = oView.byId("inputPlant").getValue();

            if (!sPlant) {
                sap.m.MessageToast.show("Please select a Plant first");
                return;
            }

            if (!this._oFromSlocDialog) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "zppmigobatch.view.FromSlocVH", // Ensure this fragment is created
                    controller: this
                }).then(function (oDialog) {
                    this._oFromSlocDialog = oDialog;
                    oView.addDependent(this._oFromSlocDialog);
                    var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                    this._oFromSlocDialog.getBinding("items").filter([oFilter]);
                    this._oFromSlocDialog.open();
                }.bind(this));
            } else {
                var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                this._oFromSlocDialog.getBinding("items").filter([oFilter]);
                this._oFromSlocDialog.open();
            }
        },

        onFromSlocVHSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var sPlant = this.getView().byId("inputPlant").getValue();
            var aFilters = [new Filter("Plant", FilterOperator.EQ, sPlant)];

            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("StorageLocation", FilterOperator.Contains, sValue),
                        new Filter("StorageLocationName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onFromSlocVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sSloc = oSelectedItem.getCells()[1].getText();
                this.getView().byId("inputFromSloc").setValue(sSloc);

                // Clear rows validated for the previous source location
                this.onSelectionChange();
            }
        },

        // ==========================================
        // TO STORAGE LOCATION LOGIC
        // ==========================================
        onToSlocSuggest: function (oEvent) {
            var sTerm = oEvent.getParameter("suggestValue");
            var sPlant = this.getView().byId("inputPlant").getValue();
            var aFilters = [];

            if (!sPlant) {
                sap.m.MessageToast.show("Please select a Plant first");
                oEvent.getSource().getBinding("suggestionItems").filter([]);
                return;
            }

            aFilters.push(new Filter("Plant", FilterOperator.EQ, sPlant));
            if (sTerm) {
                aFilters.push(new Filter("StorageLocation", FilterOperator.StartsWith, sTerm));
            }
            oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
        },

        onToSlocValueHelp: function (oEvent) {
            var oView = this.getView();
            var sPlant = oView.byId("inputPlant").getValue();

            if (!sPlant) {
                sap.m.MessageToast.show("Please select a Plant first");
                return;
            }

            if (!this._oToSlocDialog) {
                sap.ui.core.Fragment.load({
                    id: oView.getId(),
                    name: "zppmigobatch.view.ToSlocVH", // Ensure this fragment is created
                    controller: this
                }).then(function (oDialog) {
                    this._oToSlocDialog = oDialog;
                    oView.addDependent(this._oToSlocDialog);
                    var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                    this._oToSlocDialog.getBinding("items").filter([oFilter]);
                    this._oToSlocDialog.open();
                }.bind(this));
            } else {
                var oFilter = new Filter("Plant", FilterOperator.EQ, sPlant);
                this._oToSlocDialog.getBinding("items").filter([oFilter]);
                this._oToSlocDialog.open();
            }
        },

        onToSlocVHSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var sPlant = this.getView().byId("inputPlant").getValue();
            var aFilters = [new Filter("Plant", FilterOperator.EQ, sPlant)];

            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("StorageLocation", FilterOperator.Contains, sValue),
                        new Filter("StorageLocationName", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onToSlocVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sSloc = oSelectedItem.getCells()[1].getText();
                this.getView().byId("inputToSloc").setValue(sSloc);
            }
        },

        // Fetch only the scanned batch; keep only accepted table rows locally.
        _requestBatch: async function (sBatch, oSelection) {
            var sServiceUri = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/mainService/uri");
            var sFilter = [
                ["Plant", oSelection.plant],
                ["StorageLocation", oSelection.fromSloc],
                ["Batch", sBatch],
                ["Material", oSelection.material]
            ].map(function (aPair) {
                return aPair[0] + " eq '" + aPair[1].replace(/'/g, "''") + "'";
            }).join(" and ");
            var sUrl = sServiceUri.replace(/\/?$/, "/") + "so_batchs?sap-client=100&$filter=" + encodeURIComponent(sFilter);
            var oResponse = await fetch(sUrl, {
                credentials: "same-origin",
                cache: "no-store",
                headers: { "Accept": "application/json" }
            });
            var oData = await oResponse.json();
            if (!oResponse.ok) {
                var vMessage = oData.error && oData.error.message;
                throw new Error((vMessage && (vMessage.value || vMessage)) || "Failed to fetch batch " + sBatch + ".");
            }
            return oData.value || [];
        },

        onAddBatch: async function () {
            if (this._bBatchRequestPending) {
                return;
            }
            var oView = this.getView();
            var oInput = oView.byId("batchInput");
            var sInput = oInput.getValue().trim();
            var oLocalModel = oView.getModel("local");
            var oSelection = Object.assign({}, oLocalModel.getProperty("/selection"));
            if (!oSelection.salesOrder || !oSelection.salesOrderItem || !oSelection.material ||
                    !oSelection.plant || !oSelection.fromSloc) {
                MessageBox.error("Please enter Sales Order, Item, Plant and From Storage Location, and wait for the item material to load.");
                return;
            }
            if (!sInput) {
                MessageToast.show("Please enter or scan a batch.");
                return;
            }

            var aMessages = [];
            var iAdded = 0;
            this._bBatchRequestPending = true;
            oView.setBusy(true);
            try {
                for (var sBatch of sInput.split(/\s+/)) {
                    var aScanned = oLocalModel.getProperty("/scannedBatches") || [];
                    if (aScanned.some(function (oRow) { return oRow.batch === sBatch; })) {
                        aMessages.push("Batch " + sBatch + " is already added.");
                        continue;
                    }
                    try {
                        var aRows = await this._requestBatch(sBatch, oSelection);
                        if (!aRows.length) {
                            aMessages.push("No data returned for batch " + sBatch + ".");
                            continue;
                        }
                        var aErrors = aRows.filter(function (oRow) {
                            return String(oRow.Status).toUpperCase() !== "SUCCESS" ||
                                ["E", "A", "X"].indexOf(String(oRow.MessageType).toUpperCase()) !== -1;
                        });
                        if (aErrors.length) {
                            aErrors.forEach(function (oRow) {
                                aMessages.push(oRow.Message || "Batch " + sBatch + " validation failed.");
                            });
                            continue;
                        }
                        aRows.forEach(function (oRow) {
                            aScanned.push({
                                batch: oRow.Batch,
                                salesOrder: oSelection.salesOrder,
                                salesOrderItem: oSelection.salesOrderItem,
                                fromSloc: oSelection.fromSloc,
                                toSloc: oSelection.toSloc,
                                material: oRow.Material,
                                description: oRow.ProductDescription,
                                qty: oRow.QTY,
                                uom: oRow.MaterialBaseUnit
                            });
                        });
                        oLocalModel.setProperty("/scannedBatches", aScanned);
                        iAdded += aRows.length;
                    } catch (oError) {
                        aMessages.push(oError.message || "Failed to fetch batch " + sBatch + ".");
                    }
                }
                this._calculateTotalYield();
                oInput.setValue("");
            } finally {
                this._bBatchRequestPending = false;
                oView.setBusy(false);
                oInput.focus();
            }
            if (iAdded) {
                MessageToast.show("Added " + iAdded + " batch row(s).");
            }
            if (aMessages.length) {
                MessageBox.error(aMessages.join("\n"));
            }
        },

        // ==========================================
        // DELETE SELECTED BATCHES
        // ==========================================
        onDeleteBatch: function (oEvent) {
            var oView = this.getView();
            var oTable = oView.byId("batchesTable");
            var oLocalModel = oView.getModel("local");


            var aSelectedContexts = oTable.getSelectedContexts();


            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select at least one batch to delete.");
                return;
            }


            var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];


            var aSelectedObjects = aSelectedContexts.map(function (oContext) {
                return oContext.getObject();
            });

            // remainingBatches will contain only those batches that were NOT selected for deletion
            var aRemainingBatches = aScannedBatches.filter(function (oBatch) {
                return aSelectedObjects.indexOf(oBatch) === -1;
            });

            // 6. Push the new, smaller array back to the model
            oLocalModel.setProperty("/scannedBatches", aRemainingBatches);

            // 7. Clear the checkboxes so they don't stay ghost-selected
            oTable.removeSelections(true);

            this._calculateTotalYield();
            sap.m.MessageToast.show(aSelectedContexts.length + " batch(es) deleted.");
        },

        _calculateTotalYield: function () {
            var oLocalModel = this.getView().getModel("local");
            var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];
            var fTotalQty = 0;

            // Loop through all scanned batches and sum the quantity
            aScannedBatches.forEach(function (oBatch) {
                // Parse float to ensure mathematical addition, not string concatenation
                fTotalQty += parseFloat(oBatch.qty) || 0;
            });

            // Set the total back to the model, rounded to 2 decimal places (optional)
            oLocalModel.setProperty("/selection/yieldQty", fTotalQty.toFixed(3));
        },

        // ==========================================
        // FOOTER BUTTON ACTIONS
        // ==========================================

        onNew: function () {
            // Logic to clear the screen for a new entry
            var oLocalModel = this.getView().getModel("local");

            // Clear the scanned batches array
            oLocalModel.setProperty("/scannedBatches", []);

            oLocalModel.setProperty("/selection/material", "");
            oLocalModel.setProperty("/selection/materialDescription", "");
            this._calculateTotalYield();

            // Reset the selection inputs if needed
            oLocalModel.setProperty("/selection/plant", "1200");
            oLocalModel.setProperty("/selection/salesOrder", "");
            oLocalModel.setProperty("/selection/salesOrderItem", "");
            oLocalModel.setProperty("/selection/remark", "");
            oLocalModel.setProperty("/selection/fromSloc", "1201");
            oLocalModel.setProperty("/selection/toSloc", "1210");
            sap.m.MessageToast.show("Screen cleared for new entry.");
        },

        // onCancel: function () {
        //     // Logic to cancel the current operation (e.g., navigate back)
        //     sap.m.MessageToast.show("Operation cancelled.");
        // },

        // ==========================================
        // SUBMIT TO BACKEND
        // ==========================================
        onSubmit: function () {
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var oODataModel = oView.getModel(); // Your primary OData V4 Model

            // 1. Get Data from Local Model
            var oSelection = oLocalModel.getProperty("/selection");
            var aScannedBatches = oLocalModel.getProperty("/scannedBatches") || [];

            // ==========================================
            // 2. VALIDATION
            // ==========================================
            if (!oSelection.plant || !oSelection.salesOrder || !oSelection.salesOrderItem ||
                !oSelection.fromSloc || !oSelection.toSloc || !oSelection.postingDate) {

                MessageBox.error("Please fill in all mandatory Order Details and Storage Details before submitting.");
                return;
            }

            if (aScannedBatches.length === 0) {
                MessageBox.error("Please scan at least one batch into the Batch Details table.");
                return;
            }

            // ==========================================
            // 3. FORMATTING THE PAYLOAD
            // ==========================================
            var oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            var sFormattedDate = oDateFormat.format(oSelection.postingDate);
            var sSalesOrder = oSelection.salesOrder.padStart(10, '0');
            var sSalesOrderItem = oSelection.salesOrderItem.padStart(6, '0');

            var aItemsPayload = aScannedBatches.map(function (oBatch) {
                return {
                    "Material": oBatch.material,
                    "Qty": String(oBatch.qty),
                    "Unit": oBatch.uom,
                    "Batch": oBatch.batch
                };
            });

            var oPayload = {
                "Salesorder": sSalesOrder,
                "Salesorderitem": sSalesOrderItem,
                "Plant": oSelection.plant,
                "PostingDate": sFormattedDate,
                "StorlocFrom": oSelection.fromSloc,
                "StorlocTo": oSelection.toSloc,
                "Remark": oSelection.remark || "",
                "_Item": aItemsPayload
            };

            // ==========================================
            // 4. ODATA V4 POST REQUEST
            // ==========================================
            oView.setBusy(true);

            var oListBinding = oODataModel.bindList("/ZC_MIGO_HD");
            var oContext = oListBinding.create(oPayload);

            oContext.created().then(function () {
                oView.setBusy(false);

                // Fetch the returned fields from SAP
                var sMatDoc = oContext.getProperty("MatDoc");
                var sMess = oContext.getProperty("Mess"); // Fetch backend message if available

                // THE FIX: Check if we actually got a Material Document
                if (sMatDoc && sMatDoc.trim() !== "") {
                    // SUCCESS PATH
                    var sMessage = "Material Document " + sMatDoc + " created successfully!";
                    MessageBox.success(sMessage, {
                        onClose: function () {
                            // Automatically clear the screen after success
                            oLocalModel.setProperty("/scannedBatches", []);
                            oLocalModel.setProperty("/selection/plant", "1200");
                            oLocalModel.setProperty("/selection/salesOrder", "");
                            oLocalModel.setProperty("/selection/salesOrderItem", "");
                            oLocalModel.setProperty("/selection/fromSloc", "1201");
                            oLocalModel.setProperty("/selection/toSloc", "1210");
                            oLocalModel.setProperty("/selection/remark", "");

                            oLocalModel.setProperty("/selection/material", "");
                            oLocalModel.setProperty("/selection/materialDescription", "");
                            oLocalModel.setProperty("/selection/yieldQty", "");

                            // Put cursor back at the plant
                            var oPlantInput = oView.byId("inputPlant");
                            if (oPlantInput) {
                                oPlantInput.focus();
                            }
                        }
                    });
                } else {
                    // ERROR PATH: The HTTP call worked, but the ABAP BAPI failed!
                    var sBackendError = sMess ? sMess : "Backend failed to generate a Material Document.";
                    MessageBox.error("SAP Business Error: \n\n" + sBackendError);
                }

            }).catch(function (oError) {
                oView.setBusy(false);

                // Network or Framework Error
                var sErrorMsg = "Failed to post Material Document due to a network/server error.";
                if (oError && oError.message) {
                    sErrorMsg = oError.message;
                }
                MessageBox.error(sErrorMsg);
            });
        },

        // ==========================================
        // EXPORT TO EXCEL LOGIC
        // ==========================================
        onExportExcel: function () {
            var oView = this.getView();
            var oLocalModel = oView.getModel("local");
            var aScannedBatches = oLocalModel.getProperty("/scannedBatches");

            // 1. Check if there is actually data to export
            if (!aScannedBatches || aScannedBatches.length === 0) {
                sap.m.MessageToast.show("There are no scanned batches to export.");
                return;
            }

            // 2. Fetch the column configuration
            var aCols = this._createColumnConfig();

            // 3. Configure the Excel document settings
            var oSettings = {
                workbook: {
                    columns: aCols,
                    hierarchyLevel: 'Level'
                },
                dataSource: aScannedBatches,      // Feed it our local JSON array
                fileName: 'Scanned_Batches.xlsx', // Name of the downloaded file
                worker: false                     // Set to false for local JSON data
            };

            // 4. Build and download the spreadsheet
            var oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },

        // Helper function to define Excel columns
        _createColumnConfig: function () {
            var EdmType = exportLibrary.EdmType;

            return [
                {
                    label: 'Batch Number',
                    property: 'batch',
                    type: EdmType.String
                },
                {
                    label: 'Sales Order',
                    property: 'salesOrder',
                    type: EdmType.String
                },
                {
                    label: 'Sales Order Item',
                    property: 'salesOrderItem',
                    type: EdmType.String
                },
                {
                    label: 'From Storage Location',
                    property: 'fromSloc',
                    type: EdmType.String
                },
                {
                    label: 'To Storage Location',
                    property: 'toSloc',
                    type: EdmType.String
                },
                {
                    label: 'Material',
                    property: 'material',
                    type: EdmType.String
                },
                {
                    label: 'Description',
                    property: 'description',
                    type: EdmType.String
                },
                {
                    label: 'Quantity',
                    property: 'qty',
                    type: EdmType.Number
                },
                {
                    label: 'Unit of Measure',
                    property: 'uom',
                    type: EdmType.String
                }
            ];
        },
    });
});