import configureServiceLoader, {
  RsServices
} from '../src/server/configureServiceLoader';
import fs from 'fs';
import zlib from 'zlib';
import _axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { Server } from 'http';
import { ServiceLoader } from '@utrad-ical/circus-lib';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import status from 'http-status';

const port = 1024;

const testConfig = {
  rsServer: { options: { port, globalIpFilter: '(^|:?)127.0.0.1$' } },
  rsLogger: { type: 'NullLogger' },
  dicomFileRepository: { type: 'MemoryDicomFileRepository', options: {} },
  imageEncoder: { type: 'PngJsImageEncoder', options: {} },
  volumeProvider: { options: { cache: { memoryThreshold: 2147483648 } } }
};

const axios = _axios.create({
  baseURL: `http://localhost:${port}`,
  validateStatus: () => true,
  adapter // Makes Axios use Node's http, instead of DOM XHR
});

const testdir = __dirname + '/test-dicom/';
const MOCK_IMAGE_COUNT = 20;

const dicomImage = (file = 'CT-MONO2-16-brain') => {
  return new Promise<Buffer>(resolve => {
    try {
      const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
      zlib.unzip(zippedFileContent, function(err, fileContent) {
        if (err) throw err;
        resolve(fileContent);
      });
    } catch (err) {
      const fileContent = fs.readFileSync(testdir + file);
      resolve(fileContent);
    }
  });
};

const fillMockImages = async (dicomFileRepository: DicomFileRepository) => {
  const series = await dicomFileRepository.getSeries('1.2.3.4.5');
  const image = await dicomImage();
  for (let i = 1; i <= MOCK_IMAGE_COUNT; i++) {
    await series.save(i, image);
  }
};

interface TestServer {
  loader: ServiceLoader<RsServices>;
  server: Server;
}

const startTestServer = async (config: any) => {
  const loader = new ServiceLoader<RsServices>(config);
  configureServiceLoader(loader);
  const dicomFileRepository = await loader.get('dicomFileRepository');
  await fillMockImages(dicomFileRepository);
  const app = await loader.get('rsServer');
  app.proxy = true;
  return new Promise<TestServer>(resolve => {
    const server = app.listen(port);
    server.on('listening', () => resolve({ loader, server }));
  });
};

const stopHttpd = (server: Server) => {
  return new Promise<void>(resolve => {
    server.on('close', () => {
      server.off('close', resolve);
      resolve();
    });
    server.close();
  });
};

const stopTestServer = async (testServer: TestServer) => {
  await stopHttpd(testServer.server);
  await testServer.loader.dispose();
};

