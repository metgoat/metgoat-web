import { setCurrentTool } from './main.js'

const toolRadios = document.querySelectorAll('input[name="toolSelect"]');
const canvasContainer = document.querySelector("#canvasContainer");

/** Switches to the select tool (0): updates {@link currentTool}, the tool radio, and the cursor. */
export default function switchToSelect() {
  setCurrentTool(0);
  toolRadios[0].checked = true;
  canvasContainer.style.cursor = "default";
}