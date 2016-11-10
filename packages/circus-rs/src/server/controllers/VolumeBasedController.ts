import * as express from 'express';
import Controller from './Controller';
import DicomVolume from '../../common/DicomVolume';

/**
 * VolumeBasedController is a base class of controllers
 * which need DICOM volume (as DicomVolume) specified by the 'series' query parameter.
 */
export default class VolumeBasedController extends Controller {
	protected process(query: any, req: express.Request, res: express.Response): void {
		let series: string = null;
		if ('series' in query) {
			series = query.series;
		}
		if (!series) {
			this.respondBadRequest(res, 'No series in query');
			return;
		}
		// TODO: Specifying image range is temporarily disabled
		this.reader.get(series).then((vol: DicomVolume) => {
			try {
				this.processVolume(query, vol, res);
			} catch (e) {
				if ('stack' in e) this.logger.info(e.stack);
				this.respondInternalServerError(res, e.toString());
			}
		}).catch(err => {
			this.respondNotFound(res, 'Error while loading a series');
			this.logger.error(err.toString());
		});
	}

	protected processVolume(
		query: any, vol: DicomVolume, res: express.Response
	): void {
		// Abstract.
		// In this method, `vol` is guaranteed to have valid image data.
	}
}
