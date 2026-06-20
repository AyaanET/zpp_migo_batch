sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "zppmigobatch/model/models",   // <--- 1. ADD THIS IMPORT
    "sap/m/MessageBox",                        // <--- Add this
    "sap/ui/core/format/DateFormat"
], function (Controller, Filter, FilterOperator, MessageToast, Fragment, models, MessageBox, DateFormat) { // <--- 2. ADD 'models' HERE
    "use strict";

    return Controller.extend("zppmigobatch.controller.View1", {

        onInit: function () {
            var oLocalModel = models.createLocalModel();
            this.getView().setModel(oLocalModel, "local");
        },

        onSelectionChange: function () {
            var oView = this.getView();
            var sPlant = oView.byId("inputPlant").getValue().trim();
            var sFromSloc = oView.byId("inputFromSloc").getValue().trim();

            
            if (!sPlant || !sFromSloc) {
                
                sap.m.MessageToast.show("Please enter both Plant and From Storage Location to load batches.");
                
                
                var oLocalModel = oView.getModel("local");
                if (oLocalModel) {
                    oLocalModel.setProperty("/allBatches", []);
                }
                return; 
            }

           
            this._fetchBatchesInBackground(sPlant, sFromSloc);
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

                // this._fetchBatchesInBackground();
                this.onSelectionChange();
            }
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

        onSalesOrderVHConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (oSelectedItem) {
                var sSalesOrder = oSelectedItem.getCells()[0].getText();
                this.getView().byId("inputSalesOrder").setValue(sSalesOrder);
                this.getView().byId("inputSalesOrderItem").setValue("");
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
                var sSalesOrderItem = oSelectedItem.getCells()[0].getText();
                this.getView().byId("inputSalesOrderItem").setValue(sSalesOrderItem);
            }
        },

        // ==========================================
        // BACKGROUND CACHE LOGIC
        // ==========================================
        _fetchBatchesInBackground: function (sPlant, sFromSloc) {
            var oView = this.getView();
            // var sPlant = oView.byId("inputPlant").getValue().trim();
            // var sFromSloc = oView.byId("inputFromSloc").getValue().trim();

            console.log("Attempting fetch... Plant:", sPlant, " | SLoc:", sFromSloc);

            if (!sPlant || !sFromSloc) {
                return; 
            }

            var oModel = oView.getModel(); // Your OData V4 Model
            var aFilters = [
                new Filter("Plant", FilterOperator.EQ, sPlant),
                new Filter("StorageLocation", FilterOperator.EQ, sFromSloc)
            ];

            var mParameters = {
                "$select": "Batch,Plant,StorageLocation,Material,ProductDescription,QTY,MaterialBaseUnit"
            };

            var oListBinding = oModel.bindList("/ZI_GET_BATCHES", null, null, aFilters, mParameters);
            
            console.log("Sending network request to SAP...");

            oListBinding.requestContexts(0, 5000).then(function (aContexts) {
                var aAllBatches = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });
                
                console.log("Data successfully downloaded:", aAllBatches);
                oView.getModel("local").setProperty("/allBatches", aAllBatches);

                sap.m.MessageToast.show("Scanner Ready: Loaded " + aAllBatches.length + " batches.");
                
            }).catch(function(oError) {
                console.error("Fetch failed:", oError);
                sap.m.MessageToast.show("Failed to load background batches.");
            });
        },

        // ==========================================
        // SCAN VALIDATION & APPEND LOGIC
        // ==========================================
        onAddBatch: function (oEvent) {
            var oView = this.getView();
            var oInput = oView.byId("batchInput");
            
            var sScannedBatch = oInput.getValue().trim(); 
            var oLocalModel = oView.getModel("local");

            // Helper function to keep focus on the scanner input
            var retainFocus = function() {
                setTimeout(function() {
                    oInput.focus();
                }, 100);
            };

            if (!sScannedBatch) {
                sap.m.MessageToast.show("Please enter or scan a batch.");
                return;
            }

            var aAllBatches = oLocalModel.getProperty("/allBatches") || [];
            var aScanned = oLocalModel.getProperty("/scannedBatches") || [];

            var oFoundBatch = aAllBatches.find(function(b) {
                return b.Batch === sScannedBatch;
            });

            if (!oFoundBatch) {
                sap.m.MessageBox.error("Batch " + sScannedBatch + " not found or has 0 quantity in this Plant/SLoc.");
                oInput.setValue(""); 
                return;
            }

            var bAlreadyScanned = aScanned.some(function(b) {
                return b.batch === sScannedBatch;
            });

            if (bAlreadyScanned) {
                sap.m.MessageToast.show("Batch " + sScannedBatch + " is already added.");
                oInput.setValue("");
                return;
            }

            aScanned.push({
                batch:       oFoundBatch.Batch,
                material:    oFoundBatch.Material,
                description: oFoundBatch.ProductDescription,
                qty:         oFoundBatch.QTY,
                uom:         oFoundBatch.MaterialBaseUnit
            });

            oLocalModel.setProperty("/scannedBatches", aScanned);
            oInput.setValue("");

            // 3. Keep the cursor locked in the box so the user can scan the next item instantly!
            retainFocus();
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

            
            sap.m.MessageToast.show(aSelectedContexts.length + " batch(es) deleted.");
        },

        // ==========================================
        // FOOTER BUTTON ACTIONS
        // ==========================================
        
        onNew: function () {
            // Logic to clear the screen for a new entry
            var oLocalModel = this.getView().getModel("local");
            
            // Clear the scanned batches array
            oLocalModel.setProperty("/scannedBatches", []);
            
            // Reset the selection inputs if needed
            oLocalModel.setProperty("/selection/plant", "");
            oLocalModel.setProperty("/selection/salesOrder", "");
            oLocalModel.setProperty("/selection/salesOrderItem", "");
            
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
            
            // Check if all header fields are filled
            if (!oSelection.plant || !oSelection.salesOrder || !oSelection.salesOrderItem || 
                !oSelection.fromSloc || !oSelection.toSloc || !oSelection.postingDate) {
                
                MessageBox.error("Please fill in all mandatory Order Details and Storage Details before submitting.");
                return;
            }

            // Check if at least one batch is scanned
            if (aScannedBatches.length === 0) {
                MessageBox.error("Please scan at least one batch into the Batch Details table.");
                return;
            }

            // ==========================================
            // 3. FORMATTING THE PAYLOAD
            // ==========================================

            // Format the JavaScript Date object into "YYYY-MM-DD"
            var oDateFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            var sFormattedDate = oDateFormat.format(oSelection.postingDate);
            var sSalesOrder = oSelection.salesOrder.padStart(10, '0');
            var sSalesOrderItem = oSelection.salesOrderItem.padStart(6, '0');

            // Transform our local scanned array into the exact backend _Item structure
            var aItemsPayload = aScannedBatches.map(function(oBatch) {
                return {
                    "Material": oBatch.material,
                    "Qty": String(oBatch.qty), 
                    "Unit": oBatch.uom,
                    "Batch": oBatch.batch
                };
            });

            // Construct the final Header payload
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
            
            // Show a loading indicator
            oView.setBusy(true);

            // Bind to the main entity set
            var oListBinding = oODataModel.bindList("/ZC_MIGO_HD");

            
            var oContext = oListBinding.create(oPayload);

            
            oContext.created().then(function () {
                oView.setBusy(false);
                
                
                var sMatDoc = oContext.getProperty("MatDoc");
                
            
                var sMessage = sMatDoc 
                    ? "Material Document " + sMatDoc + " created successfully!" 
                    : "Material Document created successfully!";
                
                
                MessageBox.success(sMessage, {
                    onClose: function() {
                        // Automatically clear the screen after success
                        oLocalModel.setProperty("/scannedBatches", []);
                        oLocalModel.setProperty("/selection/plant", "");
                        oLocalModel.setProperty("/selection/salesOrder", "");
                        oLocalModel.setProperty("/selection/salesOrderItem", "");
                        oLocalModel.setProperty("/selection/remark", "");
                        
                        // Put cursor back at the plant
                        var oPlantInput = oView.byId("inputPlant");
                        if (oPlantInput) {
                            oPlantInput.focus(); 
                        }
                    }
                });

            }).catch(function (oError) {
                oView.setBusy(false);
                
                // Extract and show the exact error message from SAP
                var sError = oLocalModel.getProperty("Mess");
                var sErrorMsg = "Failed to post Material Document.";
                if (oError && oError.message) {
                    sErrorMsg = oError.message;
                }
                MessageBox.error(sErrorMsg);
            });
        }
    });
});