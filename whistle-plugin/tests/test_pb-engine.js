"use strict";
/**
 * test_pb-engine.ts — unit tests for PBEngine, path-nav, rules.
 *
 * Run: node -e "require('./tests/test_pb-engine').run()"
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const assert = __importStar(require("assert"));
const protobufjs_1 = __importDefault(require("protobufjs"));
const pb_engine_1 = require("../src/pb-engine");
const path_nav_1 = require("../src/path-nav");
const rules_1 = require("../src/rules");
const content_type_1 = require("../src/content-type");
const field_tree_1 = require("../src/field-tree");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
// Build a demo.Person message type for testing
function buildDemoPerson() {
    const root = new protobufjs_1.default.Root();
    const ns = new protobufjs_1.default.Namespace('demo', null, root);
    const person = new protobufjs_1.default.Type('Person', null, ns);
    person.add(new protobufjs_1.default.Field('name', 1, 'string', undefined, null, person));
    person.add(new protobufjs_1.default.Field('id', 2, 'int32', undefined, null, person));
    ns.add(person);
    root.add(ns);
    root.resolveAll();
    const MsgType = root.lookupType('demo.Person');
    const fds = root.toDescriptor();
    const descBytes = Buffer.from(protobufjs_1.default.FileDescriptorSet.encode(fds).finish());
    return {
        MsgType,
        descBytes,
        encode: (data) => Buffer.from(MsgType.encode(MsgType.create(data)).finish()),
    };
}
const tests = [];
function test(name, fn) {
    tests.push({ name, fn });
}
// --- content-type tests ---
test('isPb detects protobuf content-type', () => {
    assert.ok((0, content_type_1.isPb)('application/x-protobuf'));
    assert.ok((0, content_type_1.isPb)('application/x-google-protobuf'));
    assert.ok(!(0, content_type_1.isPb)('application/json'));
    assert.ok(!(0, content_type_1.isPb)('text/html'));
    return Promise.resolve();
});
test('isJson detects json content-type', () => {
    assert.ok((0, content_type_1.isJson)('application/json', Buffer.alloc(0)));
    assert.ok((0, content_type_1.isJson)('application/json; charset=utf-8', Buffer.alloc(0)));
    assert.ok((0, content_type_1.isJson)('text/plain', Buffer.from('{"a":1}')));
    assert.ok(!(0, content_type_1.isJson)('text/plain', Buffer.from('not json')));
    return Promise.resolve();
});
test('parseCtParams parses Charles self-describing format', () => {
    const ct = 'application/x-protobuf; desc="http://host/Model.desc"; messageType="demo.Person"; delimited=true';
    const params = (0, content_type_1.parseCtParams)(ct);
    assert.strictEqual(params.desc, 'http://host/Model.desc');
    assert.strictEqual(params.messageType, 'demo.Person');
    assert.strictEqual(params.delimited, true);
    const bare = 'application/x-protobuf; desc=http://host/M.desc; messageType=demo.M';
    const params2 = (0, content_type_1.parseCtParams)(bare);
    assert.strictEqual(params2.desc, 'http://host/M.desc');
    assert.strictEqual(params2.messageType, 'demo.M');
    assert.strictEqual(params2.delimited, false);
    return Promise.resolve();
});
test('detect identifies PB and JSON', () => {
    const pbInfo = (0, content_type_1.detect)('application/x-protobuf; desc="http://h/d.desc"; messageType="m.T"', Buffer.alloc(0));
    assert.strictEqual(pbInfo.protocol, 'protobuf');
    assert.strictEqual(pbInfo.desc, 'http://h/d.desc');
    const jsonInfo = (0, content_type_1.detect)('application/json', Buffer.from('{}'));
    assert.strictEqual(jsonInfo.protocol, 'json');
    const none = (0, content_type_1.detect)('text/html', Buffer.from('<html>'));
    assert.strictEqual(none, null);
    return Promise.resolve();
});
// --- path-nav tests ---
test('parsePath parses dotted + indexed paths', () => {
    assert.deepStrictEqual((0, path_nav_1.parsePath)('a.b.c'), ['a', 'b', 'c']);
    assert.deepStrictEqual((0, path_nav_1.parsePath)('a.b[0].c'), ['a', 'b', 0, 'c']);
    assert.deepStrictEqual((0, path_nav_1.parsePath)('[0][1]'), [0, 1]);
    return Promise.resolve();
});
test('getByPath/setByPath navigate objects', () => {
    const obj = { a: { b: [{ c: 1 }] } };
    assert.strictEqual((0, path_nav_1.getByPath)(obj, ['a', 'b', 0, 'c']), 1);
    (0, path_nav_1.setByPath)(obj, ['a', 'b', 0, 'c'], 42);
    assert.strictEqual(obj.a.b[0].c, 42);
    return Promise.resolve();
});
// --- PBEngine tests ---
test('PBEngine decode/encode round-trip', async () => {
    const demo = buildDemoPerson();
    const descBytes = demo.descBytes;
    // Create a mock DescCache that returns our descBytes
    const mockCache = {
        get: async (url) => descBytes,
    };
    const engine = new pb_engine_1.PBEngine(mockCache);
    const descUrl = 'test://demo.desc';
    const messageType = 'demo.Person';
    // Encode
    const original = { name: 'Alice', id: 42 };
    const encoded = await engine.encode(descUrl, messageType, false, original);
    // Decode
    const decoded = await engine.decode(descUrl, messageType, false, encoded);
    assert.strictEqual(decoded.name, 'Alice');
    assert.strictEqual(decoded.id, 42);
});
test('PBEngine delimited encode/decode', async () => {
    const demo = buildDemoPerson();
    const mockCache = { get: async () => demo.descBytes };
    const engine = new pb_engine_1.PBEngine(mockCache);
    const descUrl = 'test://demo.desc';
    const messageType = 'demo.Person';
    const items = [
        { name: 'Alice', id: 1 },
        { name: 'Bob', id: 2 },
    ];
    const encoded = await engine.encode(descUrl, messageType, true, items);
    const decoded = await engine.decode(descUrl, messageType, true, encoded);
    assert.strictEqual(Array.isArray(decoded), true);
    assert.strictEqual(decoded.length, 2);
    assert.strictEqual(decoded[0].name, 'Alice');
    assert.strictEqual(decoded[1].name, 'Bob');
});
// --- field-tree tests ---
test('buildFieldTree builds tree with type annotations', async () => {
    const demo = buildDemoPerson();
    const mockCache = { get: async () => demo.descBytes };
    const engine = new pb_engine_1.PBEngine(mockCache);
    const msg = await engine.decode('test://demo.desc', 'demo.Person', false, demo.encode({ name: 'TestName', id: 99 }));
    const tree = (0, field_tree_1.buildFieldTree)(msg, demo.MsgType);
    assert.strictEqual(tree.messageType, 'demo.Person');
    assert.ok(tree.fields.length >= 2);
    const nameField = tree.fields.find(f => f.name === 'name');
    assert.ok(nameField);
    assert.strictEqual(nameField.type, 'string');
    assert.strictEqual(nameField.value, 'TestName');
    const idField = tree.fields.find(f => f.name === 'id');
    assert.ok(idField);
    assert.strictEqual(idField.type, 'int32');
    assert.strictEqual(idField.value, 99);
});
test('renderTree produces readable text', async () => {
    const demo = buildDemoPerson();
    const mockCache = { get: async () => demo.descBytes };
    const engine = new pb_engine_1.PBEngine(mockCache);
    const msg = await engine.decode('test://demo.desc', 'demo.Person', false, demo.encode({ name: 'Alice', id: 1 }));
    const tree = (0, field_tree_1.buildFieldTree)(msg, demo.MsgType);
    const text = (0, field_tree_1.renderTree)(tree);
    assert.ok(text.includes('demo.Person'));
    assert.ok(text.includes('name'));
    assert.ok(text.includes('Alice'));
    assert.ok(text.includes('(string)'));
});
// --- RuleEngine tests ---
test('RuleEngine add/dedup/delete', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbmockx-test-'));
    const rulesFile = path.join(tmpDir, 'rules.yaml');
    const mockDir = path.join(tmpDir, 'mock-data');
    fs.mkdirSync(mockDir, { recursive: true });
    const engine = new rules_1.RuleEngine(rulesFile, mockDir);
    // Add patch rule
    const r1 = new rules_1.MockRule({ type: 'patch', url_pattern: 'api/test', path: 'name', value: 'Mocked', protocol: 'protobuf' });
    engine.add(r1);
    assert.strictEqual(engine.list().length, 1);
    // Dedup: same url + type + path → replace
    const r2 = new rules_1.MockRule({ type: 'patch', url_pattern: 'api/test', path: 'name', value: 'Replaced' });
    engine.add(r2);
    assert.strictEqual(engine.list().length, 1);
    assert.strictEqual(engine.list()[0].value, 'Replaced');
    // Different path → new rule
    const r3 = new rules_1.MockRule({ type: 'patch', url_pattern: 'api/test', path: 'id', value: 99 });
    engine.add(r3);
    assert.strictEqual(engine.list().length, 2);
    // Delete
    assert.ok(engine.delete(r2.id));
    assert.strictEqual(engine.list().length, 1);
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
    return Promise.resolve();
});
test('RuleEngine matched filters by type/protocol', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbmockx-test-'));
    const engine = new rules_1.RuleEngine(path.join(tmpDir, 'rules.yaml'), path.join(tmpDir, 'mock-data'));
    engine.add(new rules_1.MockRule({ type: 'patch', url_pattern: 'api/test', path: 'name', value: 'x', protocol: 'protobuf' }));
    engine.add(new rules_1.MockRule({ type: 'map_remote', url_pattern: 'api/old', replacement: 'https://new.com' }));
    const pbPatches = engine.matched('http://api/test', 'protobuf', 'patch');
    assert.strictEqual(pbPatches.length, 1);
    const remotes = engine.matched('http://api/old', undefined, 'map_remote');
    assert.strictEqual(remotes.length, 1);
    // Protocol filter: patch with protocol=json should not match protobuf
    const jsonPatches = engine.matched('http://api/test', 'json', 'patch');
    assert.strictEqual(jsonPatches.length, 0);
    fs.rmSync(tmpDir, { recursive: true });
    return Promise.resolve();
});
test('RuleEngine save/reload round-trip', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbmockx-test-'));
    const rulesFile = path.join(tmpDir, 'rules.yaml');
    const engine = new rules_1.RuleEngine(rulesFile, path.join(tmpDir, 'mock-data'));
    engine.add(new rules_1.MockRule({ type: 'patch', url_pattern: 'api/x', path: 'name', value: 'test' }));
    engine.add(new rules_1.MockRule({ type: 'map_remote', url_pattern: 'api/old', replacement: 'https://new.com' }));
    assert.ok(engine.save());
    const engine2 = new rules_1.RuleEngine(rulesFile, path.join(tmpDir, 'mock-data'));
    const n = engine2.reload();
    assert.strictEqual(n, 2);
    assert.strictEqual(engine2.list().length, 2);
    fs.rmSync(tmpDir, { recursive: true });
    return Promise.resolve();
});
// --- Run ---
async function run() {
    console.log('Running pbmockx tests...\n');
    let passed = 0;
    let failed = 0;
    for (const { name, fn } of tests) {
        try {
            await fn();
            console.log(`  [PASS] ${name}`);
            passed++;
        }
        catch (e) {
            console.error(`  [FAIL] ${name}: ${e.message}`);
            failed++;
        }
    }
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}
if (require.main === module) {
    run();
}
