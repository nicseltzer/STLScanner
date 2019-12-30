"use strict";
/*

references:
https://blog.bitsrc.io/https-blog-bitsrc-io-how-to-perform-web-scraping-using-node-js-5a96203cb7cb

*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var cheerio = require("cheerio");
var httpm = require("typed-rest-client/HttpClient");
var nodemailer = require("nodemailer");
// FUCK REGEX
var dateMatcher = new RegExp("([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})");
var timeMatcher = new RegExp("(0[0-9]|1[0-9]|2[0-3]|[0-9]):([0-5][0-9]):([0-5][0-9]) ([AP]M)");
// END FUCK REGEX
var FILTERED_EVENTS = [
    "shotspotter",
    "person down",
    "shots fired",
    "fireworks",
    "assault",
    "fight"
];
var FILTERED_STREETS = [
    "wyoming",
    "california",
    "oregon",
    "iowa",
    "juniata",
    "utah",
    "nebraska",
    "ohio",
    "texas",
    "cherokee",
    "arsenal",
    "jefferson",
    "benton",
    "pennsylvania",
    "minnesota",
    "michigan",
    "compton"
];
var StlScanner = /** @class */ (function () {
    function StlScanner() {
        this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0";
        this.options = {
            headers: {
                Accept: "text/html,application/xhtml+xml,application/xml",
                "Accept-Language": "en-US",
                Referer: "https://www.definitelyarealwebsite.com"
            }
        };
    }
    StlScanner.prototype.run = function () {
        return __awaiter(this, void 0, void 0, function () {
            var httpClient, response;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        httpClient = new httpm.HttpClient(this.userAgent, undefined, this.options);
                        return [4 /*yield*/, httpClient.get("https://slmpd.org/cfs.aspx")];
                    case 1:
                        response = _a.sent();
                        response
                            .readBody()
                            .then(function (data) {
                            var $ = cheerio.load(data);
                            var rawUpdatedAt = $("span#lblLastUpdate").text();
                            var updatedAt = _this.getUpdatedAtMillis(rawUpdatedAt);
                            var callsForService = [];
                            var rawTableData = [];
                            $("table#gvData tbody tr td").each(function (idx, element) {
                                rawTableData.push($(element).text());
                            });
                            for (var i = 0; i + 4 < rawTableData.length; i = i + 4) {
                                callsForService.push({
                                    timestamp: new Date(rawTableData[i]).getTime(),
                                    id: rawTableData[i + 1],
                                    address: rawTableData[i + 2],
                                    detail: rawTableData[i + 3]
                                });
                            }
                            var filteredEvents = callsForService.filter(function (event) {
                                return FILTERED_EVENTS.includes(event.detail.toLowerCase()) &&
                                    FILTERED_STREETS.includes(event.address.toLocaleLowerCase());
                            });
                            console.log("Last update at " + updatedAt);
                            console.log("Fetched " + callsForService.length + " events");
                            console.log("Filtered out " + (callsForService.length -
                                filteredEvents.length) + " events");
                            var mailOptions = {
                                from: "StlScanner <nic@nicseltzer.com>",
                                to: "nicseltzer@gmail.com",
                                subject: "StlScanner for " + updatedAt.getTime(),
                                html: JSON.stringify(filteredEvents)
                            };
                            if (filteredEvents.length > 0) {
                                var mailTransport = nodemailer.createTransport({
                                    service: "gmail",
                                    auth: {
                                        user: "nicseltzer@gmail.com",
                                        pass: "dwzkclckdyqorkik"
                                    }
                                });
                                mailTransport.sendMail(mailOptions, function (err, info) {
                                    if (err)
                                        console.log(err);
                                    else
                                        console.log(info);
                                });
                                console.log("sent " + filteredEvents.length + ": " + filteredEvents);
                            }
                        })["catch"](function (err) { return console.log(err); });
                        return [2 /*return*/];
                }
            });
        });
    };
    StlScanner.prototype.getUpdatedAtMillis = function (updatedAt) {
        var dateMatch = updatedAt.match(dateMatcher);
        if (dateMatch === null) {
            throw new Error("date");
        }
        var timeMatch = updatedAt.match(timeMatcher);
        if (timeMatch === null) {
            throw new Error("time");
        }
        var dt = {
            year: dateMatch[3],
            month: dateMatch[1],
            day: dateMatch[2],
            hour: +timeMatch[1] < 10 ? "0" + timeMatch[1] : "" + timeMatch[1],
            minute: timeMatch[2],
            second: timeMatch[3],
            period: timeMatch[4]
        };
        // Make a string that can be converted by the Date built-in.
        var dateTime = dt.month + "/" + dt.day + "/" + dt.year + " " + dt.hour + ":" + dt.minute + ":" + dt.second + " " + dt.period;
        var date = Date.parse(dateTime);
        return new Date(date);
    };
    return StlScanner;
}());
exports.StlScanner = StlScanner;
function main() {
    var scanner = new StlScanner();
    scanner.run();
}
main();
