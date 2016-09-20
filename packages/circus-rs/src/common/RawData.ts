// Raw voxel container class

import { MultiRange } from 'multi-integer-range';

import { PixelFormat, PixelFormatInfo, pixelFormatInfo } from './PixelFormat';
import { RawDataSection } from './RawDataSection';
import { Vector2D, Vector3D, Box } from './geometry';

interface MprResult {
	image: Uint8Array;
	outWidth:  number;
	outHeight: number;
}

interface ObliqueResult extends MprResult {
	pixelSize: number;
	centerX: number;
	centerY: number;
}

// Make sure you don't add properties
// that heavily depends on DICOM spec!

/**
 * Raw voxel container with MPR support.
 */
export default class RawData {
	/**
	 * Number of voxels.
	 */
	protected size: Vector3D = null;

	/**
	 * Pixel format.
	 */
	protected pixelFormat: PixelFormat = PixelFormat.Unknown;

	/**
	 * The size of one voxel, measured in millimeter.
	 */
	protected voxelSize: Vector3D = null;

	/**
	 * Bytes per voxel [byte/voxel]
	 */
	protected bpp: number = 1;

	/**
	 * Actual image data.
	 */
	protected data: ArrayBuffer;

	/**
	 * The array view used with the array buffer (eg, Uint8Array)
	 */
	protected view: {[offset: number]: number};

	/**
	 * Voxel reader function.
	 */
	protected read: (pos: number) => number;

	/**
	 * Voxel writer function.
	 */
	protected write: (value: number, pos: number) => void;

	/**
	 * Holds which images are already loaded in this volume.
	 * When complete, this.loadedSlices.length() will be the same as this.size[2].
	 */
	protected loadedSlices: MultiRange = new MultiRange();

	/**
	 * Gets pixel value at the specified location. Each parameter must be an integer.
	 * @param x x-coordinate
	 * @param y y-coordinate
	 * @param z z-coordinate
	 * @return Corresponding voxel value.
	 */
	public getPixelAt(x: number, y: number, z: number): number {
		return this.read(x + (y + z * this.size[1]) * this.size[0]);
	}

	/**
	 * Write pixel value at the specified location.
	 * @param value Pixel value to write.
	 * @param x x-coordinate
	 * @param y y-coordinate
	 * @param z z-coordinate
	 */
	public writePixelAt(value: number, x: number, y: number, z: number): void {
		this.write(value, x + (y + z * this.size[1]) * this.size[0]);
	}

	/**
	 * Append z to loadedSlices:MultiRange.
	 * @param z {integer} z-coordinate
	 */
	public markSliceAsLoaded(z: number): void {
		if (z < 0 || z >= this.size[2]) {
			throw new RangeError('z-index out of bounds');
		}
		this.loadedSlices.append(z);
	}

	/**
	 * Get pixel value using bilinear interpolation.
	 * @param x x-coordinate (floating point)
	 * @param y y-coordinate (floating point)
	 * @param z z-coordinate (floating point)
	 * @return n Interpolated corresponding voxel value.
	 */
	public getPixelWithInterpolation(x: number, y: number, z: number): number {
		// Check values
		let x_end = this.size[0] - 1;
		let y_end = this.size[1] - 1;
		let z_end = this.size[2] - 1;
		if (x < 0.0 || y < 0.0 || z < 0.0 || x > x_end || y > y_end || z > z_end) {
			return 0;
		}

		// Handle edge cases
		let iz = Math.floor(z);
		if (iz >= z_end) {
			iz = z_end - 1;
			z = z_end;
		}
		let ix = Math.floor(x);
		if (ix >= x_end) {
			ix = x_end - 1;
			x = x_end;
		}
		let iy = Math.floor(y);
		if (iy >= y_end) {
			iy = y_end - 1;
			y = y_end;
		}

		// Calculate the weight of slices and determine the final value
		let value_z1 = this.getAxialInterpolation(ix, x, iy, y, iz);
		let value_z2 = this.getAxialInterpolation(ix, x, iy, y, iz + 1);
		let weight_z2 = z - iz;
		let weight_z1 = 1.0 - weight_z2;
		return value_z1 * weight_z1 + value_z2 * weight_z2;
	}

