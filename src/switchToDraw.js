import { setCurrentTool } from './main.js'

const toolRadios = document.querySelectorAll('input[name="toolSelect"]');
const canvasContainer = document.querySelector("#canvasContainer");

/** Switches to the pen/draw tool (1): updates {@link currentTool}, the tool radio, and the cursor. */
export default function switchToDraw() {
  setCurrentTool(1);
  toolRadios[1].checked = true;
  canvasContainer.style.cursor = "crosshair";
}