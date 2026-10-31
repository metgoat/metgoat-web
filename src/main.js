/** @file METGOAT: Web app to perform meteorological analysis through the drawing of contours */
/**
* @copyright
* Copyright 2026 Ezekiel Caldon
*/

/**
 * See docs/ARCHITECTURE.md for design overview and rationale. This and all other .js
 * file's doc comments describe individual class/method
 * behavior. You can run `jsdoc` to generate a browsable reference.
 * This documentation is available {@link|https://ecaldon.github.io/trax_app/docs/api/|here.}
 */

/**
* @license
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
* http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

/* Actual website code starts here */

/* Global variables */

/**
 * Index of the frame currently being displayed.
 * @type {number} @global
 */
export let frameIdx = 0;
export function setFrameIdx(n) { frameIdx = n; }
/**
 * Total number of frames loaded into the app.
 * @type {number} @global
 */
export let numFrames = 0;
export function setNumFrames(n) { numFrames = n; }
/**
 * Index of the map layer currently being displayed.
 * @type {number} @global
 */
export let layerIdx = 0;
export function setLayerIdx(n) { layerIdx = n; }
/**
 * Total number of layers loaded into the app.
 * @type {number} @global
 */
export let numLayers = 0;
export function setNumLayers(n) { numLayers = n; }
export function addToNumLayer() { numLayers += 1; }
/**
 * Scale factor each background image was drawn at, relative to its native size. Recorded in exported CSV metadata so coordinates can be mapped back to original image pixels.
 * @type {number} @global
 */
export let scale = [];
/**
 * Array of arrays of image filenames, one inner array per layer, used to label exported CSV rows.
 * @type {string[][]} @global
 */
export const layerFilenameArrays = [];
/**
 * The background-canvas controller for this session.
 * @type {BckdCanvasClass} @global
 */
import BckdCanvasClass from './bckdCanvasClass.js';
export let bckdClass;
export function setBckdClass(c) { bckdClass = c; }
/**
 * The drawing-canvas controller for this session.
 * @type {DrawCanvasClass} @global
 */
export let drawClass;
export function setDrawClass(c) { drawClass = c; }
/**
 * The drawing tool currently selected: 0 = select, 1 = pen, 2 = pan.
 * @type {number} @global
 */
export let currentTool = 1;
export function setCurrentTool(n) {currentTool = n;}
/**
 * Opacity of the shape layer as a decimal out of 1.
 * @type {number} @global
 * @default 1
 */
export let shapeOpacity = 1;
export function setShapeOpacity(n) {shapeOpacity = n;}
/**
 * Opacity of the "overlay last" layer as a decimal out of 1.
 * @type {number} @global
 * @default 0.5
 */
export let overlayOpacity = 0.5;
export function setOverlayOpacity(n) {overlayOpacity = n;}

/* Global constants */
/**
 * Object representing the user's view of the canvas, i.e., a camera able to zoom and pan around the canvas.
 * @type {Object} @global @constant
 * @property {number} baseScale - The base scale factor for the viewport.
 * @property {number} userZoom - The user-applied zoom factor.
 * @property {number} offsetX - The horizontal offset of the viewport.
 * @property {number} offsetY - The vertical offset of the viewport.
 */
export const viewport = {
  baseScale: 1,
  userZoom: 1,
  offsetX: 0,
  offsetY: 0
}
export function setViewportBaseScale(n) { viewport.baseScale = n; }
export function setViewportUserZoom(n) { viewport.userZoom = n; }
export function setViewportOffset(x, y) { viewport.offsetX = x; viewport.offsetY = y;}

/* HTML Objects */
/* This section declares the HTML elements used within the JS so their state can be read/modified and user actions responded to. */

/* Top controls */
/* Top left panel */
export const undo = document.querySelector("#undo");
export const redo = document.querySelector("#redo");
const zoomSlider = document.querySelector("#zoomSlider");
const zoomValue = document.querySelector("#zoomValue")
const zoomFit = document.querySelector("#zoomFit");
/* Frame label */
const frameLabel = document.querySelector("#frameNum");
/* Layer picker */
const layerPicker = document.querySelector("#layerPicker");

const download = document.querySelector("#download");

