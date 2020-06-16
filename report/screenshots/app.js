var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "Test App|Drag Drop Action",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 15092,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c9004f-0088-00be-00f8-008c00c6000d.png",
        "timestamp": 1592111501610,
        "duration": 22426
    },
    {
        "description": "hii|hiii",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 2840,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004e00f5-00f3-002c-005b-007f008800e1.png",
        "timestamp": 1592112402524,
        "duration": 19
    },
    {
        "description": "Second App|First describe",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 16864,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006600ec-002f-00bc-00f1-005500b40066.png",
        "timestamp": 1592116274378,
        "duration": 19
    },
    {
        "description": "First App|First describe",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 16864,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Pending",
        "browserLogs": [],
        "screenShotFile": "00860090-0083-0024-00eb-00ba003600dd.png",
        "timestamp": 1592116274932,
        "duration": 1
    },
    {
        "description": "Third App|First describe",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 16864,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Temporarily disabled with xit",
        "browserLogs": [],
        "screenShotFile": "00560092-00a8-007c-0043-002800ea00b1.png",
        "timestamp": 1592116274953,
        "duration": 0
    },
    {
        "description": "First App|Before After Each Function",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 18136,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d70050-00da-0093-0048-00cb005900af.png",
        "timestamp": 1592116701951,
        "duration": 44
    },
    {
        "description": "Second App|Before After Each Function",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 18136,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f6005e-00bc-0074-0055-0019008c0019.png",
        "timestamp": 1592116702650,
        "duration": 32
    },
    {
        "description": "First App|Before After Each Function",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17052,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e40070-00cc-0079-0069-00ee00cc00c3.png",
        "timestamp": 1592116729048,
        "duration": 15
    },
    {
        "description": "Second App|Before After Each Function",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17052,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009c009d-0065-0020-0018-009100ca00fe.png",
        "timestamp": 1592116729548,
        "duration": 23
    },
    {
        "description": "Test App|New Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12856,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://v2.zopim.com/?nVHuz6qbGuVvOJgXZkNhXUUsmr9ROfjh - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592141103445,
                "type": ""
            }
        ],
        "screenShotFile": "003100ad-0046-00af-0014-0056000f00cc.png",
        "timestamp": 1592141090693,
        "duration": 19581
    },
    {
        "description": "succcesful login|login feature",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12856,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0098009c-0000-0062-0042-004b00f700e5.png",
        "timestamp": 1592141111278,
        "duration": 5
    },
    {
        "description": "Test App|New Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 18896,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003c0030-006a-00f3-0010-004000240004.png",
        "timestamp": 1592141831218,
        "duration": 9647
    },
    {
        "description": "Test App|New Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 17100,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007e006c-0031-007f-00fc-00af00ec006d.png",
        "timestamp": 1592141922012,
        "duration": 16313
    },
    {
        "description": "Test App|New Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9976,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00370086-00f4-0058-0002-003400ae0079.png",
        "timestamp": 1592142049537,
        "duration": 9214
    },
    {
        "description": "Test App|New Angular App",
        "passed": false,
        "pending": false,
        "os": "windows",
        "sessionId": "39bad6297d24023a7ffb2b6ece272e24",
        "instanceId": 15992,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": [
            "Failed: Angular could not be found on the page http://www.way2automation.com/angularjs-protractor/registeration/#/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page http://www.way2automation.com/angularjs-protractor/registeration/#/login. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"Test App\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\spec.js:4:5)\n    at addSpecsToSuite (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:1138:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1158:10)\n    at Module.load (internal/modules/cjs/loader.js:986:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:879:14)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.5/css/bootstrap.css - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592142410698,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/api-check/7.5.3/api-check.js - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592142410707,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.7/angular.js - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592142410737,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.7/angular-route.js - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592142410739,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.7/angular-cookies.js - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592142410740,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/angular-formly/7.2.3/formly.js - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592142410740,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.4.7/angular-messages.js 9:22 Uncaught TypeError: Cannot read property 'isArray' of undefined",
                "timestamp": 1592142412350,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdnjs.cloudflare.com/ajax/libs/angular-formly-templates-bootstrap/6.1.5/angular-formly-templates-bootstrap.js 97:14 Uncaught TypeError: Cannot read property 'version' of undefined",
                "timestamp": 1592142412362,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://www.way2automation.com/angularjs-protractor/registeration/modules/authentication/services.js 116:18 Uncaught ReferenceError: angular is not defined",
                "timestamp": 1592142412425,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://www.way2automation.com/angularjs-protractor/registeration/modules/authentication/controllers.js 40:2 Uncaught ReferenceError: angular is not defined",
                "timestamp": 1592142412426,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://www.way2automation.com/angularjs-protractor/registeration/modules/home/controllers.js 3:2 Uncaught ReferenceError: angular is not defined",
                "timestamp": 1592142412427,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://www.way2automation.com/angularjs-protractor/registeration/scripts/app.js 55:2 Uncaught ReferenceError: angular is not defined",
                "timestamp": 1592142412427,
                "type": ""
            }
        ],
        "screenShotFile": "007100a2-00c2-0094-0085-006d00a80018.png",
        "timestamp": 1592142396307,
        "duration": 26346
    },
    {
        "description": "Test App|New Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 7352,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00550001-00f3-0043-0054-003900de007e.png",
        "timestamp": 1592143082771,
        "duration": 10380
    },
    {
        "description": "Test App|New Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 11500,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008800fe-0021-00e7-0081-004b004d00bb.png",
        "timestamp": 1592143147726,
        "duration": 9209
    },
    {
        "description": "Test App|Non Angular App",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 9932,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": [
            "Failed: Angular could not be found on the page http://newtours.demoaut.com/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page http://newtours.demoaut.com/. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"Test App\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\nonAngularApp.js:3:5)\n    at addSpecsToSuite (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\nonAngularApp.js:1:1)\n    at Module._compile (internal/modules/cjs/loader.js:1138:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1158:10)\n    at Module.load (internal/modules/cjs/loader.js:986:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:879:14)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592143871323,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592143871334,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592143872885,
                "type": ""
            }
        ],
        "screenShotFile": "00d400e2-00aa-000e-00c1-001f009d006f.png",
        "timestamp": 1592143869046,
        "duration": 13452
    },
    {
        "description": "Test App|Non Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 12388,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592143935466,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592143935967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592143938395,
                "type": ""
            }
        ],
        "screenShotFile": "001f0015-0013-0078-00b6-00170014009d.png",
        "timestamp": 1592143934220,
        "duration": 9184
    },
    {
        "description": "Test App|Non Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19328,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144110340,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144111507,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144114161,
                "type": ""
            }
        ],
        "screenShotFile": "004c00db-00c8-00cc-00c8-0028007600af.png",
        "timestamp": 1592144108844,
        "duration": 5329
    },
    {
        "description": "Test App|Non Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19328,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144115940,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144115940,
                "type": ""
            }
        ],
        "screenShotFile": "00ca007c-00e8-003e-0077-007c004100fb.png",
        "timestamp": 1592144114852,
        "duration": 1098
    },
    {
        "description": "Test App|Non Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19684,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144302553,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144302852,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144305303,
                "type": ""
            }
        ],
        "screenShotFile": "00100013-0030-00d4-00a9-003f00ad0084.png",
        "timestamp": 1592144300883,
        "duration": 4427
    },
    {
        "description": "Test App|Non Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19684,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144307762,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144308172,
                "type": ""
            }
        ],
        "screenShotFile": "00990074-00fc-00e0-0017-009e0079006e.png",
        "timestamp": 1592144306471,
        "duration": 1715
    },
    {
        "description": "Test App|Non Angular App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 19684,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/images/spacer.gif - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144309272,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "http://newtours.demoaut.com/black - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1592144309277,
                "type": ""
            }
        ],
        "screenShotFile": "00ef00b0-0076-003a-003a-007d00b5002d.png",
        "timestamp": 1592144308610,
        "duration": 674
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 16280,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": [
            "Failed: Angular could not be found on the page http://demo.automationtesting.in/Datepicker.html. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load"
        ],
        "trace": [
            "Error: Angular could not be found on the page http://demo.automationtesting.in/Datepicker.html. If this is not an Angular application, you may need to turn off waiting for Angular.\n                          Please see \n                          https://github.com/angular/protractor/blob/master/docs/timeouts.md#waiting-for-angular-on-page-load\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:718:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run it(\"Test 1\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:5:5)\n    at addSpecsToSuite (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:1138:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1158:10)\n    at Module.load (internal/modules/cjs/loader.js:986:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:879:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00820061-005e-0019-00d1-003e0044006a.png",
        "timestamp": 1592144687016,
        "duration": 23107
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 16280,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Temporarily disabled with xit",
        "browserLogs": [],
        "screenShotFile": "0042003f-00c3-00eb-00b2-005800a900c0.png",
        "timestamp": 1592144710789,
        "duration": 0
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 3588,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/fonts/fontawesome-webfont.woff2?v=4.5.0 - Failed to load resource: net::ERR_CONNECTION_CLOSED",
                "timestamp": 1592144786500,
                "type": ""
            }
        ],
        "screenShotFile": "00ad00e4-0072-007e-0090-0024008e002c.png",
        "timestamp": 1592144778392,
        "duration": 9172
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 3588,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Temporarily disabled with xit",
        "browserLogs": [],
        "screenShotFile": "00d000b9-00ba-005d-0027-005200ba00fa.png",
        "timestamp": 1592144788367,
        "duration": 0
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 9596,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://partner.googleadservices.com/gampad/cookie.js?domain=demo.automationtesting.in&callback=_gfp_s_&client=ca-pub-9173866185064071 - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592145190815,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.googletagservices.com/activeview/js/current/osd.js?cb=%2Fr20100101 - Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
                "timestamp": 1592145190985,
                "type": ""
            }
        ],
        "screenShotFile": "008c0017-006f-0052-0039-002f001900dc.png",
        "timestamp": 1592145171594,
        "duration": 21999
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 9596,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Pending",
        "browserLogs": [],
        "screenShotFile": "00c2007c-00d1-00d7-00a2-005900b80050.png",
        "timestamp": 1592145194574,
        "duration": 0
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 18968,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": [
            "Failed: datepicker1 is not defined"
        ],
        "trace": [
            "ReferenceError: datepicker1 is not defined\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:16:23)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run fit(\"Test 2\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:11:7)\n    at addSpecsToSuite (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:1138:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1158:10)\n    at Module.load (internal/modules/cjs/loader.js:986:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:879:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "00cd00ae-00b4-0013-0048-005e006a0078.png",
        "timestamp": 1592145317057,
        "duration": 25
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 18968,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Pending",
        "browserLogs": [],
        "screenShotFile": "00f90000-00b7-00d4-00cc-005b006a00e5.png",
        "timestamp": 1592145318263,
        "duration": 0
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": false,
        "pending": false,
        "os": "Windows",
        "instanceId": 18788,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": [
            "Failed: datepicker1 is not defined"
        ],
        "trace": [
            "ReferenceError: datepicker1 is not defined\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:16:23)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)\nFrom: Task: Run fit(\"Test 2\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:11:7)\n    at addSpecsToSuite (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\Rajat-PC\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\Rajat-PC\\testing-framework\\ProtractorFramework\\specs\\datepickerspec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:1138:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1158:10)\n    at Module.load (internal/modules/cjs/loader.js:986:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:879:14)"
        ],
        "browserLogs": [],
        "screenShotFile": "005e0026-008d-00f5-003c-002f000700f4.png",
        "timestamp": 1592145369764,
        "duration": 22
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 18788,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Pending",
        "browserLogs": [],
        "screenShotFile": "00c6003c-001b-00f1-00c5-00a9003800cf.png",
        "timestamp": 1592145370210,
        "duration": 0
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 4464,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c90063-00fd-0059-0052-00d300000077.png",
        "timestamp": 1592145405561,
        "duration": 10509
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 4464,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Pending",
        "browserLogs": [],
        "screenShotFile": "00b500c8-00f7-007a-009a-00a000ac0073.png",
        "timestamp": 1592145416744,
        "duration": 0
    },
    {
        "description": "Test 2|Date Picker App",
        "passed": true,
        "pending": false,
        "os": "Windows",
        "instanceId": 10656,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js 175 The PerformanceObserver does not support buffered flag with the entryTypes argument.",
                "timestamp": 1592145455830,
                "type": ""
            }
        ],
        "screenShotFile": "001f006b-00e4-000a-0035-00f800400044.png",
        "timestamp": 1592145449064,
        "duration": 9650
    },
    {
        "description": "Test 1|Date Picker App",
        "passed": false,
        "pending": true,
        "os": "Windows",
        "instanceId": 10656,
        "browser": {
            "name": "chrome",
            "version": "83.0.4103.97"
        },
        "message": "Pending",
        "browserLogs": [],
        "screenShotFile": "00c50036-001e-0007-0076-00cd000a0065.png",
        "timestamp": 1592145459528,
        "duration": 0
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
