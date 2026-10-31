import { viewport } from './main.js'

/**
 * Gets the correct selection box size for the current viewport scale and zoom.
 * @returns {number} The correct selection box size.
 */
export default function getSelBoxSize() {
  return 9 / (viewport.baseScale * viewport.userZoom);
}