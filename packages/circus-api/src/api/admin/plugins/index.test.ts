import { setUpAppForRoutesTest, ApiTest } from '../../../../test/util-routes';
import { setUpMongoFixture } from '../../../../test/util-mongo';
import { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
beforeAll(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.alice;
});
afterAll(async () => await apiTest.tearDown());

describe('admin/plugins', () => {
  beforeEach(async () => {
    await setUpMongoFixture(apiTest.db, ['pluginDefinitions']);
  });

  test('should return list of plugins', async () => {
    const res = await axios.get('api/admin/plugins');
    expect(res.status).toBe(200);
    expect(res.data.items).toBeInstanceOf(Array);
    expect(
      res.data.items.some(
        (p: any) => p.pluginName === 'MOCK-VALIDATION-FAILURE'
      )
    ).toBe(true);
  });
});
