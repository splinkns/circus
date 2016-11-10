/*
 * CIRCUS RS default configuration file
 *
 * ** DO NOT EDIT THIS FILE DIRECTLY! **
 * Instead, do one of the followings:
 * - Add a file named local.json in this directory
 * - Start the server with --config=<config-file-path>.
 */

var path = require('path');

module.exports = {
	// Path resolver settings.
	"dicomFileRepository": {
		"module": "StaticDicomFileRepository",
		"options": {
			// Path to DICOM filter
			"dataDir": "/var/dicom-data",
			"useHash": false
		}
	},

	// server port number
	"port": 3000,

	// IP access control. Permits accesses from all hosts by default.
	// "ipFilter": [["0.0.0.0", "255.255.255.255"]],

	// Logger configurations
	"logger": {
		"module": "Log4JsLogger",
		"options": {
			"appenders": [
				{
					"type": "dateFile",
					"filename": path.resolve(__dirname, "../logs/debug.log"),
					"pattern": "-yyyyMMdd.log",
					"alwaysIncludePattern": true
				}
			]
		}
	},

	// DICOM loader
	"dumper": {
		"module": "PureJsDicomDumper",
		"options": {}
	},

	// PNG writer options
	"imageEncoder": {
		"module": "ImageEncoder_pngjs",
		"options": {}
	},

	"cache": {
		/*
 		 * threshold: upper limit of heap memory size. (in bytes)
 		 *		When object added, cached object will be removed to keep threshold.
 		 *		So this threshold is not strict.
 		 */
		"memoryThreshold": 2147483648
	},

	// Enable token-based authorization.
	// If turned off, everyone can access images when they know the series instance UID.
	"authorization": {
		"enabled": false,
	  	"tokenRequestIpFilter": ["127.0.0.1", "::1"],
	  	"expire": 1800
	}
};
