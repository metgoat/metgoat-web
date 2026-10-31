import positionPanel from './positionPanel.js'

/**
 * Shows or hides the opacity panel for the shape or overlay layer, and hides the other panel if it's open.
 * @param {PointerEvent} e - The pointer event that triggered the function
 * @param {button} button - The display opacity panel button that was clicked to trigger the function
 * @param {div} panel - The opacity panel to show or hide
 */

export default function showOpacityPanel(e, button, panel) {
  e.stopPropagation();
  if (panel === shapeOpacityPanel) {
    overlayOpacityPanel.setAttribute('hidden', '');
  } else if (panel === overlayOpacityPanel) {
    shapeOpacityPanel.setAttribute('hidden', '');
  }
  const isHidden = panel.hasAttribute("hidden");
  if (isHidden) {
    positionPanel(panel);
    panel.removeAttribute('hidden');
  } else {
    panel.setAttribute('hidden', '');
  }
}