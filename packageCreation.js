/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/runtime'], function(record, log, runtime) {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.CREATE) return;

        try {
            //const fulfillmentRecord = context.newRecord;

            const fulfillmentRecordId = context.newRecord.id;
            const fulfillmentRecord = record.load({
                type: context.newRecord.type,
                id: fulfillmentRecordId,
                isDynamic: true // Enables sublist modifications
            });

            // Delete all existing packages
            const packageLineCount = fulfillmentRecord.getLineCount({ sublistId: 'package' });
            for (let i = packageLineCount - 1; i >= 0; i--) {
                fulfillmentRecord.removeLine({ sublistId: 'package', line: i });
            }
            log.debug({ title: 'Existing Packages Cleared', details: `${packageLineCount} packages removed.` });

            const lineCount = fulfillmentRecord.getLineCount({ sublistId: 'item' });

            log.debug({ title: 'Start Processing', details: `Processing ${lineCount} line items in Item Fulfillment` });

            for (let i = 0; i < lineCount; i++) {
                const itemId = fulfillmentRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                const itemQuantity = fulfillmentRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                const itemType = fulfillmentRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                log.debug({ itemType });
                const itemName = fulfillmentRecord.getSublistValue({ sublistId: 'item', fieldId: 'displayname', line: i });

                if (itemType === 'InvtPart') {
                    const itemRecord = record.load({ type: record.Type.INVENTORY_ITEM, id: itemId }); // Adjust based on item type
                    log.debug({ title: 'Item Loaded', details: `Item ID: ${itemId}, Name: ${itemName}, Type: ${itemType}, Quantity: ${itemQuantity}` });
                    const itemWeight = itemRecord.getValue({ fieldId: 'weight' });

                    for (let qty = 0; qty < itemQuantity; qty++) {
                        createPackage(fulfillmentRecord, itemName, itemWeight);
                        log.debug({ title: 'Inventory Item Package Created', details: `Item Name: ${itemName}, Weight: ${itemWeight}, Quantity: ${qty + 1}` });
                    }

                } else if (itemType === 'Kit') {
                    const itemRecord = record.load({ type: record.Type.KIT_ITEM, id: itemId }); // Adjust based on item type
                    log.debug({ title: 'Item Loaded', details: `Item ID: ${itemId}, Name: ${itemName}, Type: ${itemType}, Quantity: ${itemQuantity}` });
                    const memberItems = itemRecord.getSublist({ sublistId: 'member' });
                    const memberCount = itemRecord.getLineCount({ sublistId: 'member' });

                    log.debug({ title: 'Kit Item', details: `Kit Name: ${itemName}, Member Count: ${memberCount}` });

                    for (let j = 0; j < memberCount; j++) {
                        const memberWeight = itemRecord.getSublistValue({ sublistId: 'member', fieldId: 'weight', line: j });
                        log.debug({ memberWeight })
                        const memberQuantity = itemRecord.getSublistValue({ sublistId: 'member', fieldId: 'quantity', line: j });
                        log.debug({ memberQuantity })

                        for (let qty = 0; qty < (memberQuantity * itemQuantity); qty++) {
                            createPackage(fulfillmentRecord, itemName, memberWeight);
                            log.debug({ title: 'Kit Item Package Created', details: `Kit Name: ${itemName}, Member Weight: ${memberWeight}, Package Quantity: ${qty + 1}` });
                        }
                    }
                }
            }

            fulfillmentRecord.save();
            log.debug({ title: 'End Processing', details: 'Item Fulfillment packages created successfully.' });

        } catch (error) {
            log.error({ title: 'Error in afterSubmit for Item Fulfillment', details: error });
        }
    }

    function createPackage(fulfillmentRecord, description, weight) {
        fulfillmentRecord.selectNewLine({ sublistId: 'package' });
        fulfillmentRecord.setCurrentSublistValue({ sublistId: 'package', fieldId: 'packagedescr', value: description });
        fulfillmentRecord.setCurrentSublistValue({ sublistId: 'package', fieldId: 'packageweight', value: weight });
        fulfillmentRecord.commitLine({ sublistId: 'package' });
        log.debug({ title: 'Package Created', details: `Description: ${description}, Weight: ${weight}` });
    }

    return {
        afterSubmit: afterSubmit
    };
});
