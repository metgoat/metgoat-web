import Command from './command.js'
import changeFrame from './changeFrame.js'
import switchToDraw from './switchToDraw.js'
import switchToSelect from './switchToSelect.js'
import { numFrames, frameIdx, drawClass } from './main.js'
import Shape from './shape.js'

const colorPicker = document.querySelector("#contourColor");
const pauseButton = document.querySelector("#endContour");
const deleteButton = document.querySelector("#deleteContour");

/**
 * Adds a point to a shape at (`x`, `y`) on the current frame (and all future
 * frames, per {@link Shape#addPoint|Shape.addPoint}).
 * @extends Command
 * @memberof Concrete Commands
 */
export class AddPointCommand extends Command {
  /**
   * @param {Shape} shape - Shape object for the point to be added to
   * @param {number} x - x coordinate of the point to be added
   * @param {number} y - y coordinate of the point to be added
   */
  constructor(shape, x, y) {
    super();
    this.shape = shape;
    this.x = x;
    this.y = y;
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    switchToDraw();
    this.shape.addPoint(this.x, this.y);
    drawClass.selection.deactivateProvisionalPoints();
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    drawClass.selection.deactivateProvisionalPoints();
    this.shape.deleteLastPoint();
  }
}

/**
 * Closes the shape and switches to the select tool. Used
 * when the pen tool clicks near a shape's first point.
 * @extends Command
 * @memberof Concrete Commands
 */

export class CloseShapeCommand extends Command {
  /** @param {Shape} shape */
  constructor(shape) {
    super();
    this.shape = shape;
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.closed = true;
    switchToSelect();
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.closed = false;
    drawClass.selection = this.shape;
    switchToDraw();
  }
}

/**
 * Changes a shape's stroke color.
 * @extends Command
 * @memberof Concrete Commands
 */

export class ColorChangeCommand extends Command {
  /**
   * @param {Shape} shape
   * @param {string} newColor
   */
  constructor(shape, newColor) {
    super();
    this.shape = shape;
    /**
     * The original stroke color of the shape.
     * @type {color}
     */
    this.oldColor = shape.color;
    this.newColor = newColor;
  }

  execute() {
    this.shape.color = this.newColor;
  }

  undo() {
    this.shape.color = this.oldColor;
  }
}

/**
 * Deletes a shape entirely, restoring full contour-editor UI state on
 * undo so it's indistinguishable from never having been deleted.
 * @extends Command
 * @memberof Concrete Commands
 */

export class ContourDeleteCommand extends Command {
  /**
   * @param {DrawCanvasClass} drawClass - drawClass for the contour to be deleted from
   * @param {Shape} shape - Shape to be deleted
   */
  constructor(drawClass, shape) {
    super();
    this.drawClass = drawClass;
    this.shape = shape;
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    drawClass.deSelect();
    drawClass.selection = this.shape;
    drawClass.removeSelectedShape();
    switchToSelect();
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    switchToDraw();
    this.drawClass.addShape(this.shape);
    this.drawClass.selection = this.shape;
    colorPicker.disabled = false;
    colorPicker.value = this.shape.color;
    contourLabel.disabled = false;
    contourLabel.value = this.shape.label;
    pauseButton.disabled = false;
    deleteButton.disabled = false;
  }
}

/**
 * Creates a new shape with its first point at (`x`, `y`). Used when the pen
 * tool is clicked with no shape currently selected.
 * @extends Command
 * @memberof Concrete Commands
 */

export class CreateShapeCommand extends Command {
  /**
   * @param {DrawCanvasClass} drawClass - drawClass object to draw the shape to
   * @param {number} x - x coordinate for the first point of the shape
   * @param {number} y - y coordinate for the first point of the shape
   */
  constructor(drawClass, x, y) {
    super();
    this.drawClass = drawClass;
    this.x = x;
    this.y = y;
    /**
     * Saves the shape object so redo reuses the same shape instance.
     * @type {Shape|null}
     */
    this.shape = null;
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    switchToDraw();
    if (!this.shape) {
      this.shape = new Shape([{x: this.x, y: this.y}], false, "#ff0000", "Enter a label...");
    }
    this.drawClass.addShape(this.shape);
    this.drawClass.selection = this.shape;
    colorPicker.disabled = false;
    colorPicker.value = "#ff0000";
    contourLabel.disabled = false;
    contourLabel.placeholder = "Enter a label...";
    pauseButton.disabled = false;
    deleteButton.disabled = false;
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    drawClass.deSelect();
    drawClass.selection = this.shape;
    drawClass.removeSelectedShape();
    switchToSelect();
  }
}

