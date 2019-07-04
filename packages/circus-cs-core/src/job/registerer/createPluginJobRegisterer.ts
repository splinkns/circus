import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import MultiRange from 'multi-integer-range';
import { FunctionService } from '@utrad-ical/circus-lib';

export interface PluginJobRegisterer {
  register(
    jobId: string,
    payload: circus.PluginJobRequest,
    priority?: number
  ): Promise<void>;
}

function checkSeriesImageRange(
  imagesInSeries: MultiRange,
  series: circus.JobSeries
): void {
  if (typeof series.startImgNum === 'undefined') return;
  if (typeof series.startImgNum !== 'number') {
    throw new TypeError('Invalid startImgNum');
  }
  const wantedImages = new MultiRange();
  const endImgNum =
    Number(series.endImgNum) || (imagesInSeries.max() as number);
  const imageDelta = Number(series.imageDelta) || 1;
  for (let i = series.startImgNum; i <= endImgNum; i += imageDelta) {
    wantedImages.append(i);
  }
  if (!wantedImages.length() || !imagesInSeries.has(wantedImages)) {
    throw new RangeError(
      `Series ${series.seriesUid} does not contain enough images ` +
        'specified by startImgNum, endImgNum, imageDelta.\n' +
        `Images in the series: ${imagesInSeries.toString()}`
    );
  }
}

/**
 * Register a new job after data check for the payload
 */
const createPluginJobRegisterer: FunctionService<
  PluginJobRegisterer,
  {
    queue: circus.PluginJobRequestQueue;
    pluginDefinitionAccessor: circus.PluginDefinitionAccessor;
    dicomFileRepository: DicomFileRepository;
  }
> = async (options, deps) => {
  const { queue, pluginDefinitionAccessor, dicomFileRepository } = deps;

  async function register(
    jobId: string,
    payload: circus.PluginJobRequest,
    priority: number = 0
  ): Promise<void> {
    // Ensure jobId is alphanumerical.
    if (!/^[a-zA-Z0-9.]+$/.test(jobId)) {
      throw new Error('Invalid Job ID format.');
    }

    // Ensure the specified plug-in exists
    await pluginDefinitionAccessor.get(payload.pluginId);

    // Ensure all the specified series exist and each series has
    // enough images to process
    const seriesList = payload.series;
    if (!Array.isArray(seriesList) || !seriesList.length) {
      throw new TypeError('No series specified.');
    }
    for (let series of seriesList) {
      const loader = await dicomFileRepository.getSeries(series.seriesUid);
      const imagesInSeries = new MultiRange(loader.images);
      // Check the series exists
      if (!imagesInSeries.length()) {
        throw new Error(`Series ${series.seriesUid} not found.`);
      }
      checkSeriesImageRange(imagesInSeries, series);
    }

    // All check passed.
    await queue.enqueue(jobId, payload, priority);
  }

  return { register };
};

createPluginJobRegisterer.dependencies = [
  'queue',
  'pluginDefinitionAccessor',
  'dicomFileRepository'
];

export default createPluginJobRegisterer;