describe('without auth', () => {
  let testServer: TestServer;

  beforeAll(async () => (testServer = await startTestServer(testConfig)));

  afterAll(() => stopTestServer(testServer));

  test('status', async () => {
    const res = await axios.get('/status');
    expect(res.status).toBe(status.OK);
    expect(res.headers['content-type']).toMatch('application/json');
    expect(res.data).toMatchObject({ status: 'Running' });
  });

  test('globalIpFilter', async () => {
    const res = await axios.get('/status', {
      headers: { 'X-Forwarded-For': '127.0.0.11 ' }
    });
    expect(res.status).toBe(status.UNAUTHORIZED);
  });

  test('must return 404 for nonexistent route', async () => {
    const res = await axios.get('/foobar');
    expect(res.status).toBe(status.NOT_FOUND);
  });

  describe('series middleware', () => {
    test('CORS headers', async () => {
      const res = await axios.request({
        method: 'options',
        url: '/series/1.2.3.4.5/metadata'
      });
      expect(res.headers['access-control-allow-methods']).toBe('GET');
    });

    // it.skip('must return 404 for nonexistent series');

    describe('metadata', () => {
      test('returns no window by default', async () => {
        const res = await axios.get('/series/1.2.3.4.5/metadata');
        expect(res.status).toBe(status.OK);
        expect(res.data.estimatedWindow).toBeUndefined();
      });

      test('returns no window if window=none', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=none'
        );
        expect(res.status).toBe(status.OK);
        expect(res.data.estimatedWindow).toBeUndefined();
      });

      test('returns estimated window with window=first', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=first'
        );
        expect(res.status).toBe(status.OK);
        expect(res.data.estimatedWindow).toMatchObject({
          level: 192,
          width: 2498
        });
      });

      test('returns estimated window with window=center', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=center'
        );
        expect(res.status).toBe(status.OK);
        expect(res.data.estimatedWindow).toMatchObject({
          level: 192,
          width: 2498
        });
      });

      it('returns estimated window with window=full', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?estimateWindow=full'
        );
        expect(res.status).toBe(status.OK);
        expect(res.data.estimatedWindow).toMatchObject({
          level: 192,
          width: 2498
        });
      });

      test('returns partial metadata', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/metadata?start=5&end=15&delta=2'
        );
        expect(res.status).toBe(status.OK);
        // 6 slices (5, 7, 9, 11, 13, 15)
        expect(res.data.voxelCount).toEqual([512, 512, 6]);
      });
    });

    describe('volume', () => {
      test('returns raw volume', async () => {
        const res = await axios.get('/series/1.2.3.4.5/volume');
        expect(res.status).toBe(status.OK);
        expect(res.headers['content-type']).toBe('application/octet-stream');
        expect(res.headers['content-length']).toBe(String(512 * 512 * 20 * 2));
      });

      test('returns partial volume', async () => {
        const res = await axios.get(
          '/series/1.2.3.4.5/volume?start=5&end=15&delta=2'
        );
        expect(res.status).toBe(status.OK);
        expect(res.headers['content-type']).toBe('application/octet-stream');
        expect(res.headers['content-length']).toBe(String(512 * 512 * 6 * 2));
      });
    });

    describe('scan', () => {
      test('return oblique image in binary format', async () => {
        const res = await axios.get('/series/1.2.3.4.5/scan', {
          params: {
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50'
          }
        });
        expect(res.status).toBe(status.OK);
        expect(res.headers['content-type']).toBe('application/octet-stream');
      });

      test('return oblique image from partial volume', async () => {
        const res = await axios.get('/series/1.2.3.4.5/scan', {
          params: {
            start: 5,
            end: 15,
            delta: 2,
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50'
          }
        });
        expect(res.status).toBe(status.OK);
        expect(res.headers['content-type']).toBe('application/octet-stream');
      });

      it('return oblique image in PNG', async () => {
        const res = await axios.get('/series/1.2.3.4.5/scan', {
          params: {
            origin: '200,200,50',
            xAxis: '512,0,0',
            yAxis: '0,512,0',
            size: '50,50',
            format: 'png',
            ww: 50,
            wl: 50
          }
        });
        expect(res.status).toBe(status.OK);
        expect(res.headers['content-type']).toBe('image/png');
      });
    });
  });
});

describe('with authentication', () => {
  let testServer: TestServer;
  beforeAll(async () => {
    const config = {
      ...testConfig,
      rsServer: {
        options: {
          ...testConfig.rsServer.options,
          authorization: {
            enabled: true,
            tokenRequestIpFilter: '(^|:?)127.0.0.1$',
            expire: 1800
          }
        }
      }
    };
    testServer = await startTestServer(config);
  });
  afterAll(() => stopTestServer(testServer));

  let tokenHeader: any;

  test('reject token request from invalid IP', async () => {
    const res = await axios.get('/token', {
      headers: { 'X-Forwarded-For': '127.0.0.2' }
    });
    expect(res.status).toBe(status.UNAUTHORIZED);
  });

  test('issue valid token', async () => {
    const res = await axios.get('/token', {
      params: { series: '1.2.3.4.5' }
    });
    expect(res.status).toBe(status.OK);
    expect(res.data).toMatchObject({ result: 'OK' });
    tokenHeader = { Authorization: `Bearer ${res.data.token}` };
  });

  test('return error if token not passed', async () => {
    const res = await axios.get('/series/1.2.3.4.5/metadata');
    expect(res.status).toBe(status.UNAUTHORIZED);
  });

  test('return error for unmatched token', async () => {
    const res = await axios.get('/series/8.8.8.8.8/metadata', {
      headers: tokenHeader
    });
    expect(res.status).toBe(status.UNAUTHORIZED);
  });

  test('return content for valid token', async () => {
    const res = await axios.get('/series/1.2.3.4.5/metadata', {
      headers: tokenHeader
    });
    expect(res.status).toBe(status.OK);
  });
});

// Todo:
// requireEstimatedWindow=false
