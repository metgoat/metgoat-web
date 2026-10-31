/**
 * Changes the current frame: updates {@link frameIdx}, syncs the frame
 * slider/label, and redraws.
 * @param {number} newFrame
 */

import { frameIdx, setFrameIdx, drawClass, numFrames } from './main.js'
import drawRequestedFrame from './drawRequestedFrame.js'

const frameSlider = document.querySelector("#frameSlider");
const frameLabel = document.querySelector("#frameNum");

export default function changeFrame(newFrame) {
  setFrameIdx(newFrame);
  frameSlider.value = frameIdx;
  frameLabel.textContent = `Frame ${frameIdx+1}/${numFrames}`;
  if (drawClass.selection) {
    drawClass.selection.deactivateProvisionalPoints();
  }
  drawRequestedFrame();
}