	/**
	 * Do 4-neighbor pixel interpolation within a given single axial slice.
	 * @protected
	 * @param ix {number}
	 * @param x {number}
	 * @param iy {number}
	 * @param y {number}
	 * @param intz {number}
	 * @return n {number}
	 */
	protected getAxialInterpolation(ix: number, x: number, iy: number, y: number, intz: number): number {
		let ixp1 = ix + 1;
		let iyp1 = iy + 1;

		// p0 p1
		// p2 p3
		let rx = this.size[0];
		let offset = rx * this.size[1] * intz; // offset of p0 (top-left pixel)
		let p0 = this.read(offset + ix + iy * rx);
		let p1 = this.read(offset + ixp1 + iy * rx);
		let p2 = this.read(offset + ix + iyp1 * rx);
		let p3 = this.read(offset + ixp1 + iyp1 * rx);

		let weight_x2 = x - ix;
		let weight_x1 = 1.0 - weight_x2;
		let weight_y2 = y - iy;
		let weight_y1 = 1.0 - weight_y2;
		let value_y1 = p0 * weight_x1 + p1 * weight_x2;
		let value_y2 = p2 * weight_x1 + p3 * weight_x2;
		return (value_y1 * weight_y1 + value_y2 * weight_y2);
	}

	/**
	 * Appends and overwrites one slice.
	 * Note that the input data must be in the machine's native byte order
	 * (i.e., little endian in x64 CPUs).
	 * @param z Z coordinate of the image inserted.
	 * @param imageData The inserted image data using the machine's native byte order.
	 */
	public insertSingleImage(z: number, imageData: ArrayBuffer): void {
		if (!this.size) {
			throw new Error('Dimension not set');
		}

		let [rx, ry, rz] = this.size;
		if (z < 0 || z >= rz) {
			throw new RangeError('z-index out of bounds');
		}

		if (rx * ry * this.bpp > imageData.byteLength) {
			throw new Error('Not enough buffer length');
		}

		let byteLength = rx * ry * this.bpp; // len:byte of surface
		let offset = byteLength * z;

		let src = new Uint8Array(imageData, 0, byteLength);
		let dst = new Uint8Array(this.data, offset, byteLength);
		dst.set(src); // This overwrites the existing slice (if any)
		this.loadedSlices.append(z);
	}

	/**
	 * Gets single image at the given z-coordinate.
	 * @param z z-coordinate
	 * @return The image data
	 */
	public getSingleImage(z: number): ArrayBuffer {
		if (!this.size) {
			throw new Error('Dimension not set');
		}

		let [rx, ry, rz] = this.size;
		if (z < 0 || z >= rz) {
			throw new RangeError('z-index out of bounds');
		}

		let byteLength = rx * ry * this.bpp;
		let offset = byteLength * z;
		let src = new Uint8Array(this.data, offset, byteLength);
		let buffer = new ArrayBuffer(byteLength);
		(new Uint8Array(buffer)).set(src);
		return buffer;
	}

	/**
	 * Set the size of the 'volume' and allocate an array.
	 * @param x {number} x-coordinate
	 * @param y {number} y-coordinate
	 * @param z {number} z-coordinate
	 * @param type {PixelFormat} enum
	 */
	public setDimension(x: number, y: number, z: number, type: PixelFormat): void {
		if (x <= 0 || y <= 0 || z <= 0) {
			throw new Error('Invalid volume size.');
		}
		if (this.size) {
			throw new Error('Dimension already fixed.');
		}
		if (x * y * z > 1024 * 1024 * 1024) {
			throw new Error('Maximum voxel limit exceeded.');
		}
		if (type === PixelFormat.Binary && (x * y) % 8 !== 0) { // image area must be multiple of 8
			throw new Error('Number of pixels in a slice must be a multiple of 8.');
		}

		this.size = [x, y, z];
		this.pixelFormat = type;
		let pxInfo = this.getPixelFormatInfo(this.pixelFormat);
		this.data = new ArrayBuffer(this.size[0] * this.size[1] * this.size[2] * pxInfo.bpp);
		this.setAccessor();
	}

