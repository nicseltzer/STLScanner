/*

references: 
https://blog.bitsrc.io/https-blog-bitsrc-io-how-to-perform-web-scraping-using-node-js-5a96203cb7cb

*/

import * as cheerio from "cheerio";
import * as httpm from "typed-rest-client/HttpClient";
import * as nodemailer from "nodemailer";
import * as winston from "winston";

import { IRequestOptions } from "typed-rest-client/Interfaces";
import { format } from "logform";

const loggerFileOptions: winston.transports.FileTransportOptions = {
	level: "debug",
	filename: `${__dirname}/last.log`,
	maxsize: 5242880, // 5MB
	maxFiles: 5,
	format: format.combine(
		format.timestamp(),
		format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
	)
};

const logger = winston.createLogger({
	transports: [new winston.transports.File(loggerFileOptions)]
});

interface IDateTime {
	year: string;
	month: string;
	day: string;
	hour: string;
	minute: string;
	second: string;
	period: string;
}

interface ICallForService {
	timestamp: number;
	id: string;
	address: string;
	detail: string;
}

// FUCK REGEX
const dateMatcher = new RegExp("([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})");
const timeMatcher = new RegExp(
	"(0[0-9]|1[0-9]|2[0-3]|[0-9]):([0-5][0-9]):([0-5][0-9]) ([AP]M)"
);
// END FUCK REGEX

const ENDPOINT = "https://slmpd.org/cfs.aspx";

const FILTERED_EVENTS = [
	"shotspotter", // automated system
	"person down",
	"shots fired",
	"fireworks",
	"assault",
	"fight",
	"call for police",
	"working fire/arson"
];

const FILTERED_STREETS = [
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

export class StlScanner {
	userAgent: string =
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:71.0) Gecko/20100101 Firefox/71.0";

	options: IRequestOptions = {
		headers: {
			Accept: "text/html,application/xhtml+xml,application/xml",
			"Accept-Language": "en-US",
			Referer: "https://www.definitelyarealwebsite.com"
		}
	};
	public async run(): Promise<void> {
		let httpClient: httpm.HttpClient = new httpm.HttpClient(
			this.userAgent,
			undefined,
			this.options
		);
		const response: httpm.HttpClientResponse = await httpClient.get(ENDPOINT);
		response.readBody().then(data => {
			const $ = cheerio.load(data);
			const rawUpdatedAt: string = $("span#lblLastUpdate").text();
			const updatedAt: Date = this.getUpdatedAtMillis(rawUpdatedAt);
			const callsForService: ICallForService[] = [];
			const rawTableData: string[] = [];
			$("table#gvData tbody tr td").each((idx, element) => {
				rawTableData.push($(element).text());
			});

			for (let i = 0; i + 4 < rawTableData.length; i = i + 4) {
				callsForService.push({
					timestamp: new Date(rawTableData[i]).getTime(),
					id: rawTableData[i + 1],
					address: rawTableData[i + 2],
					detail: rawTableData[i + 3]
				});
			}

			logger.debug(JSON.stringify(callsForService));

			const filteredEvents = callsForService.filter(
				event =>
					FILTERED_EVENTS.includes(event.detail.toLowerCase()) &&
					FILTERED_STREETS.includes(event.address.toLocaleLowerCase())
			);

			logger.info(`Last update at ${updatedAt}`);
			logger.info(`Fetched ${callsForService.length} events from ${ENDPOINT}`);
			logger.info(
				`Filtered out ${callsForService.length - filteredEvents.length} events`
			);

			const mailOptions = {
				from: "StlScanner <nic@nicseltzer.com>",
				to: "nicseltzer@gmail.com",
				subject: `StlScanner for ${updatedAt.getTime()}`,
				html: JSON.stringify(filteredEvents)
			};

			if (filteredEvents.length > 0) {
				const mailTransport = nodemailer.createTransport({
					service: "gmail",
					auth: {
						user: "nicseltzer@gmail.com",
						pass: "dwzkclckdyqorkik"
					}
				});

				mailTransport.sendMail(mailOptions, (err, data) => {
					if (err) logger.error(err);
					else logger.info(data);
				});

				logger.info(`sent ${filteredEvents.length}: ${filteredEvents}`);
			}
		});
	}

	private getUpdatedAtMillis(updatedAt: string): Date {
		const dateMatch: RegExpMatchArray | null = updatedAt.match(dateMatcher);
		if (dateMatch === null) {
			throw new Error("date");
		}

		const timeMatch: RegExpMatchArray | null = updatedAt.match(timeMatcher);
		if (timeMatch === null) {
			throw new Error("time");
		}

		const dt: IDateTime = {
			year: dateMatch[3],
			month: dateMatch[1],
			day: dateMatch[2],
			hour: +timeMatch[1] < 10 ? "0" + timeMatch[1] : "" + timeMatch[1],
			minute: timeMatch[2],
			second: timeMatch[3],
			period: timeMatch[4]
		};

		// Make a string that can be converted by the Date built-in.
		const dateTime: string = `${dt.month}/${dt.day}/${dt.year} ${dt.hour}:${dt.minute}:${dt.second} ${dt.period}`;
		const date: number = Date.parse(dateTime);
		return new Date(date);
	}
}

function main() {
	const scanner: StlScanner = new StlScanner();
	scanner.run();
}

main();
