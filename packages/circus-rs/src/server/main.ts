import { DicomFileRepository } from '@utrad-ical/circus-dicom-repository';
import http from 'http';
import Koa from 'koa';
import config from './Config';
import createDicomReader from './createDicomReader';
import DicomDumper from './dicom-dumpers/DicomDumper';
import loadModule, { ModuleType } from './ModuleLoader';
import createServer from './Server';

function listen(app: Koa, ...args: any[]): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen.call(app, ...args, (err: Error) => {
      if (err) reject(err);
      else resolve(httpServer);
    });
  });
}

async function main(): Promise<void> {
  console.log('CIRCUS RS is starting up...');

  const logger = loadModule(ModuleType.Logger, config.logger);
  const imageEncoder = loadModule(ModuleType.ImageEncoder, config.imageEncoder);
  const dicomFileRepository: DicomFileRepository = loadModule(
    ModuleType.DicomFileRepository,
    config.dicomFileRepository
  );
  const dicomDumper: DicomDumper = loadModule(
    ModuleType.DicomDumper,
    config.dumper
  );
  const seriesReader = createDicomReader(
    dicomFileRepository,
    dicomDumper,
    config.cache.memoryThreshold
  );

  const loadedModuleNames: string[] = [
    config.logger.module,
    config.imageEncoder.module,
    config.dicomFileRepository.module,
    config.dumper.module
  ];

  const app = createServer({
    logger,
    imageEncoder,
    seriesReader,
    loadedModuleNames,
    authorization: config.authorization,
    globalIpFilter: config.globalIpFilter
  });

  const port = config.port;
  try {
    await listen(app, port, '0.0.0.0');
    const message = `Server running on port ${port}`;
    logger.info(message);
    console.log(message);
  } catch (e) {
    console.error('Server failed to start');
    console.error(e);
    logger.error(e);
    // This guarantees all the logs are flushed before actually exiting the program
    logger.shutdown().then(() => process.exit(1));
  }
}

main();
