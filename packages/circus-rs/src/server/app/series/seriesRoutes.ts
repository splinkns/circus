import koa from 'koa';
import Router from 'koa-router';

import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import ImageEncoder from '../../helper/image-encoder/ImageEncoder';
import {
  VolumeProvider,
  VolumeAccessor
} from '../../helper/createVolumeProvider';

import loadVolumeProvider from './loadVolumeProvider';
import metadata from './metadata';
import volume from './volume';
import scan from './scan';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';
interface SeriesRoutesOptions {
  logger: Logger;
  volumeProvider: VolumeProvider;
  imageEncoder: ImageEncoder;
}

export interface SeriesMiddlewareState {
  volumeAccessor: VolumeAccessor;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  query?: any;
}

export default function seriesRoutes({
  logger,
  volumeProvider,
  imageEncoder
}: SeriesRoutesOptions): koa.Middleware {
  const router = new Router();
  const load = loadVolumeProvider({ logger, volumeProvider });
  router.use('/', load);
  router.get('/metadata', metadata());
  router.get('/volume', volume());
  router.get('/scan', scan({ imageEncoder }));
  return (router.routes() as any) as koa.Middleware;
}
