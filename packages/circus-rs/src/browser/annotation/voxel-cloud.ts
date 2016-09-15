import { Annotation } from './annotation';
import { Viewer } from '../viewer/viewer';
import { ViewState } from '../view-state';
import { Sprite } from '../viewer/sprite';
import RawData, { Vector3D, Vector2D } from '../../common/RawData';
import { PixelFormat } from '../../common/PixelFormat';
import {
	convertScreenCoordinateToVolumeCoordinate,
	convertVolumeCoordinateToScreenCoordinate,
	intersectionOfBoxAndPlane,
	intersectionPointWithinSection
} from '../geometry';
import { Section } from '../section';

/**
 * VoxelCloud is a type of Annotation that can be registered to a Composition.
 * This represents one voxel cloud annotation (aka voxel label).
 * An instance of VoxelCloud can be updated manually by the consumer of CIRCUS RS,
 * or automatically by various cloud manipulation tools.
 */
export class VoxelCloud implements Annotation {
	/**
	 * ShadowCanvas is a background canvas used to perform
	 * various pixel-based composite operations.
	 * @type {HTMLCanvasElement}
	 */
	private static shadowCanvas: HTMLCanvasElement;

	/**
	 * Displayed color of the cloud, in the form of '#ff00ff'
	 */
	public color: string;

	/**
	 * Alpha value of the cloud, must be between 0.0 and 1.0
	 */
	public alpha: number;

	/**
	 * Actual volume data. The pixelFormat must be set to Binary.
	 */
	public volume: RawData;

	/**
	 * The position of the origin of this volume data in the voxel coordinate of ImageSource.
	 * Should be in voxel coordinate (not in mm)!
	 */
	public origin: [number, number, number];

	/**
	 * Determines whether this VoxelCloud is the target of the
	 * cloud manipulation tools (e.g., BrushTool, EraserTool).
	 */
	public active: boolean;

	/**
	 * If set to true, draws some additional marks useful for debugging.
	 */
	public debugPoint: boolean;

	/**
	 * Prepares a shadow canvas, which is large enough to contain
	 * the given size. The shadow canvas can be used to
	 * perform background image processing.
	 */
	private prepareShadowCanvas(resolution: [number, number]): HTMLCanvasElement {

		if (!(VoxelCloud.shadowCanvas instanceof HTMLCanvasElement)) {
			// Create new
			const canvas = document.createElement('canvas');
			canvas.width = resolution[0];
			canvas.height = resolution[1];
			VoxelCloud.shadowCanvas = canvas;
			return canvas;
		}

		// Use the existing one
		const canvas = VoxelCloud.shadowCanvas;
		// Setting the width/height of a canvas makes the canvas cleared
		if (canvas.width < resolution[0]) canvas.width = resolution[0];
		if (canvas.height < resolution[1]) canvas.height = resolution[1];
		return canvas;
	}

	private toMillimeter(vector: Vector3D): Vector3D {
		const voxelSize = this.volume.getVoxelDimension();
		return [
			vector[0] * voxelSize[0],
			vector[1] * voxelSize[1],
			vector[2] * voxelSize[2]
		];
	}