/**
 * Drags a single point (selection handle) of a shape to the current
 * mouse position. If the dragged point is the shape's first or last
 * point, both are moved together (closed-shape seam).
 * @extends Command
 * @memberof Concrete Commands
 */

export class DragPointCommand extends Command {
  /**
   * @param {Shape} shape
   * @param {number} expectResize - Index of the point being dragged.
   * @param {{startPoints: Array<{x: number, y: number}>}} dragState - Object storing the starting shape points
   * @param {{x: number, y: number}} mouse - Current mouse position.
   */
  constructor(shape, expectResize, dragState, mouse) {
    super();
    this.shape = shape;
    this.dragState = dragState;
    this.expectResize = expectResize;
    this.mouse = mouse;
    /**
     * Stores whether this shape has been modified
     * @type {boolean}
     */
    this.modified_before = this.shape.getModified();
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.setModified(frameIdx, true);
    for (var i = frameIdx; i < numFrames; i++) {
      let selPoints = this.shape.getPoints(i);
      if (this.shape.getModified(i) && i > frameIdx) {
        break;
      }
      if (((this.expectResize == 0) || (this.expectResize == selPoints.length-1)) && this.shape.closed) {
        selPoints[0].x = this.mouse.x;
        selPoints[selPoints.length-1].x = this.mouse.x;
        selPoints[0].y = this.mouse.y;
        selPoints[selPoints.length-1].y = this.mouse.y;
      } else {
        selPoints[this.expectResize].x = this.mouse.x;
        selPoints[this.expectResize].y = this.mouse.y;
      }
    }
    if (this.shape.provisionalPoints.length > 0) {
      this.shape.resetProvisionalPoints();
    }
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.setModified(frameIdx, this.modified_before);
    for (var i = frameIdx; i < numFrames; i++) {
      let selPoints = this.shape.getPoints(this.frame);
      if (!this.shape.getModified(i) || i == frameIdx) {
        selPoints[this.expectResize].x = this.dragState.startPoints[this.expectResize].x;
        selPoints[this.expectResize].y = this.dragState.startPoints[this.expectResize].y;
      }
    }
    if (this.shape.provisionalPoints.length > 0) {
      this.shape.resetProvisionalPoints();
    }
  }
}

/**
 * Drags an entire shape by the offset between the current mouse position
 * and where the drag started. Marks the current frame modified so the
 * change doesn't get silently overwritten by forward-propagation from an
 * earlier unmodified frame.
 * @extends Command
 * @memberof Concrete Commands
 */

export class DragShapeCommand extends Command {
  /**
   * @param {Shape} shape - Shape to be dragged
   * @param {{startMouse: {x: number, y: number}, startPoints: Array<{x: number, y: number}>}} dragState - Object storing the starting mouse coordinates and shape points
   * @param {{x: number, y: number}} mouse - Current mouse position.
   */
  constructor(shape, dragState, mouse) {
    super();
    this.shape = shape;
    this.dragState = dragState;
    this.mouse = mouse;
    /**
     * Stores whether this shape has been modified
     * @type {boolean}
     */
    this.modified_before = this.shape.getModified(frameIdx);
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.setModified(frameIdx, true);
    for (var i = frameIdx; i < numFrames; i++) {
      let selPoints = this.shape.getPoints(i);
      if (this.shape.getModified(i) && i > frameIdx) {
        break;
      }
      for (var j = 0; j < selPoints.length; j++) {
        var p = selPoints[j];
        p.x = this.dragState.startPoints[j].x + (this.mouse.x - this.dragState.startMouse.x);
        p.y = this.dragState.startPoints[j].y + (this.mouse.y - this.dragState.startMouse.y);
      }
    }
    if (this.shape.provisionalPoints.length > 0) {
      this.shape.resetProvisionalPoints();
    }
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.setModified(frameIdx, this.modified_before);
    for (var i = frameIdx; i < numFrames; i++) {
      let selPoints = this.shape.getPoints(i);
      if (!this.shape.getModified(i) || i == frameIdx) {
        for (var j = 0; j < selPoints.length; j++) {
          var p = selPoints[j];
          p.x = this.dragState.startPoints[j].x;
          p.y = this.dragState.startPoints[j].y;
        }
      }
    }
    if (this.shape.provisionalPoints.length > 0) {
      this.shape.resetProvisionalPoints();
    }
  }
}