	/**
	 * Assigns a correct `read` and `write` methods according to the
	 * current pixel format.
	 */
	protected setAccessor(): void {
		let pxInfo = this.getPixelFormatInfo(this.pixelFormat);
		this.bpp = pxInfo.bpp;
		this.view = new pxInfo.arrayClass(this.data);

		if (this.pixelFormat !== PixelFormat.Binary) {
			this.read = pos => this.view[pos];
			this.write = (value, pos) => this.view[pos] = value;
		} else {
			this.read = pos => (this.view[pos >> 3] >> (7 - pos % 8)) & 1;
			this.write = (value, pos) => {
				let cur = this.view[pos >> 3]; //pos => pos/8
				cur ^= (-value ^ cur) & (1 << (7 - pos % 8)); // set n-th bit to value
				this.view[pos >> 3] = cur;
			};
		}
	}

	/**
	 * Returns the voxel size of this volume.
	 * @return v3d {Vector3D}
	 */
	public getDimension(): Vector3D {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		return <Vector3D>this.size.slice(0);
	}

	/**
	 * Returns the current pixel format.
	 * @return p-format {PixelFormat}
	 */
	public getPixelFormat(): PixelFormat {
		return this.pixelFormat;
	}

	/**
	 * Returns the PixelFormatInfo object if no parameter was give.
	 * @param type ?PixelFormat
	 * @return {PixelFormatInfo}
	 */
	public getPixelFormatInfo(type?: PixelFormat): PixelFormatInfo {
		if (typeof type === 'undefined') {
			type = this.pixelFormat;
		}
		return pixelFormatInfo(type);
	}

	/**
	 * Sets the size of one voxel.
	 * @param width {number}
	 * @param height {number}
	 * @param depth {number}
	 */
	public setVoxelDimension(width: number, height: number, depth: number): void {
		this.voxelSize = [width, height, depth];
	}

	/**
	 * Returns the size of one voxel.
	 * @return v {Vector3D}
	 */
	public getVoxelDimension(): Vector3D {
		return <Vector3D>this.voxelSize.slice(0);
	}

	/**
	 * Returns the volume data size in bytes
	 * @return The byte size of the volume.
	 */
	public get dataSize(): number {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		return this.size[0] * this.size[1] * this.size[2] * this.bpp;
	}

	/**
	 * Converts this raw data to new pixel format, optionally using a filter.
	 * @param targetFormat
	 * @param filter
	 */
	public convert(targetFormat: PixelFormat, filter: (number) => number): void {
		let newRaw = new RawData();
		let [rx, ry, rz] = this.size;
		newRaw.setDimension(this.size[0], this.size[1], this.size[2], targetFormat);
		for (let z = 0; z < rz; z++) {
			for (let y = 0; y < ry; y++) {
				for (let x = 0; x < rx; x++) {
					let pos = x + (y + z * this.size[1]) * this.size[0];
					let value = this.read(pos);
					if (filter) {
						value = filter(value);
					}
					newRaw.write(value, pos);
				}
			}
		}
		this.pixelFormat = targetFormat;
		this.data = newRaw.data;
		this.setAccessor();
	}

	/**
	 * Fills the entire volume with the specified value.
	 * @param value
	 */
	public fillAll(value: number | ((x: number, y: number, z: number) => number)): void {
		const [rx, ry, rz] = this.size;
		this.fillCuboid(value, { origin: [0, 0, 0], size: [rx, ry, rz] });
	}

	/**
	 * Fills the specified cuboid region with the specified value.
	 * @param value
	 */
	public fillCuboid(
		value: number | ((x: number, y: number, z: number) => number),
		box: Box
	): void	{
		const [x, y, z] = box.origin;
		const xmax = x + box.size[0];
		const ymax = y + box.size[1];
		const zmax = z + box.size[2];
		if (typeof value === 'number') {
			for (let zz = z; zz < zmax; zz++) {
				for (let yy = y; yy < ymax; yy++) {
					for (let xx = x; xx < xmax; xx++) {
						this.writePixelAt(value, xx, yy, zz);
					}
				}
			}
		} else {
			for (let zz = z; zz < zmax; zz++) {
				for (let yy = y; yy < ymax; yy++) {
					for (let xx = x; xx < xmax; xx++) {
						this.writePixelAt(value(xx, yy, zz), xx, yy, zz);
					}
				}
			}
		}
	}

