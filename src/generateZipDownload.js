/**
 * Bundles exported PNG frames and the shape-data CSV into a single
 * downloaded zip file (`trax_output.zip`).
 * @param {Blob[]} imageArray - PNG blobs from {@link downloadImageFrames}.
 * @param {string} csv - CSV content from {@link downloadCsv}.
 */
export default async function generateZipDownload(imageArray, csv) {
  const zip = new JSZip();
  var photoZip = zip.folder("canvas_images")
  for (let i = 0; i < imageArray.length; i++) {
    photoZip.file("image_" + i + ".png", imageArray[i]);
  }
  zip.file("shape_data.csv", csv);

  const zipData = await zip.generateAsync({
    type: "blob",
    streamFiles: true
  });

  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(zipData);
  link.download = "trax_output.zip";
  link.click();
}