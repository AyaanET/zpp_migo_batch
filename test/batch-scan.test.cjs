const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup(response) {
    let controller;
    const requests = [], errors = [];
    const state = {
        '/selection': { salesOrder: '1', salesOrderItem: '10', material: "MID'NIGHT", plant: '3104', fromSloc: 'BDJ1' },
        '/scannedBatches': []
    };
    const model = { getProperty: p => state[p], setProperty: (p, v) => { state[p] = v; } };
    let input = '76543';
    const view = {
        getModel: () => model, setBusy: () => {},
        byId: () => ({ getValue: () => input, setValue: v => { input = v; }, focus: () => {} })
    };
    vm.runInNewContext(fs.readFileSync('webapp/controller/View1.controller.js', 'utf8'), {
        sap: { ui: { define: (deps, factory) => {
            controller = factory({ extend: (name, methods) => methods }, null, null,
                { show: () => {} }, null, {}, { error: m => errors.push(m) });
        } } },
        fetch: async (url, options) => {
            requests.push({ url, options });
            if (response instanceof Error) throw response;
            return { ok: true, json: async () => response };
        }
    });
    controller.getView = () => view;
    controller.getOwnerComponent = () => ({ getManifestEntry: () => '/service/' });
    return { controller, state, requests, errors };
}

test('successful scan requests exact filters and adds returned data; duplicate does not request again', async () => {
    const h = setup({ value: [{ Status: 'SUCCESS', MessageType: 'S', Batch: '76543', Material: "MID'NIGHT", QTY: '5.000', MaterialBaseUnit: 'KG' }] });
    await h.controller.onAddBatch();
    assert.equal(h.state['/scannedBatches'].length, 1);
    assert.equal(h.state['/selection/yieldQty'], '5.000');
    const url = new URL(h.requests[0].url, 'https://example.com');
    assert.equal(url.pathname, '/service/so_batchs');
    assert.equal(url.searchParams.get('sap-client'), '100');
    assert.equal(url.searchParams.get('$filter'), "Plant eq '3104' and StorageLocation eq 'BDJ1' and Batch eq '76543' and Material eq 'MID''NIGHT'");
    assert.equal(h.requests[0].options.cache, 'no-store');
});

test('business error shows backend message without adding a row', async () => {
    const h = setup({ value: [{ Status: 'ERROR', MessageType: 'E', Message: 'No positive stock found for batch 76543 in plant 3104' }] });
    await h.controller.onAddBatch();
    assert.equal(h.state['/scannedBatches'].length, 0);
    assert.match(h.errors[0], /No positive stock/);
});

test('empty responses and network failures do not add rows', async () => {
    for (const response of [{ value: [] }, new Error('Network unavailable')]) {
        const h = setup(response);
        await h.controller.onAddBatch();
        assert.equal(h.state['/scannedBatches'].length, 0);
        assert.equal(h.errors.length, 1);
        assert.equal(h.controller._bBatchRequestPending, false);
    }
});

test('missing material prevents requests', async () => {
    const h = setup({ value: [] });
    h.state['/selection'].material = '';
    await h.controller.onAddBatch();
    assert.equal(h.requests.length, 0);
    assert.equal(h.errors.length, 1);
});

test('duplicate scans do not request or append data', async () => {
    const h = setup({ value: [] });
    h.state['/scannedBatches'] = [{ batch: '76543', qty: '2.000' }];
    await h.controller.onAddBatch();
    assert.equal(h.requests.length, 0);
    assert.equal(h.state['/scannedBatches'].length, 1);
    assert.match(h.errors[0], /already added/);
});