	/**
	 * Applies window level/width.
	 * @protected
	 * @param width {number}
	 * @param level {number}
	 * @param pixel {number}
	 * @return n {number} 0-255
	 */
	protected applyWindow(width: number, level: number, pixel: number): number {
		let value = Math.round((pixel - level + width / 2) * (255 / width));
		if (value > 255) {
			value = 255;
		} else if (value < 0) {
			value = 0;
		}
		return value;
	}

	/**
	 * Creates an orthogonal MPR image on a new array buffer.
	 * not oblique.
	 * MPR:multi-planar reconstruction
	 * @param axis {string}
	 * @param target {number}
	 * @param windowWidth {number}
	 * @param windowLevel {number}
	 * @return promise {Promise<MprResult>}
	 */
	public orthogonalMpr(
		axis: string,
		target: number,
		windowWidth: number,
		windowLevel: number
	): Promise<MprResult> {
		let image: Uint8Array;
		let buffer_offset = 0;
		let [rx, ry, rz] = this.size;

		let checkZranges = () => {
			if (this.loadedSlices.length() !== rz)
				throw new ReferenceError('Volume is not fully loaded to construct this MPR');
		};

		switch (axis) {
			case 'sagittal':
				checkZranges();
				image = new Uint8Array(ry * rz);
				for (let z = 0; z < rz; z++)
					for (let y = 0; y < ry; y++)
						image[buffer_offset++] =
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(target, y, z));
				return Promise.resolve({image, outWidth: ry, outHeight: rz});
			case 'coronal':
				checkZranges();
				image = new Uint8Array(rx * rz);
				for (let z = 0; z < rz; z++)
					for (let x = 0; x < rx; x++)
						image[buffer_offset++] =
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(x, target, z));
				return Promise.resolve({image, outWidth: rx, outHeight: rz});
			default:
			case 'axial':
				image = new Uint8Array(rx * ry);
				for (let y = 0; y < ry; y++)
					for (let x = 0; x < rx; x++)
						image[buffer_offset++] =
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(x, y, target));
				return Promise.resolve({image, outWidth: rx, outHeight: ry});
		}
	}

	/**
	 * count cube of voxel from center to edge of voxel
	 * @protected
	 * @param centerX {number}
	 * @param centerY {number}
	 * @param microX {number}
	 * @param microY {number}
	 * @param voxelX {number}
	 * @param voxelY {number}
	 * @return object {{count: number, px: number, py: number}}
	 */
	protected walkUntilObliqueBounds(
		centerX: number,
		centerY: number,
		microX: number,
		microY: number,
		voxelX: number,
		voxelY: number
	): { count: number, px: number, py: number} {
		let count = 0;
		let px = centerX;
		let py = centerY;
		while (true) {
			px += microX;
			py += microY;
			if (px < 0 || py < 0 || px > voxelX - 1 || py > voxelY - 1) break;
			count++;
		}
		return {count, px, py};
	}

	/**
	 * Scan over the volume and make an oblique image,
	 * starting from origin and along with the plane defined by eu/ev.
	 * The result is written to `image`.
	 * If windowWidth/Level is given, output image will be an Uint8Array.
	 * Otherwise, the output image must have the same pixel format as the
	 * source volume data.
	 * @protected
	 * @param origin {Vector3D}
	 * @param eu {Vector3D}
	 * @param ev {Vector3D}
	 * @param outSize {Vector2D}
	 * @param image {{[index: number]: number}}
	 * @param windowWidth {?number}
	 * @param windowLevel {?number}
	 */
	public scanOblique(
		origin: Vector3D,
		eu: Vector3D,
		ev: Vector3D,
		outSize: Vector2D,
		image: {[index: number]: number},
		windowWidth?: number,
		windowLevel?: number
	): void {
		let [rx, ry, rz] = this.size;
		let [x, y, z] = origin;
		let [eu_x, eu_y, eu_z] = eu;
		let [ev_x, ev_y, ev_z] = ev;
		let [outWidth, outHeight] = outSize;

		let imageOffset = 0;
		let value: number;

		let useWindow = (typeof windowWidth === 'number' && typeof windowLevel === 'number');

		for (let j = 0; j < outHeight; j++) {
			let [pos_x, pos_y, pos_z] = [x, y, z];

			for (let i = 0; i < outWidth; i++) {
				if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					&& pos_x <= rx - 1 && pos_y <= ry - 1 && pos_z <= rz - 1) {
					value = this.getPixelWithInterpolation(pos_x, pos_y, pos_z);
					if (useWindow) {
						value = this.applyWindow(windowWidth, windowLevel, value);
					}
				} else {
					value = 0;
				}
				image[imageOffset++] = Math.round(value);

				pos_x += eu_x;
				pos_y += eu_y;
				pos_z += eu_z;
			}
			x += ev_x;
			y += ev_y;
			z += ev_z;
		}
	}

	/**
	 * Determine how to scan oblique image
	 * @protected
	 * @param baseAxis {string}
	 * @param center {Vector3D}
	 * @param angle {number}
	 * @param minVoxelSize {number} smallest size of this.voxelSize
	 * @return object {{outSize: Vector2D, outCenter: Vector2D, eu: Vector3D, ev: Vector3D, origin: Vector3D}}
	 */
	protected determineObliqueSizeAndScanOrientation(
		baseAxis: string,
		center: Vector3D,
		angle: number,
		minVoxelSize: number
	): {outSize: Vector2D, outCenter: Vector2D, eu: Vector3D, ev: Vector3D, origin: Vector3D
	} {
		let [eu_x, eu_y, eu_z] = [0, 0, 0];
		let [ev_x, ev_y, ev_z] = [0, 0, 0];
		let [rx, ry, rz] = this.size;
		let [vx, vy, vz] = this.voxelSize;
		let [centerX, centerY] = [0, 0];
		let [outWidth, outHeight] = [0, 0];
		let origin: Vector3D;

		// Determine output size
		if (baseAxis === 'axial') {
			eu_x = Math.cos(angle) * minVoxelSize / vx;
			eu_y = -1.0 * Math.sin(angle) * minVoxelSize / vy;
			ev_z = minVoxelSize / vz;

			let minus = this.walkUntilObliqueBounds(center[0], center[1], -eu_x, -eu_y, rx, ry);
			let plus = this.walkUntilObliqueBounds(center[0], center[1], eu_x, eu_y, rx, ry);

			origin = [minus.px, minus.py, 0];
			centerX = minus.count;
			centerY = Math.floor(center[2] * vz / minVoxelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(rz * vz / minVoxelSize);
		} else if (baseAxis === 'coronal') {
			eu_x = Math.cos(angle) * minVoxelSize / vx;
			eu_z = -1.0 * Math.sin(angle) * minVoxelSize / vz;
			ev_y = minVoxelSize / vy;

			let minus = this.walkUntilObliqueBounds(center[0], center[2], -eu_x, -eu_z, rx, rz);
			let plus = this.walkUntilObliqueBounds(center[0], center[2], eu_x, eu_z, rx, rz);

			origin = [minus.px, 0, minus.py];
			centerX = minus.count;
			centerY = Math.floor(center[1] * vy / minVoxelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(ry * vy / minVoxelSize);
		} else if (baseAxis === 'sagittal') {
			eu_x = minVoxelSize / vx;
			ev_y = Math.cos(angle) * minVoxelSize / vy;
			ev_z = -1.0 * Math.sin(angle) * minVoxelSize / vz;

			let minus = this.walkUntilObliqueBounds(center[1], center[2], -ev_y, -ev_z, ry, rz);
			let plus = this.walkUntilObliqueBounds(center[1], center[2], ev_y, ev_z, ry, rz);

			origin = [0, minus.px, minus.py];
			centerX = Math.floor(center[0] * vx / minVoxelSize);
			centerY = minus.count;
			outWidth = Math.floor(rx * vx / minVoxelSize);
			outHeight = minus.count + plus.count + 1;
		} else {
			throw new Error('Invalid axis argument.');
		}

		return {
			outSize: [outWidth, outHeight],
			outCenter: [centerX, centerY],
			eu: [eu_x, eu_y, eu_z],
			ev: [ev_x, ev_y, ev_z],
			origin
		};
	}

	/**
	 * Creates a single oblique MPR image on a new array buffer.
	 * @param baseAxis {string}
	 * @param center {Vector3D}
	 * @param angle {number} angle
	 * @param windowWidth {number}
	 * @param windowLevel {number}
	 * @return promise {Promise<ObliqueResult>}
	 */
	public singleOblique(
		baseAxis: string,
		center: Vector3D,
		angle: number,
		windowWidth?: number,
		windowLevel?: number
	): Promise<ObliqueResult> {
		let [vx, vy, vz] = this.voxelSize;
		// Determine the output image resolution,
		// which must be the smallest voxel size of the three axis.
		let pixelSize = Math.min(vx, vy, vz);

		// Determine the output image bounds
		let {outSize, outCenter, eu, ev, origin} =
			this.determineObliqueSizeAndScanOrientation(baseAxis, center, angle, pixelSize);

		// Prepare the image buffer for output
		let image = new Uint8Array(outSize[0] * outSize[1]);

		// Iterate over the output image
		this.scanOblique(origin, eu, ev, outSize, image, windowWidth, windowLevel);
		return Promise.resolve({
			image,
			outWidth: outSize[0], outHeight: outSize[1],
			centerX: outCenter[0], centerY: outCenter[1],
			pixelSize
		});
	}

	/**
	 * Returns the dimension of this volume measured in millimeter.
	 */
	public getMmDimension(): Vector3D {
		if (!this.size) throw new Error('Dimension not set');
		if (!this.voxelSize) throw new Error('voxel size not set');

		return [
			this.size[0] * this.voxelSize[0],
			this.size[1] * this.voxelSize[1],
			this.size[2] * this.voxelSize[2]
		];
	}

	/**
	 * Returns the nearest voxel index of the given point measured in millimeters.
	 * @param mmX
	 * @param mmY
	 * @param mmZ
	 * @returns An array of integers which corresponds to the voxel position.
	 */
	public mmIndexAt(mmX: number, mmY: number, mmZ: number): Vector3D {
		if (mmX < 0.0 || mmY < 0.0 || mmZ < 0.0) return null;

		const [ix, iy, iz] = [
			Math.floor(mmX / this.voxelSize[0]),
			Math.floor(mmY / this.voxelSize[1]),
			Math.floor(mmZ / this.voxelSize[2])
		];
		if (this.size[0] <= ix || this.size[1] <= iy || this.size[2] <= iz) return null;

		return [ix, iy, iz];
	}

	public mmGetSection(
		origin_mm: Vector3D,
		u_mm: Vector3D,
		v_mm: Vector3D,
		resolution: Vector2D,
		interpolation: boolean = true
	): RawDataSection {

		let [o_x, o_y, o_z] = [
			origin_mm[0],
			origin_mm[1],
			origin_mm[2] ];
		let u_count = resolution[0];
		let [ u_step_w, u_step_h, u_step_d ] = [
			u_mm[0] / u_count,
			u_mm[1] / u_count,
			u_mm[2] / u_count ];

		let v_count = resolution[1];
		let [ v_step_w, v_step_h, v_step_d ] = [
			v_mm[0] / v_count,
			v_mm[1] / v_count,
			v_mm[2] / v_count ];

		let reader = interpolation
			? (pos_x, pos_y, pos_z) => {
				let pidx = this.mmIndexAt( pos_x, pos_y, pos_z );
				return pidx ? this.getPixelWithInterpolation( pidx[0], pidx[1], pidx[2] ) : 0;
			}
			: (pos_x, pos_y, pos_z) => {
				let pidx = this.mmIndexAt( pos_x, pos_y, pos_z );
				return pidx ? this.getPixelAt( pidx[0], pidx[1], pidx[2] ) : 0;
			};

		let section = new RawDataSection( u_count, v_count, this.pixelFormat );
		let offset = 0;
		let [ v_walker_x, v_walker_y, v_walker_z ] = [o_x, o_y, o_z];
		for( let j = 0; j < v_count; j++ ){
			let [ u_walker_x, u_walker_y, u_walker_z ] = [ v_walker_x, v_walker_y, v_walker_z ];
			for( let i = 0; i < u_count; i++ ){
				section.write( offset++, reader( u_walker_x, u_walker_y, u_walker_z ) );
				u_walker_x += u_step_w;
				u_walker_y += u_step_h;
				u_walker_z += u_step_d;
			}
			v_walker_x += v_step_w;
			v_walker_y += v_step_h;
			v_walker_z += v_step_d;
		}

		return section;
	}
}