	public draw(viewer: Viewer, viewState: ViewState): Sprite {
		if (!(this.volume instanceof RawData)) return;
		if (this.volume.getPixelFormat() !== PixelFormat.Binary) {
			throw new Error('The assigned volume must use binary data format.');
		}

		const context = viewer.canvas.getContext('2d');
		const resolution = viewer.getResolution();
		const section = viewState.section;

		/*
		 * STEP 1. Check if this cloud intersects the current section.
		 */

		const mmOrigin = this.toMillimeter(this.origin);
		const mmDim = this.toMillimeter(this.volume.getDimension());
		const intersections = intersectionOfBoxAndPlane(mmOrigin, mmDim, section);

		if (!intersections) {
			// The bounding box of this voxel cloud does not intersect with the section.
			// No need to draw anything.
			return null;
		}
		if (intersections.every(p => !intersectionPointWithinSection(section, p))) {
			// All of the intersection points are outside of sections
			return null;
		}

		/*
		 * STEP 2. Determine the bounding box of intersection points.
		 */
		// Converts the 3D intersection points to section-based 2D coordinates
		// and get the box that contains all the intersection points.
		let leftTop = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
		let rightBottom = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
		intersections.forEach(i => {
			const p2 = convertVolumeCoordinateToScreenCoordinate(section, resolution, i);

			leftTop[0] = Math.min(leftTop[0], p2[0]);
			leftTop[1] = Math.min(leftTop[1], p2[1]);
			rightBottom[0] = Math.max(rightBottom[0], p2[0]);
			rightBottom[1] = Math.max(rightBottom[1], p2[1]);

			if (this.debugPoint) circle(context, p2);
		});

		if (this.debugPoint) rectangle(context, leftTop, rightBottom);

		// Calculates the sub-section of the current section which
		// contains the intersection area of this voxel cloud.
		const cloudResolution: Vector2D = [
			rightBottom[0] - leftTop[0],
			rightBottom[1] - leftTop[1]
		];

		const boundingOrigin = convertScreenCoordinateToVolumeCoordinate(section, resolution, [leftTop[0], leftTop[1]]);
		const boundingXAxisEnd = convertScreenCoordinateToVolumeCoordinate(section, resolution, [rightBottom[0], leftTop[1]]);
		const boundingYAxisEnd = convertScreenCoordinateToVolumeCoordinate(section, resolution, [leftTop[0], rightBottom[1]]);

		const cloudSection: Section = {
			origin: [
				boundingOrigin[0] - mmOrigin[0],
				boundingOrigin[1] - mmOrigin[1],
				boundingOrigin[2] - mmOrigin[2]
			],
			xAxis: [
				boundingXAxisEnd[0] - boundingOrigin[0],
				boundingXAxisEnd[1] - boundingOrigin[1],
				boundingXAxisEnd[2] - boundingOrigin[2]
			],
			yAxis: [
				boundingYAxisEnd[0] - boundingOrigin[0],
				boundingYAxisEnd[1] - boundingOrigin[1],
				boundingYAxisEnd[2] - boundingOrigin[2]
			]
		};


		/*
		 * STEP 3. Create the image data
		 */
		const color = [
			parseInt(this.color.substr(1, 2), 16),
			parseInt(this.color.substr(3, 2), 16),
			parseInt(this.color.substr(5, 2), 16),
			Math.round(0xff * this.alpha)
		];

		/**
		 * scan oblique pattern ...
		 */
		// let o = cloudSection.origin;
		// let u = cloudSection.xAxis.map((i) => i / cloudResolution[0]);
		// let v = cloudSection.yAxis.map((i) => i / cloudResolution[1]);
		// let vs = this.volume.getVoxelDimension();
		// let imageBuffer = new Uint8Array(cloudResolution[0] * cloudResolution[1]);

		// this.volume.scanOblique(
		// [ o[0] / vs[0], o[1] / vs[1], o[2] / vs[2] ],
		// [ u[0] / vs[0], u[1] / vs[1], u[2] / vs[2] ],
		// [ v[0] / vs[0], v[1] / vs[1], v[2] / vs[2] ],
		// cloudResolution,
		// imageBuffer,
		// 1, 0.5
		// );

		// raw section pattern ...
		let rawSection = this.volume.mmGetSection(
			cloudSection.origin,
			cloudSection.xAxis,
			cloudSection.yAxis,
			cloudResolution,
			false
		);

		let imageData = context.createImageData(cloudResolution[0], cloudResolution[1]);
		let srcidx = 0, pixel, dstidx;
		for (let y = 0; y < cloudResolution[1]; y++) {
			for (let x = 0; x < cloudResolution[0]; x++) {
				// pixel = imageBuffer[srcidx]; // scan oblique pattern ...
				pixel = rawSection.read(srcidx); // raw section pattern ...
				dstidx = srcidx << 2; // meaning multiply 4
				if (pixel === 1) {
					imageData.data[dstidx] = color[0];
					imageData.data[dstidx + 1] = color[1];
					imageData.data[dstidx + 2] = color[2];
					imageData.data[dstidx + 3] = color[3];
				} else if (this.debugPoint) {
					imageData.data[dstidx] = 0xff;
					imageData.data[dstidx + 1] = 0xff;
					imageData.data[dstidx + 2] = 0xff;
					imageData.data[dstidx + 3] = 0xff * 0.2;
				}
				srcidx++;
			}
		}

		// Put the image to the shadow canvas
		const shadow = this.prepareShadowCanvas(cloudResolution);
		const shadowContext = shadow.getContext('2d');
		shadowContext.clearRect(0, 0, resolution[0], resolution[1]);
		shadowContext.putImageData(imageData, 0, 0);

		// Transfers the image from the shadow canvas to the actual canvas
		context.drawImage(
			shadow,
			0, 0, cloudResolution[0], cloudResolution[1], // src
			leftTop[0], leftTop[1], rightBottom[0] - leftTop[0], rightBottom[1] - leftTop[1] // dest
		);

		return null;
	}

}

/**
 * For debugging
 */
function circle(context, center: [number, number], radius: number = 2, color: string = 'rgba(255, 0, 0, 1.0)'): void {
	context.save();
	context.beginPath();
	context.arc(center[0], center[1], radius, 0, Math.PI * 2);
	context.closePath();
	context.fillStyle = color;
	context.fill();
	context.restore();
}

function rectangle(context, leftTop: number[], rightBottom: number[], color: string = 'rgba(128, 128, 128, 1.0)',
	linewidth: number = 1
): void {
	context.save();
	context.beginPath();
	context.rect(leftTop[0], leftTop[1], rightBottom[0] - leftTop[0], rightBottom[1] - leftTop[1]);
	context.closePath();
	context.lineWidth = linewidth;
	context.strokeStyle = color;
	context.stroke();
	context.restore();
}
