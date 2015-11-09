import Controller from './Controller';
import * as http from 'http';
import AuthorizationCache from '../AuthorizationCache';
import * as crypt from 'crypto';
import logger from '../Logger';
import { ValidatorRules } from '../Validator';

/**
 * Register access token.
 *
 * series: DICOM series instance UID
 * token: access token
 *
 * also in metadata/mpr/oblique... request.
 */
export default class RequestAccessTokenAction extends Controller {
	public cache: AuthorizationCache;
	public allowFrom: string;

	protected needsTokenAuthorization(): boolean {
		return false;
	}

	protected getRules(): ValidatorRules {
		return {
			series: ['Series UID', null, 'isLength:1:200', null]
		};
	}

	public execute(req: http.ServerRequest, res: http.ServerResponse): void {
		let ip = req.connection.remoteAddress;
		if (!ip.match(this.allowFrom)) {
			logger.info('401 error');
			res.writeHead(401, http.STATUS_CODES[401]);
			res.write(http.STATUS_CODES[401]);
			res.end();
			return;
		}
		super.execute(req, res);
	}

	protected process(query: any, res: http.ServerResponse): void {
		let series: string = query.series;

		crypt.randomBytes(48, (err, buf) => {
			let status = {};

			if (err) {
				this.respondInternalServerError(
					res, 'Internal server error while genarating token'
				);
			} else {
				let token: string = buf.toString('hex');
				this.cache.update(series, token);
				status = {
					'result': 'ok',
					'token': token
				};
				this.respondJson(res, status);
			}
		});

	}

}
