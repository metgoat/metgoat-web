import { numFrames, numLayers, scale, drawClass, layerFilenameArrays } from './main.js'

/**
 * Builds the exported CSV of shape data. The first row is a `META`
 * row carrying the current {@link scale} factor (so exported
 * pixel coordinates can be mapped back to original image resolution).
 * The header row is sized dynamically to the
 * largest point count across all shapes/frames (see
 * {@link DrawCanvasClass#getMaxNumPoints|DrawCanvasClass.getMaxNumPoints()}). One data row is written per
 * shape per frame on which that shape exists (i.e. isn't paused).
 * @returns {string} CSV content, with `\r\n` line endings.
 */
export default function downloadCsv() {
  let csvContent = "";

  const metaRow = ["META", "scale_factor", scale]
  let row = metaRow.join(",");
  csvContent += row + "\r\n";

  const headerRow = ["num", "label", "closed", "frame_num"]
  for (var i = 0; i < numLayers; i++) {
    headerRow.push("layer_" + (i+1).toString() + "_filename");
  }
  for (var i = 0; i < drawClass.getMaxNumPoints(); i++) {
    headerRow.push("coord_" + ((i+1).toString() + "_x"));
    headerRow.push("coord_" + ((i+1).toString() + "_y"));
  }

  row = headerRow.join(",");
  csvContent += row + "\r\n";

  for (var i = 0; i < drawClass.shapes.length; i++) {
    for (var j = 0; j < numFrames; j++) {
      if (drawClass.shapes[i].frames[j]) {
        const dataRow = [i.toString(), drawClass.shapes[i].label, drawClass.shapes[i].closed.toString(), j.toString()];
        for (var k = 0; k < numLayers; k++) {
          dataRow.push(layerFilenameArrays[k][j]);
        }
        for (var k = 0; k < drawClass.shapes[i].frames[j].length; k++) {
          dataRow.push(drawClass.shapes[i].frames[j][k].x);
          dataRow.push(drawClass.shapes[i].frames[j][k].y);
        }
        row = dataRow.join(",");
        csvContent += row + "\r\n";
      }
    }
  }
  return csvContent;
}