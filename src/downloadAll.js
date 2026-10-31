import downloadImageFrames from './downloadImageFrames.js'
import downloadCsv from './downloadCsv.js'
import generateZipDownload from './generateZipDownload.js';

/*
 * Runs the full export pipeline: renders every frame/layer to images,
 * builds the shape-data CSV, and bundles both into a downloaded zip.
 */
export default async function downloadAll() {
  const imageArray = await downloadImageFrames();
  const csv = downloadCsv();
  generateZipDownload(imageArray, csv);
}