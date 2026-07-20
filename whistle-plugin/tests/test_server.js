"use strict";
/**
 * test_server.ts — mock HTTP server for E2E tests.
 *
 * Replaces the Python test_server.py — provides the same endpoints:
 *   GET /Model.desc    — returns FileDescriptorSet bytes (demo.Person)
 *   GET /api/person    — returns PB response with Charles self-describing Content-Type
 *   GET /api/data      — returns JSON response
 *
 * Uses protobufjs to build FileDescriptorSet dynamically (no .proto files).
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
exports.descBytes = exports.PORT = void 0;
exports.startServer = startServer;
exports.stopServer = stopServer;
const http = __importStar(require("http"));
const protobufjs_1 = __importDefault(require("protobufjs"));
const PORT = 8889;
exports.PORT = PORT;
// Build a FileDescriptorSet for demo.Person { string name = 1; int32 id = 2; }
function buildPersonDesc() {
    const root = new protobufjs_1.default.Root();
    const ns = new protobufjs_1.default.Namespace('demo', null, root);
    const person = new protobufjs_1.default.Type('Person', null, ns);
    person.add(new protobufjs_1.default.Field('name', 1, 'string', undefined, null, person));
    person.add(new protobufjs_1.default.Field('id', 2, 'int32', undefined, null, person));
    ns.add(person);
    root.add(ns);
    root.resolveAll();
    // Export as FileDescriptorSet
    const fds = root.toDescriptor();
    return protobufjs_1.default.FileDescriptorSet.encode(fds).finish();
}
// Create a demo.Person message
function buildPerson(name, id) {
    const root = new protobufjs_1.default.Root();
    const ns = new protobufjs_1.default.Namespace('demo', null, root);
    const person = new protobufjs_1.default.Type('Person', null, ns);
    person.add(new protobufjs_1.default.Field('name', 1, 'string', undefined, null, person));
    person.add(new protobufjs_1.default.Field('id', 2, 'int32', undefined, null, person));
    ns.add(person);
    root.add(ns);
    root.resolveAll();
    const MsgType = root.lookupType('demo.Person');
    const msg = MsgType.create({ name, id });
    return Buffer.from(MsgType.encode(msg).finish());
}
const descBytes = buildPersonDesc();
exports.descBytes = descBytes;
const server = http.createServer((req, res) => {
    if (req.url === '/Model.desc') {
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': descBytes.length,
        });
        res.end(descBytes);
        return;
    }
    if (req.url === '/api/person') {
        const personBytes = buildPerson('Alice', 42);
        const ct = `application/x-protobuf; desc="http://127.0.0.1:${PORT}/Model.desc"; messageType="demo.Person"`;
        res.writeHead(200, {
            'Content-Type': ct,
            'Content-Length': personBytes.length,
        });
        res.end(personBytes);
        return;
    }
    if (req.url === '/api/data') {
        const json = JSON.stringify({ game: { id: 1, name: 'TapTap' } });
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(json),
        });
        res.end(json);
        return;
    }
    res.writeHead(404);
    res.end('not found');
});
function startServer() {
    return new Promise((resolve) => {
        server.listen(PORT, '127.0.0.1', () => {
            console.log(`[test_server] listening on http://127.0.0.1:${PORT}`);
            resolve();
        });
    });
}
function stopServer() {
    return new Promise((resolve) => server.close(() => resolve()));
}
// Run directly
if (require.main === module) {
    startServer().then(() => {
        console.log('Press Ctrl+C to stop');
    });
}
