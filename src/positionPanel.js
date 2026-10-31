/**
 * Positions the opacity panel in the lower-left corner of the canvas container
 * @param {HTMLElement} panel - The opacity panel to position
 */

export default function positionPanel(panel) {
  const rect = canvasContainer.getBoundingClientRect();
  panel.style.top = `${rect.height + 12}px`;
  panel.style.left = `${rect.left + 6}px`;
}