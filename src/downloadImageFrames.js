import { numFrames, frameIdx, numLayers, drawClass, setShapeOpacity, bckdClass, layerIdx } from './main.js'

const shapeOpacitySlider = document.querySelector("#shapeOpacitySlider");

/**
 * Renders every layer/frame combination (background + drawn shapes) to
 * a flattened PNG blob, using a temporary off-screen canvas so the
 * visible canvases aren't disturbed. Restores the original layer/frame
 * view afterward.
 * @returns {Promise<Blob[]>} One PNG blob per layer/frame, in layer-major order.
 */
export default async function downloadImageFrames() { /* TODO: Uncheck the overlay last */
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  const imageArray = [];
  tempCanvas.width = bckdCanvas.width;
  tempCanvas.height = bckdCanvas.height;
  drawClass.deSelect();
  shapeOpacitySlider.value = 1;
  setShapeOpacity(1);
  shapeOverlayCheckbox.checked = true;
  overlayLastCheckbox.checked = false;
  for (let i = 0; i < numLayers; i++) {
    for (let j = 0; j < numFrames; j++) {
      // Draw background and contours for the current frame onto the temporary canvas
      bckdClass.draw(i, j);
      drawClass.draw(j);
      tempCtx.drawImage(bckdCanvas, 0, 0);
      tempCtx.drawImage(drawCanvas, 0, 0);

      const blob = await new Promise (resolve => {
        tempCanvas.toBlob(blob => resolve(blob));
      });
      imageArray.push(blob);
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
  }

  bckdClass.draw(layerIdx, frameIdx);
  drawClass.draw(frameIdx);
  
  return imageArray;
}