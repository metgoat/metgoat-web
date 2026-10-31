import drawRequestedFrame from "./drawRequestedFrame";

/* Event listener & function to resize canvases with window resize */
window.addEventListener('resize', () => {
  resizeCanvases();
}); 

/**
 * Resizes both canvases to fill canvasContainer and redraws with the correct scale.
 */
function resizeCanvases() { 
  bckdCanvas.width = canvasContainer.offsetWidth;
  bckdCanvas.height = canvasContainer.offsetHeight;
  drawCanvas.width = canvasContainer.offsetWidth;
  drawCanvas.height = canvasContainer.offsetHeight;
  drawRequestedFrame();
}