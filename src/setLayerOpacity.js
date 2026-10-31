/**
 * Set the opacity of the shape or overlay layer based on the slider value and update the corresponding label.
 * @param {input} slider 
 * @param {span} valueLabel 
 * @param {boolean} isItShape 
 */

import { frameIdx, setShapeOpacity, setOverlayOpacity, drawClass } from './main.js'

export default function setLayerOpacity(slider, valueLabel, isItShape) {
  const val = slider.value;
  valueLabel.textContent = `${val}%`;
  if (isItShape) {
    setShapeOpacity(val/100);
  } else {
    setOverlayOpacity(val/100);
  }
  drawClass.draw(frameIdx);
}