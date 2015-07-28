/**
 * Main server class.
 */

export = Server;

import http = require('http');
var finalhandler = require('finalhandler');

// Load configuration
var config: Configuration = require('config');

import logger from './Logger';
logger.info('CIRCUS RS is starting up...');

import Counter from './Counter';
import PNGWriter from './PNGWriter';
import DicomReader from './DicomReader';
import DicomDumper from './DicomDumper';
import DicomServerModule from './controllers/Controller';
import PathResolver from './path-resolver/PathResolver';

var Router = require('router');

class Server {
	public start(): void {
		// prepare routing
		var router = this.prepareRouter();

		// create server process
		var server = http.createServer((req: http.ServerRequest, res: http.ServerResponse) => {
			router(req, res, finalhandler(req, res, {
				onerror: err => {
					Counter.countUp('_error');
					logger.info(err.toString());
				}
			}));
		});
		server.listen(config.port);

		logger.info('Server running on port ' + config.port);
	}

	private createDicomReader(): DicomReader {
		var module: string = config.pathResolver.module;
		logger.info('Using path resolver: ' + module);
		var resolverClass: typeof PathResolver = require('./path-resolver/' + module).default;
		var resolver = new resolverClass(config.pathResolver.options);
		var dumperClass: typeof DicomDumper = require('./' + config.dumper.module).default;
		var dumper = new dumperClass(config.dumper.options);
		return new DicomReader(resolver, dumper, config.cache.memoryThreshold);

	}

	private createPngWriter(): PNGWriter {
		var module: string = config.pngWriter.module;
		logger.info('Using PNG writer: ' + module);
		var pngModule: typeof PNGWriter = require('./' + module).default;
		return new pngModule(config.pngWriter.options);
	}

	private prepareRouter(): any {
		var router = Router();
		var pngWriter = this.createPngWriter();
		var reader = this.createDicomReader();

		var routes: [string, string][] = [
			['metadata', 'Metadata'],
			['mpr', 'MPRAction'],
			['status', 'ServerStatus'],
			['oblique', 'ObliqueAction'],
			['raw', 'RawAction']
		];
		routes.forEach(route => {
			logger.info('Loading ' + route[1] + ' module...');
			var module: typeof DicomServerModule = require('./controllers/' + route[1]).default;
			var controller = new module(reader, pngWriter);
			router.get('/' + route[0], (req, res) => {
				Counter.countUp(route[0]);
				controller.execute(req, res);
			});
		});
		return router;
	}
}
