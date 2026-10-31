import { numFrames, frameIdx, bckdClass, drawClass, layerIdx, viewport} from './main.js'

const frameLabel = document.querySelector("#frameNum");
const zoomSlider = document.querySelector("#zoomSlider");
const zoomValue = document.querySelector("#zoomValue")

/**
 * Redraws both canvases for the current global frame/layer. Called
 * whenever the frame or layer changes.
 */
export default async function drawRequestedFrame() {
  // console.log(canvasContainer.offsetWidth, canvasContainer.offsetHeight)
  // console.log(bckdCanvas.width, bckdCanvas.height)
  frameLabel.textContent = `Frame ${frameIdx+1}/${numFrames}`;
  bckdClass.clear();
  drawClass.clear();
  bckdClass.draw(layerIdx, frameIdx);
  drawClass.draw(frameIdx);
  zoomSlider.value = viewport.userZoom * 100;
  zoomValue.textContent = `${Math.round(viewport.userZoom * 100)}%`;
}