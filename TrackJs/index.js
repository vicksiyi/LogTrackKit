var TrackJS = (function (global, document, undefined) {
    "use awesome";

    // Utility functions
    var Util = {
        isFunction: function (fn) {
            return typeof fn === "function";
        },
        hasOwn: function (obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        },
        defaults: function (target, ...sources) {
            sources.forEach(source => {
                for (let key in source) {
                    if (Util.hasOwn(source, key) && (target[key] === undefined)) {
                        target[key] = source[key];
                    }
                }
            });
            return target;
        },
        uuid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        isoNow: function () {
            return (new Date()).toISOString();
        },
        merge: function (target, source) {
            for (var key in source) {
                if (Util.hasOwn(source, key)) {
                    target[key] = source[key];
                }
            }
            return target;
        }
    };

    // Error wrapper
    var ErrorWrapper = function (config, onError) {
        this.config = config;
        this.onError = onError;
        if (config.enabled) {
            this.watch();
        }
    };

    ErrorWrapper.prototype = {
        watch: function () {
            ["EventTarget", "Node", "XMLHttpRequest"].forEach(target => {
                if (Util.hasOwn(global, `${target}.prototype.addEventListener`)) {
                    this.wrapEventTarget(global[target].prototype);
                }
            });
            this.wrapTimer("setTimeout");
            this.wrapTimer("setInterval");
        },
        wrap: function (fn) {
            var self = this;
            function wrapped() {
                try {
                    return fn.apply(this, arguments);
                } catch (error) {
                    self.onError("catch", error, { bindTime: bindTime, bindStack: bindStack });
                    throw Util.wrapError(error);
                }
            }

            try {
                if (!Util.isFunction(fn) || Util.hasOwn(fn, "__trackjs__")) return fn;
                if (Util.hasOwn(fn, "__trackjs_state__")) return fn.__trackjs_state__;
            } catch (error) {
                return fn;
            }

            var bindTime, bindStack;
            if (self.config.bindStack) {
                try {
                    throw new Error();
                } catch (error) {
                    bindStack = error.stack;
                    bindTime = Util.isoNow();
                }
            }

            for (var prop in fn) {
                if (Util.hasOwn(fn, prop)) {
                    wrapped[prop] = fn[prop];
                }
            }
            wrapped.prototype = fn.prototype;
            wrapped.__trackjs__ = true;

            return fn.__trackjs_state__ = wrapped;
        },
        wrapEventTarget: function (proto) {
            if (Util.has(proto, "addEventListener.call") && Util.has(proto, "removeEventListener.call")) {
                Util.patch(proto, "addEventListener", function (orig) {
                    return function (type, listener, options) {
                        try {
                            if (listener.handleEvent) {
                                listener.handleEvent = this.wrap(listener.handleEvent);
                            }
                        } catch (error) { }
                        return orig.call(this, type, this.wrap(listener), options);
                    };
                });

                Util.patch(proto, "removeEventListener", function (orig) {
                    return function (type, listener, options) {
                        try {
                            listener = listener && (listener.__trackjs_state__ || listener);
                        } catch (error) { }
                        return orig.call(this, type, listener, options);
                    };
                });
            }
        },
        wrapTimer: function (timer) {
            var self = this;
            Util.patch(global, timer, function (orig) {
                return function (fn, delay) {
                    var args = Array.prototype.slice.call(arguments);
                    var callback = args[0];
                    if (Util.isFunction(callback)) {
                        args[0] = self.wrap(callback);
                    }
                    return orig.apply(this, args);
                };
            });
        }
    };

    // Configuration
    var Config = function (options) {
        if (!this.initCurrent(options)) {
            console.warn("[TrackJS] invalid config");
        }
    };

    Config.prototype = {
        current: {},
        defaults: {
            application: "",
            cookie: false,
            dedupe: true,
            dependencies: true,
            enabled: true,
            forwardingDomain: "",
            errorURL: "https://xxxxxx/capture",
            errorNoSSLURL: "http://xxxxxxx/capture",
            faultURL: "https://xxxxxx",
            usageURL: "https://xxxxxx",
            onError: function () { return true; },
            serialize: function (data) {
                if (data === "") return "Empty String";
                if (data === undefined) return "undefined";
                if (typeof data === "string" || typeof data === "number" || typeof data === "boolean" || typeof data === "function") {
                    return String(data);
                }
                if (data instanceof HTMLElement) {
                    var elementString = `<${data.tagName.toLowerCase()}`;
                    Array.from(data.attributes).forEach(attr => {
                        elementString += ` ${attr.name}="${attr.value}"`;
                    });
                    return elementString + ">";
                }
                if (typeof data === "symbol") {
                    return Symbol.prototype.toString.call(data);
                }
                try {
                    return JSON.stringify(data, function (key, value) {
                        if (value === undefined) return "undefined";
                        if (typeof value === "number" && isNaN(value)) return "NaN";
                        if (value instanceof Error) {
                            return { name: value.name, message: value.message, stack: value.stack };
                        }
                        if (value instanceof HTMLElement) {
                            return elementString(value);
                        }
                        return value;
                    }).replace(/"undefined"/g, "undefined").replace(/"NaN"/g, "NaN");
                } catch (error) {
                    var result = "";
                    for (var key in data) {
                        if (data.hasOwnProperty(key)) {
                            try {
                                result += `,"${key}":"${data[key]}"`;
                            } catch (error) { }
                        }
                    }
                    return result ? `{${result.replace(",", "")}}` : "Unserializable Object";
                }
            },
            sessionId: "",
            token: "",
            userId: "",
            version: "",
            callback: {
                enabled: true,
                bindStack: false
            },
            console: {
                enabled: true,
                display: true,
                error: true,
                warn: false,
                watch: ["log", "debug", "info", "warn", "error"]
            },
            navigation: { enabled: true },
            network: { enabled: true, error: true, fetch: true },
            visitor: { enabled: true },
            window: { enabled: true, promise: true }
        },
        initCurrent: function (options) {
            this.removeEmpty(options);
            if (this.validate(options, this.defaults, "[TrackJS] config", {})) {
                this.current = Util.defaults({}, options, this.defaults);
                return true;
            }
            this.current = Util.defaults({}, this.defaults);
            return false;
        },
        removeEmpty: function (options) {
            for (var key in options) {
                if (options.hasOwnProperty(key) && options[key] === undefined) {
                    delete options[key];
                }
            }
        },
        validate: function (options, defaults, prefix, initOnly) {
            var isValid = true;
            prefix = prefix || "";
            initOnly = initOnly || {};

            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    if (defaults.hasOwnProperty(key)) {
                        var expectedType = typeof defaults[key];
                        if (expectedType !== typeof options[key]) {
                            console.warn(`${prefix}.${key}: property must be type ${expectedType}.`);
                            isValid = false;
                        } else if (Array.isArray(options[key]) && !this.validateArray(options[key], defaults[key], `${prefix}.${key}`)) {
                            isValid = false;
                        } else if (options[key] !== null && typeof options[key] === "object") {
                            isValid = this.validate(options[key], defaults[key], `${prefix}.${key}`, initOnly[key]);
                        } else if (initOnly.hasOwnProperty(key)) {
                            console.warn(`${prefix}.${key}: property cannot be set after load.`);
                            isValid = false;
                        }
                    } else {
                        console.warn(`${prefix}.${key}: property not supported.`);
                        isValid = false;
                    }
                }
            }

            return isValid;
        },
        validateArray: function (array, defaultArray, prefix) {
            var isValid = true;
            prefix = prefix || "";

            array.forEach((item, index) => {
                if (!defaultArray.includes(item)) {
                    console.warn(`${prefix}[${index}]: invalid value: ${item}.`);
                    isValid = false;
                }
            });

            return isValid;
        }
    };

    // Event Tracker
    var EventTracker = {
        trackEvent: function (event) {
            if (!Config.token) {
                console.warn("TrackJS: No token configured.");
                return;
            }

            var payload = {
                token: Config.token,
                application: Config.application,
                version: Config.version,
                userId: Config.userId,
                sessionId: Config.sessionId,
                event: event,
                timestamp: new Date().toISOString()
            };

            // Send payload to the endpoint
            var xhr = new XMLHttpRequest();
            xhr.open("POST", Config.endpoint, true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.send(JSON.stringify(payload));
        }
    };

    // Error Tracker
    var ErrorTracker = {
        trackError: function (error) {
            var errorEvent = {
                message: error.message,
                stack: error.stack,
                line: error.lineNumber,
                column: error.columnNumber,
                fileName: error.fileName
            };
            EventTracker.trackEvent({
                type: "error",
                data: errorEvent
            });
        }
    };

    // Console Tracker
    var ConsoleTracker = (function () {
        var originalConsoleError = console.error;

        return {
            initialize: function () {
                if (!Config.console) return;

                console.error = function () {
                    var args = Array.prototype.slice.call(arguments);
                    ErrorTracker.trackError({
                        message: args.join(" "),
                        stack: new Error().stack
                    });

                    originalConsoleError.apply(console, args);
                };
            }
        };
    })();

    // Network Tracker
    var NetworkTracker = (function () {
        var originalXhrSend = XMLHttpRequest.prototype.send;

        return {
            initialize: function () {
                if (!Config.network) return;

                XMLHttpRequest.prototype.send = function () {
                    this.addEventListener("error", function () {
                        ErrorTracker.trackError({
                            message: "Network request failed",
                            stack: new Error().stack,
                            fileName: this.responseURL
                        });
                    });
                    originalXhrSend.apply(this, arguments);
                };
            }
        };
    })();

    // Resource Tracker
    var ResourceTracker = {
        trackResource: function (resource) {
            EventTracker.trackEvent({
                type: "resource",
                data: resource
            });
        }
    };

    // Initialization
    var TrackJS = {
        initialize: function (options) {
            Util.defaults(Config, options);
            ConsoleTracker.initialize();
            NetworkTracker.initialize();

            global.addEventListener("error", function (event) {
                ErrorTracker.trackError(event.error);
            });

            global.addEventListener("unhandledrejection", function (event) {
                ErrorTracker.trackError({
                    message: event.reason.message,
                    stack: event.reason.stack
                });
            });

            global.addEventListener("load", function () {
                var resources = performance.getEntriesByType("resource");
                resources.forEach(function (resource) {
                    ResourceTracker.trackResource(resource);
                });
            });
        },
        configure: function (options) {
            Util.merge(Config, options);
        }
    };

    return TrackJS;
})(this, document);