/* Canvas objects */
/**
 * The canvas the user sees is actually two stacked canvases: bckdCanvas
 * (the background map/radar imagery) and drawCanvas (user-drawn shapes).
 * Both live inside the canvasContainer div. See {@link
 * https://www.w3schools.com/graphics/canvas_drawing.asp|more info about the Canvas API}
 */
const canvasContainer = document.querySelector("#canvasContainer");
const bckdCanvas = document.querySelector("#bckdCanvas");
const drawCanvas = document.querySelector("#drawCanvas");

/* Draw controls */
const toolRadios = document.querySelectorAll('input[name="toolSelect"]');
/* Set current tool and cursor based on tool radios */
for (var i = 0, max = toolRadios.length; i < max; i++) {
    toolRadios[i].onclick = function() {
      currentTool = Number(this.value); // Set current tool to the value of the radio button
      // Set cursor style based on current tool
      if (currentTool === 1) {
        drawClass.selection = null; // Deselect any selected shape when switching to pen tool
        canvasContainer.style.cursor = "crosshair";
      } else if (currentTool === 2) {
        canvasContainer.style.cursor = "grab";
      } else {
        canvasContainer.style.cursor = "default";
      }
    }
}

/* Bottom controls */
/* Overlay/Opacity */
const shapeOverlayCheckbox = document.querySelector("#shapeOverlayCheckbox");
const shapeOpacityButton = document.querySelector("#shapeOpacityButton");
const shapeOpacityPanel = document.querySelector("#shapeOpacityPanel");
const shapeOpacitySlider = document.querySelector("#shapeOpacitySlider");
const shapeOpacityValue = document.querySelector("#shapeOpacityValue");
const overlayLastCheckbox = document.querySelector("#overlayLastCheckbox");
const overlayOpacityButton = document.querySelector("#overlayOpacityButton");
const overlayOpacityPanel = document.querySelector("#overlayOpacityPanel")
const overlayOpacitySlider = document.querySelector("#overlayOpacitySlider");
const overlayOpacityValue = document.querySelector("#overlayOpacityValue");
/* Frame navigation */
const bck = document.querySelector("#backOne");
const frameSlider = document.querySelector("#frameSlider");
const fwd = document.querySelector("#fwdOne");
/* Contour control */
const colorPicker = document.querySelector("#contourColor");
const contourLabel = document.querySelector("#contourLabel");
const pauseButton = document.querySelector("#endContour");
const deleteButton = document.querySelector("#deleteContour");

/* Command pattern classes */
import Command from './command.js';
import HistoryManager from './historyManager.js';

/* Shape class */
import Shape from './shape.js';

/** 
 * @namespace Concrete Commands 
 *
 * @description Each concrete command extends Command and implements a constructor
 * (saving everything needed to execute/undo/redo), execute() (which also
 * serves as redo()), and undo().
 */

import changeFrame from './changeFrame.js'
import switchToDraw from './switchToDraw.js'
import switchToSelect from './switchToSelect.js'

/**
 * Keyboard shortcuts (ignored while a form input is focused, or while a
 * modifier key is held): z/y undo/redo, Escape deselect, arrow
 * left/right change frame, arrow up/down change layer, s/d switch
 * select/draw tool, Enter switch to select after finishing a pen-drawn
 * shape.
 */
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.matches("input, textarea, select")) return;

  switch (event.key) {
    case "z": drawClass.historyManager.undo(); break;
    case "y": drawClass.historyManager.redo(); break;
    case "Escape": deSelect(); break;
    case "ArrowLeft": if (frameIdx != 0) changeFrame(frameIdx - 1); break;
    case "ArrowRight": if (frameIdx < numFrames - 1) changeFrame(frameIdx + 1); break;
    case "ArrowUp": 
      event.preventDefault();
      if (layerIdx > 0) {
        layerIdx--;
        layerPicker.selectedIndex = layerIdx;
        bckdClass.draw(layerIdx, frameIdx);
      }
      break;
    case "ArrowDown":
      event.preventDefault();
      if (layerIdx < layerPicker.options.length - 1) {
        layerIdx++;
        layerPicker.selectedIndex = layerIdx;
        bckdClass.draw(layerIdx, frameIdx);
      }
      break;
    case "s": 
      event.preventDefault();
      switchToSelect();
      break;
    case "d": switchToDraw(); break;
    case "Enter": if (currentTool === 1 && drawClass.selection) switchToSelect(); break;
  }
});

