import { numFrames, setNumFrames, layerIdx, viewport, frameIdx, numLayers, setViewportBaseScale, setLayerIdx, addToNumLayer } from "./main.js"

const frameSlider = document.querySelector("#frameSlider");
const layerPicker = document.querySelector("#layerPicker");
const bckdCanvas = document.querySelector("#bckdCanvas");
const bckdCtx = bckdCanvas.getContext('2d');

/**
 * Controls the background canvas, which renders the map/radar imagery
 * for the current layer and frame. It lies underneath the {@link DrawCanvasClass}.
 */
export default class BckdCanvasClass {
  /**
   * @param {HTMLImageElement[]} images - Frame images for the first layer, in frame order.
   * @param {string} first_filename - Filename of the first image, shown in the layer picker.
   */
  constructor(images, first_filename) {
    /**
     * Array of per-layer image arrays.
     * @type {HTMLImageElement[][]}
     */
    this.layers = [];
    this.layers.push(images);
    setNumFrames(images.length);
    frameSlider.max = numFrames - 1;
    frameSlider.value = frameIdx;
    var opt = document.createElement('option');
    opt.value = numLayers;
    opt.innerHTML = first_filename;
    layerPicker.appendChild(opt);
  }

  /**
   * Adds a new layer of images. All layers must share the same frame count.
   * @param {HTMLImageElement[]} images
   * @param {string} first_filename
   * @throws {Error} If `images.length` doesn't match the existing frame count.
   */
  addLayer(images, first_filename) {
    if (images.length != numFrames) {
      window.alert("New layer must have same number of frames as existing layers");
      throw new Error("New layer must have same number of frames as existing layers");
    }
    this.layers.push(images);
    var opt = document.createElement('option');
    opt.value = numLayers;
    addToNumLayer();
    opt.innerHTML = first_filename;
    layerPicker.appendChild(opt);
    this.draw(numLayers-1, frameIdx);
    layerPicker.selectedIndex = numLayers-1;
    setLayerIdx(numLayers-1);
  }

  /** Clears the background canvas. */
  clear() {
    bckdCtx.clearRect(0, 0, bckdCanvas.width, bckdCanvas.height);
  }

  /**
   * Draws the image for the given layer/frame, scaling it down to fit
   * within canvasContainer if it's larger than the canvas in either
   * dimension. Updates the global {@link scale} factor used in CSV export.
   * @param {number} layer - Number of the {@link layerIdx | layer} to be drawn
   * @param {number} frame - Number of the {@link frameIdx | frame} to be drawn
   */
  draw(layer, frame) {
    this.clear();
    const curImg = this.layers[layer][frame];
    setViewportBaseScale(computeBaseScale(curImg, bckdCanvas));
    bckdCtx.save();
    bckdCtx.translate(viewport.offsetX, viewport.offsetY);
    bckdCtx.scale(viewport.baseScale * viewport.userZoom, viewport.baseScale * viewport.userZoom);
    bckdCtx.drawImage(curImg,0,0);
    bckdCtx.restore();
  }
}

/**
 * @param {HTMLImageElement} img - The image to compute the scale for.
 * @param {HTMLCanvasElement} canvas - The canvas to fit the image into.
 * @returns {number} The scale factor to fit the image into the canvas.
 */
function computeBaseScale(img, canvas) {
  return Math.min(canvas.width / img.width, canvas.height / img.height);
}