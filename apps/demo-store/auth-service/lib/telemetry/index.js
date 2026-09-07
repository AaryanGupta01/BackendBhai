"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyCaptureMiddleware = exports.patchConsoleLogs = exports.createLogger = exports.initTracing = void 0;
var tracing_1 = require("./tracing");
Object.defineProperty(exports, "initTracing", { enumerable: true, get: function () { return tracing_1.initTracing; } });
var logger_1 = require("./logger");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
Object.defineProperty(exports, "patchConsoleLogs", { enumerable: true, get: function () { return logger_1.patchConsoleLogs; } });
var bodyCapture_1 = require("./middleware/bodyCapture");
Object.defineProperty(exports, "bodyCaptureMiddleware", { enumerable: true, get: function () { return bodyCapture_1.bodyCaptureMiddleware; } });
//# sourceMappingURL=index.js.map