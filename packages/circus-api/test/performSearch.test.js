import * as test from './test-utils';
import performSearch from '../src/api/performSearch';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import createValidator from '../src/createValidator';
import { assert } from 'chai';
import axios from 'axios';

describe('performSearch', function() {
	let db, server;

	before(async function() {
		db = await test.connectMongo();
		await test.setUpMongoFixture(db, ['items']);
		const app = await test.setUpKoa(async app => {
			const validator = await createValidator(__dirname + '/test-schemas');
			const items = createCollectionAccessor(db, validator, {
				schema: 'item',
				collectionName: 'items',
				primaryKey: 'itemId'
			});
			app.use(async (ctx, next) => {
				const q = ctx.request.query.q;
				const filter = q && q.length ? JSON.parse(q) : {};
				await performSearch(
					items, filter, ctx, { defaultSort: { price : -1 } }
				);
			});
		});
		server = await test.listenKoa(app);
	});

	after(async function() {
		await test.tearDownKoa(server);
		await db.close();
	});

	async function search({ query = {}, sort, limit, page } = {}) {
		const res = await axios.get(server.url, {
			params: {
				q: JSON.stringify(query),
				sort: JSON.stringify(sort),
				limit,
				page
			}
		});
		return res.data;
	}

	it('should perform search', async function() {
		const items = await search({ limit: 100 });
		assert.equal(items.length, 30);
	});

	it('should take filter', async function() {
		const items1 = await search({ query: { price: { $gt: 800 } } });
		assert.equal(items1.length, 6);
		const items2 = await search({ query: { color: 'blue' } });
		assert.equal(items2.length, 3);
	});

	it('should take sort', async function() {
		const items1 = await search({ sort: { price: -1 } });
		assert.equal(items1[0].name, 'digital firewall');
		const items2 = await search({ sort: { price: 1 } });
		assert.equal(items2[0].name, 'bluetooth pixel');
		const items3 = await search({ sort: { stock: 1, name: 1 } });
		assert.deepEqual(items3.map(i => i.itemId).slice(0, 3), [28, 13, 1]);
	});

	it('should take paging', async function() {
		const items1 = await search({ page: 1, limit: 2, sort: { price: -1 } });
		assert.deepEqual(items1.map(i => i.itemId), [12, 23]);
		const items2 = await search({ page: 2, limit: 2, sort: { price: -1 } });
		assert.deepEqual(items2.map(i => i.itemId), [28, 15]);
		const items3 = await search({ page: 20, limit: 2, sort: { price: -1 } });
		assert.deepEqual(items3, []);
	});
});