/**
 * Pauses a shape on the current frame, saving a deep copy of its
 * per-frame points beforehand so undo can fully restore them.
 * @extends Command
 * @memberof Concrete Commands
 */

export class FramePauseCommand extends Command {
  /** @param {Shape} shape - The shape to be paused */
  constructor(shape) {
    super();
    /**
     * The frame the shape was paused on
     * @type {number}
     */
    this.pause_frame = frameIdx;
    this.shape = shape;
    /**
     * Deep copy of the shape's per-frame points before pausing.
     * @type {Object<number, Array<{x: number, y: number}>>}
     */
    this.startPoints = Object.fromEntries(Object.entries(shape.frames).map(([key, frame]) => [key, frame.map(pt => ({ ...pt }))]));
  }

  execute() {
    if (this.pause_frame != frameIdx) {
      changeFrame(this.pause_frame);
    }
    this.shape.pause();
  }

  undo() {
    if (this.pause_frame != frameIdx) {
      changeFrame(this.pause_frame);
    }
    this.shape.unpause(Object.fromEntries(Object.entries(this.startPoints).map(([key, frame]) => [key,frame.map(pt => ({ ...pt }))])));
  }
}

/**
 * 
 * 
 * Inserts a point into a shape at a provisional-point location, then
 * resets provisional points so subsequent markers reflect the new layout.
 * @extends Command
 * @memberof Concrete Commands
 */

export class InsertPointCommand extends Command {
  /**
   * @param {Shape} shape - Shape for the point to be inserted into
   * @param {number} insIdx - Index where the point will be inserted; see {@link Shape#insertPoint|Shape.insertPoint()}.
   */
  constructor(shape, insIdx, provisionalPoint) {
    super();
    this.shape = shape;
    this.insIdx = insIdx;
    this.provisionalPoint = provisionalPoint;
    /**
     * Saves the frame the shape was created on in case it needs to be undone/redone.
     * @type {number}
     */
    this.frame = frameIdx;
  }

  execute() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.insertPoint(this.insIdx, this.provisionalPoint);
    this.shape.resetProvisionalPoints();
  }

  undo() {
    if (this.frame != frameIdx) {
      changeFrame(this.frame);
    }
    this.shape.deletePoint(this.insIdx);
    this.shape.resetProvisionalPoints();
  }
}

/**
 * Changes a shape's label, syncing the contour label input if the shape
 * is currently selected.
 * @extends Command
 * @memberof Concrete Commands
 */

export class LabelChangeCommand extends Command {
  /**
   * @param {Shape} shape
   * @param {string} newLabel
   */
  constructor(shape, newLabel) {
    super();
    this.shape = shape;
    if (shape.label) {
      /**
       * The shape's label before it was changed.
       * @type {string}
       */
      this.oldLabel = shape.label;
    } else {
      this.oldLabel = "";
    }
    this.newLabel = newLabel;
  }

  execute() {
    this.shape.label = this.newLabel;
    if (drawClass.selection) {
      contourLabel.value = drawClass.selection.label;
    }
  }

  undo() {
    this.shape.label = this.oldLabel;
    if (drawClass.selection) {
      contourLabel.value = drawClass.selection.label;
    }
  }
}