/* Event listeners and functions for top-left non-Google functions (undo/redo, download) */
undo.addEventListener("click", () => {
  drawClass.historyManager.undo();
});

redo.addEventListener("click", () => {
  drawClass.historyManager.redo();
});

import drawRequestedFrame from './drawRequestedFrame.js';

zoomSlider.addEventListener("input", () => {
  viewport.userZoom = zoomSlider.value / 100;
  zoomValue.textContent = `${Math.round(viewport.userZoom * 100)}%`;
  drawRequestedFrame();
});

zoomFit.addEventListener("click", () => {
  viewport.userZoom = 1
  viewport.offsetX = 0
  viewport.offsetY = 0
  zoomSlider.value = viewport.userZoom * 100;
  zoomValue.textContent = `${Math.round(viewport.userZoom * 100)}%`;
  drawRequestedFrame();
});

import downloadAll from './downloadAll.js'

download.addEventListener("click", () => {
  downloadAll();
});

/* Event listener for layer picker */
layerPicker.addEventListener("change", (event) => {
  layerIdx = event.target.value;
  bckdClass.draw(event.target.value, frameIdx);
})

/* Event listener for overlayLast */

shapeOverlayCheckbox.addEventListener("click", () => {
  drawClass.draw(frameIdx);
});

import showOpacityPanel from './showOpacityPanel.js'

shapeOpacityButton.addEventListener("click", (e) => {
  showOpacityPanel(e, shapeOpacityButton, shapeOpacityPanel);
});

overlayLastCheckbox.addEventListener("click", () => {
  drawClass.draw(frameIdx);
});

overlayOpacityButton.addEventListener("click", (e) => {
  showOpacityPanel(e, overlayOpacityButton, overlayOpacityPanel);
});

document.addEventListener('click', (e) => {
  if (!shapeOpacityPanel.contains(e.target) && e.target !== shapeOpacityButton) {
    shapeOpacityPanel.setAttribute('hidden', '');
  }
  if (!overlayOpacityPanel.contains(e.target) && e.target !== overlayOpacityButton) {
    overlayOpacityPanel.setAttribute('hidden', '');
  }
});

import setLayerOpacity from './setLayerOpacity.js'

shapeOpacitySlider.addEventListener('input', () => {
  setLayerOpacity(shapeOpacitySlider, shapeOpacityValue, true);
});

overlayOpacitySlider.addEventListener('input', () => {
  setLayerOpacity(overlayOpacitySlider, overlayOpacityValue, false);
});

/* Event listeners & functions for frame navigation */

bck.addEventListener("click", () => {
  if (frameIdx != 0) {
    changeFrame(frameIdx - 1);
  }
});

fwd.addEventListener("click", () => {
  if (frameIdx < numFrames - 1) {
    changeFrame(frameIdx + 1);
  }
});

frameSlider.addEventListener("input", e => { /* TODO: Change accessibility feature so it doesn't skip multiple frames? */
  changeFrame(parseInt(e.target.value));
});

/* Event listeners & functions for contour parameter changes */

colorPicker.addEventListener("change", (event) => {
  drawClass.changeSelectedShapeColor(event);
});

contourLabel.addEventListener("change", (event) => {
  drawClass.changeSelectedShapeLabel(event);
});

pauseButton.addEventListener("click", () => {
  drawClass.pauseSelectedShape();
});

deleteButton.addEventListener("click", () => {
  drawClass.deleteSelectedShape();
});

/* Google Drive API spin-up */
// Authorization scopes required by the Google Drive/Picker APIs
document.getElementById('driveUpload').style.visibility = 'hidden';
document.getElementById('signout_button').disabled = true;

/* Load Google API client, GIS, Picker, and create picker */
import loadScript from './loadScript.js';
import { gapiLoaded, gisLoaded, handleAuthClick} from './auth.js';

Promise.all([
  loadScript('https://apis.google.com/js/api.js').then(gapiLoaded),
  loadScript('https://accounts.google.com/gsi/client').then(gisLoaded),
]).catch(err => console.error(err));