/*
 * CIRCUS CS Core default configuration file
 *
 * ** DO NOT EDIT THIS FILE DIRECTLY! **
 * Instead, do one of the followings:
 * - Add a file named `local.{json|json5|js}` in this directory
 * - Start the server with --config=<config-file-path>.
 */

'use strict';
var path = require('path');

module.exports = {
	"temporaryDirBase": "/tmp/circus",
	"pluginConfigPath": path.join(__dirname, "plugins.yml"),
	
	"queue": {
		"mongoURL": "mongodb://localhost:51081/cs_core",
		"collectionTitle": "pluginJobQueue"
	},
	
	"WebUI": {
		"mongoURL": "mongodb://localhost:51081/cs_web_ui",
		"collectionTitle": "pluginJobs"
	},
	
	// DICOM file repository is a loader that fetches the content of a DICOM file
	// specified by a series instance UID and an image number.
	"dicomFileRepository": {
		"module": "StaticDicomFileRepository",
		"options": {
			"dataDir": path.join(__dirname, "..", "..", "var", "sample-dicom-data"),
			"useHash": false
		}
	},
	
	"docker": {
		"socketPath": "/var/run/docker.sock"
	},
	
	"dicomDumpOptions": {
		"dockerImage": "circus/dicom_voxel_dump:1.0",
		"volumeIn": "/data/in",
		"volumeOut": "/data/out"
	},
	
	/**
	 * Dequeue daemon settings (based on pm2)
	 */
	"daemon": {
		// (pm2)
		"script": "daemon.js",
		
		// (pm2) See interface StartOptions ( https://github.com/Unitech/pm2/blob/master/types/index.d.ts )
		"startOptions": {
			"name": "dequeue-daemon",
			"cwd": path.join(__dirname, ".."),
			"output": path.join(__dirname, "..", "logs", "pm2", "stdout"),
			"error": path.join(__dirname, "..", "logs", "pm2", "stderr")
			// env:
		},
		
		"tick": 1000,
		"waitOnFail": 60 * 1000
	}

	// // Logger configurations. By default, we make use of log4js library,
	// // so see the documentation for that project.
	// "logger": {
		// "module": "Log4JsLogger",
		// "options": {
			// "appenders": [
				// {
					// "type": "dateFile",
					// "filename": path.resolve(__dirname, "../logs/debug.log"),
					// "pattern": "-yyyyMMdd.log",
					// "alwaysIncludePattern": true
				// }
			// ]
		// }
	// },
};
