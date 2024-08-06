(function (window, document, encodeURIComponent) {
    const catchJsConfig = window.catch_js_config || {};
    let isRequestFailed = false;
    const isWebDriver = navigator.webdriver;
    const startTime = new Date();
    let errorQueue = [];
    let logQueue = [];
    let screenshotScriptLoaded = false;
    const LOG_BACKEND_API_URL = 'https://xxxxxxx.com/api';
    const PERFORMANCE_METRICS_API_URL = 'https://xxxxxxx/';

    function sendRequest(endpoint, data, callback, contentType = "text/plain") {
        if (!isRequestFailed) {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                isRequestFailed = xhr.status !== 200;
                if (callback) {
                    callback(xhr.responseText);
                }
            };
            xhr.open("POST", `${LOG_BACKEND_API_URL}/${endpoint}?domain=${encodeURIComponent(location.hostname)}`, true);
            xhr.setRequestHeader("Content-type", contentType);
            xhr.send(data);
        }
    }

    function handleErrors(message, source, lineno, colno, error) {
        const errorData = `msg=${encodeURIComponent(message)}&url=${encodeURIComponent(source)}&no=${encodeURIComponent(lineno)}&col=${encodeURIComponent(colno)}&name=${encodeURIComponent(error ? error.name : null)}&stack=${encodeURIComponent(error ? error.stack : null)}&r=${encodeURIComponent(location.href)}&w=${window.innerWidth}&h=${window.innerHeight}&b=${isWebDriver}&t=${new Date() - startTime}`;
        const timestamp = (new Date()).toISOString();
        sendRequest("err", errorData, function (response) {
            if (response && response.indexOf && response.indexOf("s") !== -1 && catchJsConfig.screenshots !== false) {
                response += timestamp;
                if (window.h2c_) {
                    window.h2c_(sendRequest, logQueue, response);
                } else if (!screenshotScriptLoaded) {
                    screenshotScriptLoaded = response;
                    const script = document.createElement("script");
                    document.body && document.body.appendChild(script);
                    script.crossOrigin = "anonymous";
                    script.onload = function () {
                        if (window.h2c_) {
                            window.h2c_(sendRequest, logQueue, screenshotScriptLoaded);
                        }
                    };
                    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
                }
            }
        });
    }

    function serializeData(data) {
        const serializedData = [];
        const processedObjects = new Map();
        let depth = 0;
        let queue = [[data, "$"]];
        let result;

        while (queue.length && depth < 500) {
            const [current, path] = queue.shift();
            let serialized;

            if (typeof current === "function") {
                serialized = `function ${current.name || ""}() {}`;
            } else if (typeof current === "string") {
                const maxLength = Math.max(20, 1000 / ++depth);
                serialized = current.length > maxLength ? current.substring(0, maxLength) + "<...>" : current;
            } else if (typeof current === "undefined") {
                serialized = void 0;
            } else if (current instanceof RegExp) {
                serialized = `\uaeef\ua6f4${current}`;
            } else if (current === null || ["boolean", "number"].includes(typeof current) || current instanceof Boolean || current instanceof Date || current instanceof Number) {
                serialized = current;
            } else if (processedObjects.has(current)) {
                serialized = { $ref: processedObjects.get(current) };
            } else if (Array.isArray(current)) {
                serialized = [];
                processedObjects.set(current, path);
                current.forEach((item, index) => {
                    queue.push([item, `${path}[${index}]`]);
                });
            } else {
                serialized = {};
                processedObjects.set(current, path);
                for (const key in current) {
                    if (current.hasOwnProperty(key)) {
                        try {
                            queue.push([current[key], `${path}.${key}`]);
                        } catch {
                            queue.push([current[key], `${path}["${key}"]`]);
                        }
                    }
                }
            }

            serializedData.push([serialized, path]);
        }

        serializedData.forEach(([item, path]) => {
            if (Array.isArray(item) && !item["\u0c44\ub9d3"]) {
                item.push("\u0c44\ub9d3");
                item["\u0c44\ub9d3"] = 1;
            }
        });

        result = serializedData.length ? serializedData[0][0] : {};
        return result;
    }

    function initialize() {
        if (!window.catchJs) {
            window.onerror = function (message, source, lineno, colno, error) {
                handleErrors(message, source, lineno, colno, error);
                return window.onerror.apply(window, arguments) || false;
            };

            if (window.console && window.console.error) {
                const originalConsoleError = window.console.error;
                window.console.error = function (message, ...args) {
                    if (message === "ERROR" && args[0] instanceof Error) {
                        handleErrors(args[0].message, "", 0, 0, args[0]);
                    } else {
                        window.catchJs.log("\uf260\u1bd2", args);
                    }
                    return originalConsoleError.apply(window.console, [message, ...args]) || false;
                };
            }

            window.catchJs = {
                log: function () {
                    if (window.Map) {
                        const logData = `log=${encodeURIComponent(JSON.stringify(serializeData(Array.prototype.slice.call(arguments))))}&r=${encodeURIComponent(location.href)}`;
                        sendRequest("log", logData);
                    }
                }
            };

            if (catchJsConfig.clicks !== false) {
                document.addEventListener("click", function (event) {
                    const target = event.target;
                    const path = [];
                    let currentElement = target;

                    while (currentElement && currentElement.nodeType !== 9) {
                        let selector = (currentElement.tagName || "").toLowerCase();
                        if (currentElement.id) selector += `#${currentElement.id}`;
                        if (currentElement.className && currentElement.className.split) {
                            selector += `.${currentElement.className.split(" ").join(".")}`;
                        }
                        path.unshift(selector);
                        currentElement = currentElement.parentNode;
                    }

                    logQueue.push({
                        x: event.pageX,
                        y: event.pageY,
                        html: target.cloneNode ? target.cloneNode(false).outerHTML : "",
                        path: path.join(" "),
                        time: (new Date()).toISOString()
                    });

                    if (logQueue.length > 10) {
                        logQueue.shift();
                    }
                });
            }

            if (!isWebDriver && navigator.sendBeacon) {
                let navigationMetrics = {};
                let visibilityStart = document.hidden ? null : new Date();
                let largestContentfulPaint = null;
                let layoutShiftScore = 0;
                let layoutShiftEntries = [];
                let clickDetected = false;

                function sendPerformanceMetrics() {
                    if (!visibilityStart) {
                        return;
                    }

                    const navigationTiming = performance.getEntriesByType && performance.getEntriesByType("navigation")[0] || performance.timing;
                    const navStart = navigationTiming.navigationStart || performance.timing.navigationStart;
                    const firstInputDelay = layoutShiftEntries.reduce((sum, entry) => sum + entry.value, 0);
                    const metrics = [
                        visibilityStart ? new Date() - visibilityStart : 0,
                        navigationTiming.domainLookupEnd - navStart,
                        navigationTiming.connectEnd - navStart,
                        navigationTiming.responseStart - navStart,
                        navigationTiming.loadEventEnd - navStart,
                        largestContentfulPaint || 0,
                        layoutShiftScore || 0,
                        layoutShiftEntries.length ? Math.round(65535 * firstInputDelay) : 0,
                        +document.hidden,
                        location.href
                    ].join("|");

                    navigator.sendBeacon(PERFORMANCE_METRICS_API_URL, metrics);
                }

                document.addEventListener("visibilitychange", function () {
                    if (document.hidden) {
                        sendPerformanceMetrics();
                    } else {
                        visibilityStart = new Date();
                    }
                });

                const performanceObserverOptions = { type: "paint", buffered: true };

                if (window.PerformanceObserver) {
                    new PerformanceObserver(function (list) {
                        list.getEntries().forEach(function (entry) {
                            if (entry.name === "first-contentful-paint") {
                                navigationMetrics.firstContentfulPaint = entry.startTime;
                            } else if (entry.name === "first-paint") {
                                navigationMetrics.firstPaint = entry.startTime;
                            }
                        });
                    }).observe(performanceObserverOptions);

                    new PerformanceObserver(function (list) {
                        list.getEntries().forEach(function (entry) {
                            if (!entry.hadRecentInput) {
                                layoutShiftEntries.push(entry);
                                layoutShiftScore += entry.value;
                            }
                        });
                    }).observe({ type: "layout-shift", buffered: true });

                    new PerformanceObserver(function (list) {
                        list.getEntries().forEach(function (entry) {
                            if (!clickDetected) {
                                largestContentfulPaint = entry.startTime;
                                clickDetected = true;
                            }
                        });
                    }).observe({ type: "largest-contentful-paint", buffered: true });

                    new PerformanceObserver(function (list) {
                        list.getEntries().forEach(function (entry) {
                            navigationMetrics.firstInputDelay = entry.processingStart - entry.startTime;
                        });
                    }).observe({ type: "first-input", buffered: true });
                }

                window.addEventListener("click", function () {
                    clickDetected = true;
                }, { once: true });

                window.addEventListener("keydown", function () {
                    clickDetected = true;
                }, { once: true });

                window.addEventListener("pagehide", sendPerformanceMetrics);
            }
        }
    }

    initialize();
})(window, document, encodeURIComponent);
