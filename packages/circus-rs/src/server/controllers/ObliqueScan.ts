import DicomVolume from '../../common/DicomVolume';
import VolumeBasedController from './VolumeBasedController';
import { ValidatorRules } from '../../common/Validator';
import { Section } from '../../common/geometry/Section';
import * as express from 'express';

/**
 * Handles 'scan' endpoint which returns MPR image for
 * an arbitrary orientation.
 */
export default class ObliqueScan extends VolumeBasedController {

	protected getRules(): ValidatorRules {
		return {
			'origin!': ['Origin', null, this.isTuple(3), this.parseTuple(3)],
			'xAxis!': ['Scan vector X', null, this.isTuple(3), this.parseTuple(3)],
			'yAxis!': ['Scan vector Y', null, this.isTuple(3), this.parseTuple(3)],
			'size!': ['Output image size', null, this.isTuple(2), this.parseTuple(2, true)],
			interpolation: ['Interpolation mode', false, null, this.parseBoolean],
			ww: ['Window width', undefined, 'isFloat', 'toFloat'],
			wl: ['Window width', undefined, 'isFloat', 'toFloat'],
			format: ['Output type', 'arraybuffer', (s) => s === 'png', () => 'png']
		};
	}

	protected processVolume(
		req: express.Request, res: express.Response, next: express.NextFunction
	): void {
		const { ww, wl, origin, xAxis, yAxis, size, interpolation, format } = req.query;
		const vol = req.volume;
		const useWindow = (typeof ww === 'number' && typeof wl === 'number');
		if (format === 'png' && !useWindow) {
			next(this.createBadRequestError('Window values are required for PNG output.'));
			return;
		}
		if (size[0] * size[1] > 2048 * 2048) {
			next(this.createBadRequestError('Requested image size is too large.'));
			return;
		}
		if (size[0] <= 0 || size[1] <= 0) {
			next(this.createBadRequestError('Invalid image size'));
			return;
		}

		// Create the oblique image
		let buf: Uint8Array; // or similar
		if (useWindow) {
			buf = new Uint8Array(size[0] * size[1]);
		} else {
			buf = new (vol.getPixelFormatInfo().arrayClass)(size[0] * size[1]);
		}
		const section: Section = { origin, xAxis, yAxis };
		vol.scanObliqueSection(section, size, buf, interpolation, ww, wl);

		// Output
		if (format === 'png') {
			this.respondImage(res, new Buffer(buf), size[0], size[1]);
		} else {
			this.respondGzippedArrayBuffer(res, buf);
		}
	}

}
