import DrawCanvasClass from './drawCanvasClass.js';
import drawRequestedFrame from './drawRequestedFrame.js';
import { setBckdClass, setDrawClass, setNumLayers, drawClass } from './main.js';

/**
 * Sets up the canvases, canvas classes, and event listeners after the
 * Google Drive Picker callback (i.e. once the user has selected map
 * images for the first time in this session).
 * @param {HTMLImageElement[]} images - Images to be added to the first layer
 * @param {string} first_filename - The filename of the first image to be added. This is currently used to name the layer for the dropdown.
 */

import BckdCanvasClass from './bckdCanvasClass.js'

export default function initCanvasFunctionality(images, first_filename) {
  bckdCanvas.width = canvasContainer.offsetWidth;
  bckdCanvas.height = canvasContainer.offsetHeight;
  drawCanvas.width = canvasContainer.offsetWidth;
  drawCanvas.height = canvasContainer.offsetHeight;

  setBckdClass(new BckdCanvasClass(images, first_filename));
  setDrawClass(new DrawCanvasClass());

  setNumLayers(1);

  drawRequestedFrame();

  // Fixes a problem where double clicking causes text selection on the canvas
  drawCanvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  
  drawCanvas.addEventListener('mousedown', function(e) {
    drawClass.doDown(e);
  }, true);

  drawCanvas.addEventListener('mousemove', function(e) {
    drawClass.doMove(e);
  }, true);

  drawCanvas.addEventListener('mouseup', function(e) {
    drawClass.doUp(e);
  }, true);

  drawCanvas.addEventListener('touchstart', function(e) {
    if (e.targetTouches.length > 0) drawClass.doDown(e.targetTouches[0]);
    e.preventDefault();
  }, true);
  
  drawCanvas.addEventListener('touchmove', function(e) {
    if (e.targetTouches.length > 0) drawClass.doMove(e.targetTouches[0]);
    e.preventDefault();
  }, true);

  drawCanvas.addEventListener('touchend', function(e) {
    if (e.targetTouches.length > 0) drawClass.doUp(e.targetTouches[0]);
    e.preventDefault();
  }, true);

  drawCanvas.addEventListener('dblclick', function(e) {
    drawClass.doDoubleClick(e);
  }, true);

  drawCanvas.addEventListener('wheel', function(e) {
    drawClass.doWheel(e);
  }, true);
}