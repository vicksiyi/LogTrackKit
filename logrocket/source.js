!function () {
    var moduleDefinitions = {
        // done
        749: function (module, exports, require) {
            "use strict";
            var n = require(836);
            Object.defineProperty(exports, "__esModule", { value: true });
            var defaultExport = n(require(47)).default;
            exports.default = defaultExport;
        },
        // done
        47: function (module, exports, require) {
            "use strict";
            var n = require(836);
            Object.defineProperty(exports, "__esModule", { value: true });

            function logCaptureWrapper(e) {
                var methods = ["log", "warn", "info", "error", "debug"];
                var wrappers = [];

                methods.forEach(function (method) {
                    wrappers.push((0, i.default)(console, method, function () {
                        var args = Array.from(arguments);
                        e.addEvent("lr.core.LogEvent", function () {
                            var config = arguments[0] || {};
                            if (typeof config.isEnabled === "object" && !config.isEnabled[method] || !config.isEnabled) {
                                return null;
                            }
                            if (method === "error" && config.shouldAggregateConsoleErrors) {
                                a.Capture.captureMessage(e, args[0], args, {}, true);
                            }
                            return {
                                logLevel: method.toUpperCase(),
                                args: args
                            };
                        });
                    }));
                });

                return function () {
                    wrappers.forEach(function (unwrapper) {
                        unwrapper();
                    });
                };
            }

            exports.default = logCaptureWrapper;

            var o = n(require(698));
            var i = n(require(800));
            var a = require(476);
        },
        // done
        818: function (module, exports, require) {
            "use strict";
            var n = require(836);
            Object.defineProperty(exports, "__esModule", { value: true });

            function captureMessage(e, message, args, config = {}, isConsole = false) {
                var event = {
                    exceptionType: isConsole ? "CONSOLE" : "MESSAGE",
                    message: message,
                    messageArgs: args,
                    browserHref: window.location ? window.location.href : ""
                };
                (0, o.scrubException)(event, config);
                e.addEvent("lr.core.Exception", function () {
                    return event;
                });
            }

            function captureException(e, error, config = {}, stackTrace = null, exceptionType = "WINDOW") {
                var stack = stackTrace || i.default.computeStackTrace(error);
                var event = {
                    exceptionType: exceptionType,
                    errorType: stack.name,
                    message: stack.message,
                    browserHref: window.location ? window.location.href : ""
                };
                (0, o.scrubException)(event, config);
                var extraData = { _stackTrace: (0, a.default)(stack) };
                e.addEvent("lr.core.Exception", function () {
                    return event;
                }, extraData);
            }

            exports.captureMessage = captureMessage;
            exports.captureException = captureException;

            var o = require(731);
            var i = n(require(668));
            var a = n(require(751));
        },
        // done
        476: function (module, exports, require) {
            "use strict";

            // 导入必要的模块
            var importHelper = require(836);
            var exceptionScrubber = require(698);

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            // 导出 registerExceptions 方法
            Object.defineProperty(exports, "registerExceptions", {
                enumerable: true,
                get: function () {
                    return registerExceptions.default;
                }
            });

            // 定义 Capture 对象
            var Capture = {
                captureMessage: function (e, message, args, config = {}, isConsole = false) {
                    var event = {
                        exceptionType: isConsole ? "CONSOLE" : "MESSAGE",
                        message: message,
                        messageArgs: args,
                        browserHref: window.location ? window.location.href : ""
                    };
                    exceptionScrubber.scrubException(event, config);
                    e.addEvent("lr.core.Exception", function () {
                        return event;
                    });
                },

                captureException: function (e, error, config = {}, stackTrace = null, exceptionType = "WINDOW") {
                    var stack = stackTrace || stackTraceHelper.computeStackTrace(error);
                    var event = {
                        exceptionType: exceptionType,
                        errorType: stack.name,
                        message: stack.message,
                        browserHref: window.location ? window.location.href : ""
                    };
                    exceptionScrubber.scrubException(event, config);
                    var extraData = { _stackTrace: stackSerializer(stack) };
                    e.addEvent("lr.core.Exception", function () {
                        return event;
                    }, extraData);
                }
            };

            // 导出 Capture 对象
            exports.Capture = Capture;

            // 导入其他模块
            var registerExceptions = importHelper(require(239));
            var stackTraceHelper = importHelper(require(668));
            var stackSerializer = importHelper(require(751));
        },
        // done
        414: function (module, exports, require) {
            "use strict";

            // 导入必要的模块
            var importHelper = require(836);
            var eventReporter = require(668);

            // 定义 ErrorHandler 类
            class ErrorHandler {
                constructor(captureException) {
                    this._errorHandler = this._errorHandler.bind(this);
                    this._ignoreOnError = 0;
                    this._wrappedBuiltIns = [];
                    this.captureException = captureException;
                    eventReporter.default.report.subscribe(this._errorHandler);
                    this._instrumentTryCatch();
                }

                uninstall() {
                    // 移除错误处理程序并恢复原始方法
                    eventReporter.default.report.unsubscribe(this._errorHandler);
                    while (this._wrappedBuiltIns.length) {
                        var [object, method, original] = this._wrappedBuiltIns.shift();
                        object[method] = original;
                    }
                }

                _errorHandler(event) {
                    if (!this._ignoreOnError) this.captureException(event);
                }

                _ignoreNextOnError() {
                    // 忽略下一个 onError 事件
                    this._ignoreOnError += 1;
                    setTimeout(() => {
                        this._ignoreOnError -= 1;
                    });
                }

                context(e, t, r) {
                    // 包装方法并在上下文中执行
                    if (typeof e === "function") {
                        r = t || [];
                        t = e;
                        e = undefined;
                    }
                    return this.wrap(e, t).apply(this, r);
                }

                wrap(context, method, r) {
                    // 包装方法以捕获错误
                    if (typeof method === "undefined" && typeof context !== "function") return context;
                    if (typeof context === "function") {
                        method = context;
                        context = undefined;
                    }
                    if (typeof method !== "function") return method;

                    try {
                        if (method.__lr__) return method;
                        if (method.__lr_wrapper__) return method.__lr_wrapper__;
                        if (!Object.isExtensible(method)) return method;
                    } catch (e) {
                        return method;
                    }

                    const wrappedMethod = (...args) => {
                        try {
                            method.apply(this, args);
                        } catch (e) {
                            this.captureException(e);
                        }
                    };

                    for (const key in method) {
                        if (Object.prototype.hasOwnProperty.call(method, key)) {
                            wrappedMethod[key] = method[key];
                        }
                    }

                    wrappedMethod.prototype = method.prototype;
                    method.__lr_wrapper__ = wrappedMethod;
                    wrappedMethod.__lr__ = method;

                    return wrappedMethod;
                }

                _instrumentTryCatch() {
                    // 拦截常见的错误源
                    const global = typeof window !== "undefined" ? window :
                        typeof global !== "undefined" ? global :
                            typeof self !== "undefined" ? self : {};

                    // 拦截 XMLHttpRequest 错误
                    const XMLHttpRequest = global.XMLHttpRequest;
                    if (XMLHttpRequest && XMLHttpRequest.prototype) {
                        const xhrProto = XMLHttpRequest.prototype;
                        this._wrapBuiltIn(xhrProto, "open", function (original) {
                            return function (method, url) {
                                const resolvedUrl = global._lrUrl || method;
                                return original.call(this, resolvedUrl, url);
                            };
                        });

                        this._wrapBuiltIn(xhrProto, "send", function (original) {
                            return function (...args) {
                                this.addEventListener("error", (event) => {
                                    this._errorHandler(event.error || new Error("XMLHttpRequest failed"));
                                }, false);
                                this.addEventListener("load", (event) => {
                                    if (this.status >= 400) {
                                        this._errorHandler(event.error || new Error("XMLHttpRequest failed"));
                                    }
                                }, false);
                                return original.apply(this, args);
                            };
                        });
                    }

                    // 拦截 jQuery 错误
                    const jQuery = global.jQuery || global.$;
                    if (jQuery && jQuery.fn && jQuery.fn.ready) {
                        this._wrapBuiltIn(jQuery.fn, "ready", (original) => {
                            return (callback) => {
                                return original.call(this, this.wrap(callback));
                            };
                        });
                    }
                }

                _wrapBuiltIn(object, method, wrapper) {
                    // 包装内置方法
                    const original = object[method];
                    object[method] = wrapper(original);
                    this._wrappedBuiltIns.push([object, method, original]);
                }
            }

            // 导出 ErrorHandler 类
            exports.default = ErrorHandler;

            // 导入其他模块
            var objectHelper = importHelper(require(690));
            var typeHelper = importHelper(require(728));

        },
        // done
        239: function (module, exports, require) {
            "use strict";

            var captureException = require(818).default;
            var computeStackTrace = require(668).default;
            var scrubException = require(728).default;
            var parseStack = require(751).default;

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            exports.default = function initExceptionTracking(logRocketInstance) {
                const exceptionCapture = new captureException({
                    captureException: (error) => logRocketInstance.captureException(null, null, error)
                });

                const handleUnhandledRejection = (event) => {
                    if (event.reason instanceof Error) {
                        logRocketInstance.captureException(event.reason, null, null, "UNHANDLED_REJECTION");
                    } else {
                        logRocketInstance.addEvent("lr.core.Exception", () => ({
                            exceptionType: "UNHANDLED_REJECTION",
                            message: event.reason || "Unhandled Promise rejection"
                        }));
                    }
                };

                window.addEventListener("unhandledrejection", handleUnhandledRejection);

                return () => {
                    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
                    exceptionCapture.uninstall();
                };
            };

        },
        // done
        751: function (module, exports) {
            "use strict";

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            exports.default = function parseStackTrace(stack) {
                function safeGet(value) {
                    return value === null ? undefined : value;
                }

                return stack ? stack.map(frame => ({
                    lineNumber: safeGet(frame.line),
                    columnNumber: safeGet(frame.column),
                    fileName: safeGet(frame.url),
                    functionName: safeGet(frame.func)
                })) : undefined;
            };

        },
        // done
        650: function (module, exports, require) {
            "use strict";

            var reduce = require(690).default;
            var setActive = require(668).default;

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            let middleware = [];

            function processRequest(requestFunction, context, ...args) {
                let promise = Promise.resolve(args);

                middleware.forEach(({ request, requestError }) => {
                    if (request || requestError) {
                        promise = promise.then(
                            (params) => request ? request(context, ...params) : params,
                            (error) => requestError ? requestError(context, error) : Promise.reject(error)
                        );
                    }
                });

                promise = promise.then((params) => {
                    setActive(false);
                    try {
                        return requestFunction(...params);
                    } catch (error) {
                        throw error;
                    } finally {
                        setActive(true);
                    }
                });

                middleware.forEach(({ response, responseError }) => {
                    if (response || responseError) {
                        promise = promise.then(
                            (result) => response ? response(context, result) : result,
                            (error) => responseError ? responseError(context, error) : Promise.reject(error)
                        );
                    }
                });

                return promise;
            }

            function configureFetch(window) {
                if (window.fetch && window.Promise) {
                    const originalFetch = window.fetch;
                    let requestId = 0;

                    window.fetch = function (...args) {
                        return processRequest(originalFetch, requestId++, ...args);
                    };

                    if (originalFetch.polyfill) {
                        window.fetch.polyfill = originalFetch.polyfill;
                    }
                }
            }

            let initialized = false;

            const fetchMiddleware = {
                register: function (handler) {
                    if (!initialized) {
                        initialized = true;
                        configureFetch(window);
                    }
                    middleware.push(handler);

                    return function unregister() {
                        const index = middleware.indexOf(handler);
                        if (index >= 0) {
                            middleware.splice(index, 1);
                        }
                    };
                },
                clear: function () {
                    middleware = [];
                }
            };

            exports.default = fetchMiddleware;
        },
        // done
        986: function (module, exports, require) {
            "use strict";

            var computeStackTrace = require(668).default;
            var scrubException = require(728).default;
            var parseStackTrace = require(751).default;

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            exports.default = function captureException(logRocketInstance, error, options = {}, customStackTrace = null, context = "WINDOW") {
                const stackTrace = customStackTrace || computeStackTrace(error);
                const exceptionData = {
                    exceptionType: context,
                    errorType: stackTrace.name,
                    message: stackTrace.message,
                    browserHref: window.location ? window.location.href : ""
                };

                scrubException(exceptionData, options);

                const eventData = {
                    _stackTrace: parseStackTrace(stackTrace)
                };

                logRocketInstance.addEvent("lr.core.Exception", () => exceptionData, eventData);
            };
        },
        // done
        452: function (module, exports, require) {
            "use strict";

            var importHelper = require(836);
            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            exports.default = function ({ addRequest, addResponse, isIgnored }) {
                const prefix = "fetch-";

                function wrapRequest(requestId, request) {
                    if (isIgnored(request)) {
                        return request;
                    }
                    return addRequest(prefix + requestId, request);
                }

                function wrapResponse(requestId, response) {
                    if (isIgnored(response)) {
                        return response;
                    }
                    return addResponse(prefix + requestId, response);
                }

                return {
                    wrapRequest,
                    wrapResponse
                };
            };
        },
        // done
        863: function (module, exports, require) {
            "use strict";

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            exports.default = function ({ addRequest, addResponse, isIgnored }) {
                const prefix = "xhr-";

                function wrapRequest(requestId, request) {
                    if (isIgnored(request)) {
                        return request;
                    }
                    return addRequest(prefix + requestId, request);
                }

                function wrapResponse(requestId, response) {
                    if (isIgnored(response)) {
                        return response;
                    }
                    return addResponse(prefix + requestId, response);
                }

                return {
                    wrapRequest,
                    wrapResponse
                };
            };

        },
        // done
        989: function (module, exports, require) {
            "use strict";

            var importHelper = require(836);
            var scrubException = require(728).default;

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            exports.default = function captureException(logRocketInstance, error, options = {}, customStackTrace = null, context = "WINDOW") {
                const stackTrace = customStackTrace || computeStackTrace(error);
                const exceptionData = {
                    exceptionType: context,
                    errorType: stackTrace.name,
                    message: stackTrace.message,
                    browserHref: window.location ? window.location.href : ""
                };

                scrubException(exceptionData, options);

                const eventData = {
                    _stackTrace: parseStackTrace(stackTrace)
                };

                logRocketInstance.addEvent("lr.core.Exception", () => exceptionData, eventData);
            };

        },
        // done
        105: function (module, exports, require) {
            "use strict";

            var importHelper = require(836);

            Object.defineProperty(exports, "__esModule", {
                value: true
            });

            class RequestHandler {
                constructor({ addRequest, addResponse, isIgnored }) {
                    this.prefix = "request-";
                    this.addRequest = addRequest;
                    this.addResponse = addResponse;
                    this.isIgnored = isIgnored;
                }

                wrapRequest(requestId, request) {
                    if (this.isIgnored(request)) {
                        return request;
                    }
                    return this.addRequest(this.prefix + requestId, request);
                }

                wrapResponse(requestId, response) {
                    if (this.isIgnored(response)) {
                        return response;
                    }
                    return this.addResponse(this.prefix + requestId, response);
                }
            }

            exports.default = RequestHandler;
        },
        707: function (e, t) {
            "use strict";
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = void 0;
            var r = Date.now.bind(Date),
                n = r(),
                o = "undefined" != typeof performance && performance.now ? performance.now.bind(performance) :
                    function () {
                        return r() - n
                    };
            t.default = o
        },
        222: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function (e) {
                var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
                    r = t.stateSanitizer,
                    n = void 0 === r ? function (e) {
                        return e
                    } : r,
                    o = t.actionSanitizer,
                    a = void 0 === o ? function (e) {
                        return e
                    } : o;
                return function (t) {
                    return function (r, o, s) {
                        var l = t(r, o, s),
                            f = l.dispatch,
                            d = u++;
                        e.addEvent("lr.redux.InitialState", (function () {
                            var e;
                            try {
                                e = n(l.getState())
                            } catch (e) {
                                console.error(e.toString())
                            }
                            return {
                                state: e,
                                storeId: d
                            }
                        }));
                        return c(c({}, l), {}, {
                            dispatch: function (t) {
                                var r, o, c = (0, i.default)();
                                try {
                                    o = f(t)
                                } catch (e) {
                                    r = e
                                } finally {
                                    var u = (0, i.default)() - c;
                                    e.addEvent("lr.redux.ReduxAction", (function () {
                                        var e = null,
                                            r = null;
                                        try {
                                            e = n(l.getState()), r = a(t)
                                        } catch (e) {
                                            console.error(e.toString())
                                        }
                                        return e && r ? {
                                            storeId: d,
                                            action: r,
                                            duration: u,
                                            stateDelta: e
                                        } : null
                                    }))
                                }
                                if (r) throw r;
                                return o
                            }
                        })
                    }
                }
            };
            var o = n(r(416)),
                i = n(r(707));

            function a(e, t) {
                var r = Object.keys(e);
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(e);
                    t && (n = n.filter((function (t) {
                        return Object.getOwnPropertyDescriptor(e, t).enumerable
                    }))), r.push.apply(r, n)
                }
                return r
            }

            function c(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {};
                    t % 2 ? a(Object(r), !0).forEach((function (t) {
                        (0, o.default)(e, t, r[t])
                    })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(
                        r)) : a(Object(r)).forEach((function (t) {
                            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t))
                        }))
                }
                return e
            }
            var u = 0
        },
        43: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function (e) {
                var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
                    r = t.stateSanitizer,
                    n = void 0 === r ? function (e) {
                        return e
                    } : r,
                    a = t.actionSanitizer,
                    c = void 0 === a ? function (e) {
                        return e
                    } : a;
                return function (t) {
                    var r = i++;
                    return e.addEvent("lr.redux.InitialState", (function () {
                        var e;
                        try {
                            e = n(t.getState())
                        } catch (e) {
                            console.error(e.toString())
                        }
                        return {
                            state: e,
                            storeId: r
                        }
                    })),
                        function (i) {
                            return function (a) {
                                var u, s, l = (0, o.default)();
                                try {
                                    s = i(a)
                                } catch (e) {
                                    u = e
                                } finally {
                                    var f = (0, o.default)() - l;
                                    e.addEvent("lr.redux.ReduxAction", (function () {
                                        var e = null,
                                            o = null;
                                        try {
                                            e = n(t.getState()), o = c(a)
                                        } catch (e) {
                                            console.error(e.toString())
                                        }
                                        return e && o ? {
                                            storeId: r,
                                            action: o,
                                            duration: f,
                                            stateDelta: e
                                        } : null
                                    }))
                                }
                                if (u) throw u;
                                return s
                            }
                        }
                }
            };
            var o = n(r(707)),
                i = 0
        },
        94: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), Object.defineProperty(t, "createEnhancer", {
                enumerable: !0,
                get: function () {
                    return o.default
                }
            }), Object.defineProperty(t, "createMiddleware", {
                enumerable: !0,
                get: function () {
                    return i.default
                }
            });
            var o = n(r(222)),
                i = n(r(43))
        },
        668: function (e, t, r) {
            "use strict";
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = void 0;
            var n = {
                collectWindowErrors: !0,
                debug: !1
            },
                o = "undefined" != typeof window ? window : void 0 !== r.g ? r.g : "undefined" != typeof self ?
                    self : {},
                i = [].slice,
                a = "?",
                c =
                    /^(?:Uncaught (?:exception: )?)?((?:Eval|Internal|Range|Reference|Syntax|Type|URI)Error): ?(.*)$/;

            function u() {
                return "undefined" == typeof document || void 0 === document.location ? "" : document.location.href
            }
            n.report = function () {
                var e, t, r = [],
                    s = null,
                    l = null,
                    f = null;

                function d(e, t) {
                    var o = null;
                    if (!t || n.collectWindowErrors) {
                        for (var a in r)
                            if (r.hasOwnProperty(a)) try {
                                r[a].apply(null, [e].concat(i.call(arguments, 2)))
                            } catch (e) {
                                o = e
                            }
                        if (o) throw o
                    }
                }

                function p(t, r, o, i, s) {
                    if (f) n.computeStackTrace.augmentStackTraceWithInitialElement(f, r, o, t), v();
                    else if (s) d(n.computeStackTrace(s), !0);
                    else {
                        var l, p = {
                            url: r,
                            line: o,
                            column: i
                        },
                            g = void 0,
                            h = t;
                        if ("[object String]" === {}.toString.call(t)) (l = t.match(c)) && (g = l[1], h = l[
                            2]);
                        p.func = a, d({
                            name: g,
                            message: h,
                            url: u(),
                            stack: [p]
                        }, !0)
                    }
                    return !!e && e.apply(this, arguments)
                }

                function v() {
                    var e = f,
                        t = s;
                    s = null, f = null, l = null, d.apply(null, [e, !1].concat(t))
                }

                function g(e, t) {
                    var r = i.call(arguments, 1);
                    if (f) {
                        if (l === e) return;
                        v()
                    }
                    var o = n.computeStackTrace(e);
                    if (f = o, l = e, s = r, setTimeout((function () {
                        l === e && v()
                    }), o.incomplete ? 2e3 : 0), !1 !== t) throw e
                }
                return g.subscribe = function (n) {
                    ! function () {
                        if (t) return;
                        e = o.onerror, o.onerror = p, t = !0
                    }(), r.push(n)
                }, g.unsubscribe = function (e) {
                    for (var t = r.length - 1; t >= 0; --t) r[t] === e && r.splice(t, 1)
                }, g.uninstall = function () {
                    ! function () {
                        if (!t) return;
                        o.onerror = e, t = !1, e = void 0
                    }(), r = []
                }, g
            }(), n.computeStackTrace = function () {
                function e(e) {
                    if (void 0 !== e.stack && e.stack) {
                        for (var t, r, n =
                            /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|<anonymous>).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i,
                            o =
                                /^\s*(.*?)(?:\((.*?)\))?(?:^|@)((?:file|https?|blob|chrome|resource|\[native).*?)(?::(\d+))?(?::(\d+))?\s*$/i,
                            i =
                                /^\s*at (?:((?:\[object object\])?.+) )?\(?((?:file|ms-appx|https?|blob):.*?):(\d+)(?::(\d+))?\)?\s*$/i,
                            c = e.stack.split("\n"), s = [], l = (/^(.*) is undefined$/.exec(e.message),
                                0), f = c.length; l < f; ++l) {
                            if (t = n.exec(c[l])) {
                                var d = t[2] && -1 !== t[2].indexOf("native");
                                r = {
                                    url: d ? null : t[2],
                                    func: t[1] || a,
                                    args: d ? [t[2]] : [],
                                    line: t[3] ? +t[3] : null,
                                    column: t[4] ? +t[4] : null
                                }
                            } else if (t = i.exec(c[l])) r = {
                                url: t[2],
                                func: t[1] || a,
                                args: [],
                                line: +t[3],
                                column: t[4] ? +t[4] : null
                            };
                            else {
                                if (!(t = o.exec(c[l]))) continue;
                                r = {
                                    url: t[3],
                                    func: t[1] || a,
                                    args: t[2] ? t[2].split(",") : [],
                                    line: t[4] ? +t[4] : null,
                                    column: t[5] ? +t[5] : null
                                }
                            } !r.func && r.line && (r.func = a), s.push(r)
                        }
                        return s.length ? (s[0].column || void 0 === e.columnNumber || (s[0].column = e.columnNumber +
                            1), {
                            name: e.name,
                            message: e.message,
                            url: u(),
                            stack: s
                        }) : null
                    }
                }

                function t(e, t, r, n) {
                    var o = {
                        url: t,
                        line: r
                    };
                    if (o.url && o.line) {
                        if (e.incomplete = !1, o.func || (o.func = a), e.stack.length > 0 && e.stack[0].url ===
                            o.url) {
                            if (e.stack[0].line === o.line) return !1;
                            if (!e.stack[0].line && e.stack[0].func === o.func) return e.stack[0].line = o.line,
                                !1
                        }
                        return e.stack.unshift(o), e.partial = !0, !0
                    }
                    return e.incomplete = !0, !1
                }

                function r(e, i) {
                    for (var c, s, l = /function\s+([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)?\s*\(/i,
                        f = [], d = {}, p = !1, v = r.caller; v && !p; v = v.caller)
                        if (v !== o && v !== n.report) {
                            if (s = {
                                url: null,
                                func: a,
                                line: null,
                                column: null
                            }, v.name ? s.func = v.name : (c = l.exec(v.toString())) && (s.func = c[1]),
                                void 0 === s.func) try {
                                    s.func = c.input.substring(0, c.input.indexOf("{"))
                                } catch (e) { }
                            d["" + v] ? p = !0 : d["" + v] = !0, f.push(s)
                        } i && f.splice(0, i);
                    var g = {
                        name: e.name,
                        message: e.message,
                        url: u(),
                        stack: f
                    };
                    return t(g, e.sourceURL || e.fileName, e.line || e.lineNumber, e.message || e.description),
                        g
                }

                function o(t, o) {
                    var i = null;
                    o = null == o ? 0 : +o;
                    try {
                        if (i = e(t)) return i
                    } catch (e) {
                        if (n.debug) throw e
                    }
                    try {
                        if (i = r(t, o + 1)) return i
                    } catch (e) {
                        if (n.debug) throw e
                    }
                    return {
                        name: t.name,
                        message: t.message,
                        url: u()
                    }
                }
                return o.augmentStackTraceWithInitialElement = t, o.computeStackTraceFromStackProp = e, o
            }();
            var s = n;
            t.default = s
        },
        5: function (e, t) {
            "use strict";
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.DELIGHTED_FEEDBACK_PREFIX = t.DELIGHTED_RESPONSES_REGEX = t.WOOTRIC_RESPONSES_REGEX =
            void 0;
            t.WOOTRIC_RESPONSES_REGEX = /^https:\/\/production.wootric.com\/responses/;
            t.DELIGHTED_RESPONSES_REGEX = /^https:\/\/web.delighted.com\/e\/[a-zA-Z-]*\/c/;
            t.DELIGHTED_FEEDBACK_PREFIX = "comment="
        },
        // done
        800: function (module, exports) {
            "use strict";

            function instrumentConsole(console, method, callback) {
                var original = console[method];
                console[method] = function () {
                    callback.apply(null, arguments);
                    original.apply(console, arguments);
                };
                return function () {
                    console[method] = original;
                };
            }

            exports.default = instrumentConsole;
        },
        536: function (e, t) {
            "use strict";
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = void 0;
            var r = "undefined" != typeof console && console.error && console.error.bind ? console.error.bind(
                console) : function () { };
            t.default = r
        },
        645: function (e, t) {
            "use strict";
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function (e, t) {
                if (null == e) return {};
                var r = {};
                return Object.keys(e).forEach((function (n) {
                    r[n] = t(e[n])
                })), r
            }
        },
        167: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function (e) {
                var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : function () { };
                return function () {
                    var r;
                    try {
                        r = e.apply(void 0, arguments)
                    } catch (e) {
                        if ("undefined" != typeof window && window._lrdebug) throw e;
                        var n = t(e);
                        (0, i.default)("LogRocket", e), (0, o.default)(e, n)
                    }
                    return r
                }
            };
            var o = n(r(769)),
                i = n(r(536))
        },
        731: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.scrubException = function (e, t) {
                if (t) {
                    var r, n = i(u);
                    try {
                        for (n.s(); !(r = n.n()).done;) {
                            var o = r.value,
                                a = t[o];
                            c(a) && (e[o] = a.toString())
                        }
                    } catch (e) {
                        n.e(e)
                    } finally {
                        n.f()
                    }
                    var l, f = i(s);
                    try {
                        for (f.s(); !(l = f.n()).done;) {
                            for (var d = l.value, p = t[d] || {}, v = {}, g = 0, h = Object.keys(p); g < h.length; g++) {
                                var y = h[g],
                                    b = p[y];
                                c(b) && (v[y.toString()] = b.toString())
                            }
                            e[d] = v
                        }
                    } catch (e) {
                        f.e(e)
                    } finally {
                        f.f()
                    }
                }
            };
            var o = n(r(698));

            function i(e, t) {
                var r = "undefined" != typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
                if (!r) {
                    if (Array.isArray(e) || (r = function (e, t) {
                        if (!e) return;
                        if ("string" == typeof e) return a(e, t);
                        var r = Object.prototype.toString.call(e).slice(8, -1);
                        "Object" === r && e.constructor && (r = e.constructor.name);
                        if ("Map" === r || "Set" === r) return Array.from(e);
                        if ("Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r))
                            return a(e, t)
                    }(e)) || t && e && "number" == typeof e.length) {
                        r && (e = r);
                        var n = 0,
                            o = function () { };
                        return {
                            s: o,
                            n: function () {
                                return n >= e.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: e[n++]
                                }
                            },
                            e: function (e) {
                                throw e
                            },
                            f: o
                        }
                    }
                    throw new TypeError(
                        "Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
                    )
                }
                var i, c = !0,
                    u = !1;
                return {
                    s: function () {
                        r = r.call(e)
                    },
                    n: function () {
                        var e = r.next();
                        return c = e.done, e
                    },
                    e: function (e) {
                        u = !0, i = e
                    },
                    f: function () {
                        try {
                            c || null == r.return || r.return()
                        } finally {
                            if (u) throw i
                        }
                    }
                }
            }

            function a(e, t) {
                (null == t || t > e.length) && (t = e.length);
                for (var r = 0, n = new Array(t); r < t; r++) n[r] = e[r];
                return n
            }

            function c(e) {
                return /boolean|number|string/.test((0, o.default)(e))
            }
            var u = ["level", "logger"],
                s = ["tags", "extra"]
        },
        769: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.sendTelemetry = function (e, t) {
                if ("undefined" != typeof window && window._lrdebug) return void (0, i.default)(e);
                if (t && t.extra && t.extra.appID && "function" == typeof t.extra.appID.indexOf && 0 === t.extra
                    .appID.indexOf("au2drp/") && Math.random() >= .25) return;
                l(u({
                    message: e
                }, t))
            }, t.default = function (e, t) {
                try {
                    var r, n, o = e.message;
                    try {
                        r = JSON.stringify(t).slice(0, 1e3)
                    } catch (e) {
                        try {
                            r = "Could not stringify payload: ".concat(Object.prototype.toString.call(t))
                        } catch (e) { }
                    }
                    try {
                        n = a.default.computeStackTrace(e).stack.map((function (e) {
                            return {
                                filename: e.url,
                                lineno: e.line,
                                colno: e.column,
                                function: e.func || "?"
                            }
                        }))
                    } catch (e) { }
                    l({
                        message: o,
                        extra: {
                            stringPayload: r
                        },
                        exception: {
                            values: [{
                                type: e.type,
                                value: o,
                                stacktrace: {
                                    frames: n
                                }
                            }]
                        }
                    })
                } catch (e) {
                    (0, i.default)("Failed to send", e)
                }
            };
            var o = n(r(416)),
                i = n(r(536)),
                a = n(r(668));

            function c(e, t) {
                var r = Object.keys(e);
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(e);
                    t && (n = n.filter((function (t) {
                        return Object.getOwnPropertyDescriptor(e, t).enumerable
                    }))), r.push.apply(r, n)
                }
                return r
            }

            function u(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {};
                    t % 2 ? c(Object(r), !0).forEach((function (t) {
                        (0, o.default)(e, t, r[t])
                    })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(
                        r)) : c(Object(r)).forEach((function (t) {
                            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t))
                        }))
                }
                return e
            }
            var s = "082b4f2cbbfe110297f51e596de6ff5df0520f91";

            function l(e) {
                var t = window._lrXMLHttpRequest || XMLHttpRequest;
                try {
                    var r = new t,
                        n = e.message;
                    r.open("POST",
                        "https://e.logrocket.com/api/3/store/?sentry_version=7&sentry_client=http/3.8.0&sentry_key=b64162b4187a4c5caae8a68a7e291793"
                    ), r.send(JSON.stringify(u({
                        message: n,
                        logger: "javascript",
                        platform: "javascript",
                        request: {
                            headers: {
                                "User-Agent": "undefined" != typeof navigator && navigator.userAgent
                            },
                            url: "undefined" != typeof location && location.href
                        },
                        release: s,
                        environment: "staging"
                    }, e)))
                } catch (e) {
                    (0, i.default)("Failed to send", e)
                }
            }
        },
        242: function (e, t) {
            "use strict";
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function (e, t) {
                var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 0;
                return e && t && e.substring(r, r + t.length) === t
            }
        },
        868: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = t.MAX_QUEUE_SIZE = void 0;
            var o = n(r(690)),
                i = n(r(728)),
                a = n(r(416)),
                c = n(r(215)),
                u = n(r(986)),
                s = r(476),
                l = n(r(749)),
                f = r(94);

            function d(e, t) {
                var r = Object.keys(e);
                if (Object.getOwnPropertySymbols) {
                    var n = Object.getOwnPropertySymbols(e);
                    t && (n = n.filter((function (t) {
                        return Object.getOwnPropertyDescriptor(e, t).enumerable
                    }))), r.push.apply(r, n)
                }
                return r
            }

            function p(e) {
                for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {};
                    t % 2 ? d(Object(r), !0).forEach((function (t) {
                        (0, a.default)(e, t, r[t])
                    })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(
                        r)) : d(Object(r)).forEach((function (t) {
                            Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t))
                        }))
                }
                return e
            }
            t.MAX_QUEUE_SIZE = 1e3;
            var v = function () {
                function e() {
                    var t = this;
                    (0, o.default)(this, e), this._buffer = [], ["log", "info", "warn", "error", "debug"].forEach(
                        (function (e) {
                            t[e] = function () {
                                for (var r = arguments.length, n = new Array(r), o = 0; o < r; o++)
                                    n[o] = arguments[o];
                                t.addEvent("lr.core.LogEvent", (function () {
                                    return "error" === e && (arguments.length > 0 &&
                                        void 0 !== arguments[0] ? arguments[0] :
                                        {}).shouldAggregateConsoleErrors && s.Capture
                                            .captureMessage(t, n[0], n, {}, !0), {
                                        logLevel: e.toUpperCase(),
                                        args: n
                                    }
                                }), {
                                    shouldCaptureStackTrace: !0
                                })
                            }
                        })), this._isInitialized = !1, this._installed = [], window._lr_surl_cb = this.getSessionURL
                            .bind(this)
                }
                return (0, i.default)(e, [{
                    key: "addEvent",
                    value: function (e, t) {
                        var r = arguments.length > 2 && void 0 !== arguments[2] ? arguments[
                            2] : {},
                            n = Date.now();
                        this._run((function (o) {
                            o.addEvent(e, t, p(p({}, r), {}, {
                                timeOverride: n
                            }))
                        }))
                    }
                }, {
                    key: "onLogger",
                    value: function (e) {
                        for (this._logger = e; this._buffer.length > 0;) {
                            this._buffer.shift()(this._logger)
                        }
                    }
                }, {
                    key: "_run",
                    value: function (e) {
                        if (!this._isDisabled)
                            if (this._logger) e(this._logger);
                            else {
                                if (this._buffer.length >= 1e3) return this._isDisabled = !
                                    0, console.warn(
                                        "LogRocket: script did not load. Check that you have a valid network connection."
                                    ), void this.uninstall();
                                this._buffer.push(e.bind(this))
                            }
                    }
                }, {
                    key: "init",
                    value: function (e) {
                        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[
                            1] : {};
                        if (!this._isInitialized) {
                            var r, n = t.shouldAugmentNPS,
                                o = void 0 === n || n,
                                i = t.shouldParseXHRBlob,
                                a = void 0 !== i && i,
                                f = t.shouldDetectExceptions;
                            (void 0 === f || f) && this._installed.push((0, s.registerExceptions)
                                (this)), this._installed.push((0, u.default)(this, {
                                    shouldAugmentNPS: !!o,
                                    shouldParseXHRBlob: !!a,
                                    isDisabled: !1 === (null == t || null === (r =
                                        t.network) || void 0 === r ? void 0 :
                                        r.isEnabled)
                                })), this._installed.push((0, l.default)(this)), this._isInitialized = !
                                0, this._run((function (r) {
                                    r.init(e, function () {
                                        var e = arguments.length > 0 &&
                                            void 0 !== arguments[0] ?
                                            arguments[0] : {},
                                            t = e.ingestServer,
                                            r = (0, c.default)(e, [
                                                "ingestServer"]);
                                        return t ? p({
                                            serverURL: "".concat(t,
                                                "/i"),
                                            statsURL: "".concat(t,
                                                "/s")
                                        }, r) : r
                                    }(t))
                                }))
                        }
                    }
                }, {
                    key: "start",
                    value: function () {
                        this._run((function (e) {
                            e.start()
                        }))
                    }
                }, {
                    key: "uninstall",
                    value: function () {
                        this._installed.forEach((function (e) {
                            return e()
                        })), this._buffer = [], this._run((function (e) {
                            e.uninstall()
                        }))
                    }
                }, {
                    key: "identify",
                    value: function (e, t) {
                        this._run((function (r) {
                            r.identify(e, t)
                        }))
                    }
                }, {
                    key: "startNewSession",
                    value: function () {
                        this._run((function (e) {
                            e.startNewSession()
                        }))
                    }
                }, {
                    key: "track",
                    value: function (e, t) {
                        this._run((function (r) {
                            r.track(e, t)
                        }))
                    }
                }, {
                    key: "getSessionURL",
                    value: function (e) {
                        if ("function" != typeof e) throw new Error(
                            "LogRocket: must pass callback to getSessionURL()");
                        this._run((function (t) {
                            t.getSessionURL ? t.getSessionURL(e) : e(t.recordingURL)
                        }))
                    }
                }, {
                    key: "trackScrollEvent",
                    value: function (e) {
                        this._logger && this._logger.trackScrollEvent(e)
                    }
                }, {
                    key: "getVersion",
                    value: function (e) {
                        this._run((function (t) {
                            e(t.version)
                        }))
                    }
                }, {
                    key: "captureMessage",
                    value: function (e) {
                        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[
                            1] : {};
                        s.Capture.captureMessage(this, e, [e], t)
                    }
                }, {
                    key: "captureException",
                    value: function (e) {
                        var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[
                            1] : {};
                        s.Capture.captureException(this, e, t)
                    }
                }, {
                    key: "version",
                    get: function () {
                        return this._logger && this._logger.version
                    }
                }, {
                    key: "sessionURL",
                    get: function () {
                        return this._logger && this._logger.recordingURL
                    }
                }, {
                    key: "recordingURL",
                    get: function () {
                        return this._logger && this._logger.recordingURL
                    }
                }, {
                    key: "recordingID",
                    get: function () {
                        return this._logger && this._logger.recordingID
                    }
                }, {
                    key: "threadID",
                    get: function () {
                        return this._logger && this._logger.threadID
                    }
                }, {
                    key: "tabID",
                    get: function () {
                        return this._logger && this._logger.tabID
                    }
                }, {
                    key: "reduxEnhancer",
                    value: function () {
                        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[
                            0] : {};
                        return (0, f.createEnhancer)(this, e)
                    }
                }, {
                    key: "reduxMiddleware",
                    value: function () {
                        var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[
                            0] : {};
                        return (0, f.createMiddleware)(this, e)
                    }
                }, {
                    key: "isDisabled",
                    get: function () {
                        return !!(this._isDisabled || this._logger && this._logger._isDisabled)
                    }
                }]), e
            }();
            t.default = v
        },
        923: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function () {
                var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : function () { };
                if ("undefined" != typeof navigator && "ReactNative" === navigator.product) throw new Error(
                    i);
                if ("undefined" != typeof window) {
                    if (window._disableLogRocket) return a();
                    if (window.MutationObserver && window.WeakMap) {
                        window._lrMutationObserver = window.MutationObserver;
                        var t = new o.default;
                        return e(t), t
                    }
                }
                return a()
            };
            var o = n(r(868)),
                i =
                    "LogRocket on React Native requires the LogRocket React Native specific SDK. See setup guide here https://docs.logrocket.com/reference/react-native.",
                a = function () {
                    return {
                        init: function () { },
                        uninstall: function () { },
                        log: function () { },
                        info: function () { },
                        warn: function () { },
                        error: function () { },
                        debug: function () { },
                        addEvent: function () { },
                        identify: function () { },
                        start: function () { },
                        get threadID() {
                            return null
                        },
                        get recordingID() {
                            return null
                        },
                        get recordingURL() {
                            return null
                        },
                        reduxEnhancer: function () {
                            return function (e) {
                                return function () {
                                    return e.apply(void 0, arguments)
                                }
                            }
                        },
                        reduxMiddleware: function () {
                            return function () {
                                return function (e) {
                                    return function (t) {
                                        return e(t)
                                    }
                                }
                            }
                        },
                        track: function () { },
                        getSessionURL: function () { },
                        getVersion: function () { },
                        startNewSession: function () { },
                        onLogger: function () { },
                        setClock: function () { },
                        captureMessage: function () { },
                        captureException: function () { }
                    }
                }
        },
        974: function (e, t, r) {
            "use strict";
            var n = r(836);
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.default = function () {
                var e, t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
                    r = t.enterpriseServer,
                    n = t.sdkVersion,
                    c = void 0 === n ? "8.1.3" : n,
                    u = (0, o.default)(t, ["enterpriseServer", "sdkVersion"]),
                    s = "https://cdn-staging.logrocket.io";
                if ("script" === c) try {
                    var l = document.currentScript.src.match(/^(https?:\/\/([^\\]+))\/.+$/),
                        f = l && l[2];
                    f && a[f] && (s = l && l[1], e = a[f])
                } catch (e) { } else s = "https://cdn-staging.logr-ingest.com", e =
                    "https://staging-i.logr-ingest.com";
                var d = u.sdkServer || r,
                    p = u.ingestServer || r || e,
                    v = (0, i.default)((function () {
                        var e = document.createElement("script");
                        p && (void 0 === window.__SDKCONFIG__ && (window.__SDKCONFIG__ = {}),
                            window.__SDKCONFIG__.serverURL = "".concat(p, "/i"), window.__SDKCONFIG__
                                .statsURL = "".concat(p, "/s")), d ? e.src = "".concat(d,
                                    "/logger.min.js") : window.__SDKCONFIG__ && window.__SDKCONFIG__.loggerURL ?
                                e.src = window.__SDKCONFIG__.loggerURL : window._lrAsyncScript ? e.src =
                                    window._lrAsyncScript : e.src = "".concat(s, "/logger-1.min.js"), e.async = !
                                    0, document.head.appendChild(e), e.onload = function () {
                                        "function" == typeof window._LRLogger ? v.onLogger(new window._LRLogger({
                                            sdkVersion: c
                                        })) : (console.warn(
                                            "LogRocket: script execution has been blocked by a product or service."
                                        ), v.uninstall())
                                    }, e.onerror = function () {
                                        console.warn(
                                            "LogRocket: script could not load. Check that you have a valid network connection."
                                        ), v.uninstall()
                                    }
                    }));
                return v
            };
            var o = n(r(215)),
                i = n(r(923)),
                a = {
                    "cdn.logrocket.io": "https://r.logrocket.io",
                    "cdn.lr-ingest.io": "https://r.lr-ingest.io",
                    "cdn.lr-in.com": "https://r.lr-in.com",
                    "cdn.lr-in-prod.com": "https://r.lr-in-prod.com",
                    "cdn.lr-ingest.com": "https://r.lr-ingest.com",
                    "cdn.ingest-lr.com": "https://r.ingest-lr.com",
                    "cdn.lr-intake.com": "https://r.lr-intake.com",
                    "cdn.intake-lr.com": "https://r.intake-lr.com",
                    "cdn.logr-ingest.com": "https://r.logr-ingest.com",
                    "cdn-staging.logrocket.io": "https://staging-i.logrocket.io",
                    "cdn-staging.lr-ingest.io": "https://staging-i.lr-ingest.io",
                    "cdn-staging.lr-in.com": "https://staging-i.lr-in.com",
                    "cdn-staging.lr-in-prod.com": "https://staging-i.lr-in-prod.com",
                    "cdn-staging.lr-ingest.com": "https://staging-i.lr-ingest.com",
                    "cdn-staging.ingest-lr.com": "https://staging-i.ingest-lr.com",
                    "cdn-staging.lr-intake.com": "https://staging-i.lr-intake.com",
                    "cdn-staging.intake-lr.com": "https://staging-i.intake-lr.com",
                    "cdn-staging.logr-ingest.com": "https://staging-i.logr-ingest.com"
                }
        },
        897: function (e) {
            e.exports = function (e, t) {
                (null == t || t > e.length) && (t = e.length);
                for (var r = 0, n = new Array(t); r < t; r++) n[r] = e[r];
                return n
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        405: function (e, t, r) {
            var n = r(897);
            e.exports = function (e) {
                if (Array.isArray(e)) return n(e)
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        690: function (e) {
            e.exports = function (e, t) {
                if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        728: function (e, t, r) {
            var n = r(62);

            function o(e, t) {
                for (var r = 0; r < t.length; r++) {
                    var o = t[r];
                    o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0),
                        Object.defineProperty(e, n(o.key), o)
                }
            }
            e.exports = function (e, t, r) {
                return t && o(e.prototype, t), r && o(e, r), Object.defineProperty(e, "prototype", {
                    writable: !1
                }), e
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        416: function (e, t, r) {
            var n = r(62);
            e.exports = function (e, t, r) {
                return (t = n(t)) in e ? Object.defineProperty(e, t, {
                    value: r,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : e[t] = r, e
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        836: function (e) {
            e.exports = function (e) {
                return e && e.__esModule ? e : {
                    default: e
                }
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        498: function (e) {
            e.exports = function (e) {
                if ("undefined" != typeof Symbol && null != e[Symbol.iterator] || null != e["@@iterator"])
                    return Array.from(e)
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        281: function (e) {
            e.exports = function () {
                throw new TypeError(
                    "Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
                )
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        215: function (e, t, r) {
            var n = r(71);
            e.exports = function (e, t) {
                if (null == e) return {};
                var r, o, i = n(e, t);
                if (Object.getOwnPropertySymbols) {
                    var a = Object.getOwnPropertySymbols(e);
                    for (o = 0; o < a.length; o++) r = a[o], t.indexOf(r) >= 0 || Object.prototype.propertyIsEnumerable
                        .call(e, r) && (i[r] = e[r])
                }
                return i
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        71: function (e) {
            e.exports = function (e, t) {
                if (null == e) return {};
                var r, n, o = {},
                    i = Object.keys(e);
                for (n = 0; n < i.length; n++) r = i[n], t.indexOf(r) >= 0 || (o[r] = e[r]);
                return o
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        861: function (e, t, r) {
            var n = r(405),
                o = r(498),
                i = r(116),
                a = r(281);
            e.exports = function (e) {
                return n(e) || o(e) || i(e) || a()
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        36: function (e, t, r) {
            var n = r(698).default;
            e.exports = function (e, t) {
                if ("object" !== n(e) || null === e) return e;
                var r = e[Symbol.toPrimitive];
                if (void 0 !== r) {
                    var o = r.call(e, t || "default");
                    if ("object" !== n(o)) return o;
                    throw new TypeError("@@toPrimitive must return a primitive value.")
                }
                return ("string" === t ? String : Number)(e)
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        62: function (e, t, r) {
            var n = r(698).default,
                o = r(36);
            e.exports = function (e) {
                var t = o(e, "string");
                return "symbol" === n(t) ? t : String(t)
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        698: function (e) {
            function t(r) {
                return e.exports = t = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ?
                    function (e) {
                        return typeof e
                    } : function (e) {
                        return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ?
                            "symbol" : typeof e
                    }, e.exports.__esModule = !0, e.exports.default = e.exports, t(r)
            }
            e.exports = t, e.exports.__esModule = !0, e.exports.default = e.exports
        },
        116: function (e, t, r) {
            var n = r(897);
            e.exports = function (e, t) {
                if (e) {
                    if ("string" == typeof e) return n(e, t);
                    var r = Object.prototype.toString.call(e).slice(8, -1);
                    return "Object" === r && e.constructor && (r = e.constructor.name), "Map" === r ||
                        "Set" === r ? Array.from(e) : "Arguments" === r ||
                            /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? n(e, t) : void 0
                }
            }, e.exports.__esModule = !0, e.exports.default = e.exports
        }
    };
    // 创建模块缓存对象
    var moduleCache = {};

    // 模块加载函数
    function requireModule(moduleId) {
        // 检查模块是否已缓存
        var cachedModule = moduleCache[moduleId];
        if (cachedModule !== undefined) {
            return cachedModule.exports;
        }

        // 如果没有缓存，则创建新模块并缓存
        var module = moduleCache[moduleId] = { exports: {} };

        // 执行模块函数
        moduleDefinitions[moduleId](module, module.exports, requireModule);

        // 返回模块的导出内容
        return module.exports;
    }

    // 获取全局对象
    requireModule.globalObject = (function () {
        if (typeof globalThis === 'object') {
            return globalThis;
        }
        try {
            return this || new Function('return this')();
        } catch (e) {
            if (typeof window === 'object') {
                return window;
            }
        }
    })();

    // 定义全局变量
    var globalVar = {};

    // 自执行匿名函数
    (function () {
        "use strict";

        // 局部变量
        var exports = globalVar;
        var loadModule = requireModule(836);

        exports.default = undefined;

        // 创建新的对象并设置 sdkVersion 属性
        var sdkInstance = (0, loadModule(requireModule(974)).default)({
            sdkVersion: "script"
        });

        // 设置默认导出
        exports.default = sdkInstance;

    })();

    // 设置全局变量 LogRocket
    this.LogRocket = globalVar.default;
}();