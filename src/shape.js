import getSelBoxSize from './getSelBoxSize.js'
import { numFrames, frameIdx, drawClass, viewport } from './main.js'

/**
 * Whether the currently selected shape is showing transparent "provisional" midpoint markers for point insertion.
 * @type {boolean} @global
 */
let editingPoints = false;

/**
 * A single user-drawn annotation (contour). A shape's points are stored
 * *per frame*, not as one static geometry — features move/change across
 * frames. The `_modified` flag per frame ensures edits on one frame don't
 * silently overwrite frames the user hasn't touched, while unmodified
 * future frames continue to inherit changes forward (see
 * {@link DragShapeCommand}/{@link DragPointCommand}).
 */
export default class Shape {
  /**
   * @param {Array<{x: number, y: number}>} first_point - Initial point(s) the shape starts with.
   * @param {boolean} closed - Whether the shape is a closed polygon (true) or open contour (false).
   * @param {string} color - CSS color string for the shape's stroke.
   * @param {string} label - User's label for the shape.
   */
  constructor(first_point, closed, color, label) {
    this._closed = closed;
    this._color = color;
    this._label = label;
    /**
     * Map of frame index -> array of points on that frame.
     * @type {Object<number, Array<{x: number, y: number}>>}
     */
    this._frames = {};
    /**
     * Map of frame index -> whether the shape was explicitly modified on that frame.
     * @type {Object<number, boolean>}
     */
    this._modified = {};
    /**
     * Transparent midpoint markers shown when editing points; see {@link Shape#setUpProvisionalPoints|Shape.setUpProvisionalPoints}.
     * @type {Array<{x: number, y: number}>}
     */
    this._provisionalPoints = [];
    for (var i = frameIdx; i < numFrames; i++) {
      this._frames[i] = first_point.map(p => ({x: p.x, y: p.y}));
    }
  }

  get closed() {
    return this._closed;
  }
  set closed(val) {
    this._closed = val;
  }

  get color() {
    return this._color;
  }
  set color(val) {
    this._color = val;
  }

  get label() {
    return this._label;
  }
  set label(val) {
    this._label = val;
  }

  get frames() {
    return this._frames;
  }

  get provisionalPoints() {
    return this._provisionalPoints;
  }

  /**
   * Adds a point to the shape on the current and all future frames.
   * @param {number} x - x coordinate with 0 being the left edge of the canvas
   * @param {number} y - y coordinate with 0 being the top edge of the canvas
   */
  addPoint(x, y) {
    for (var i = frameIdx; i < numFrames; i++) {
      this._frames[i].push({x: x, y: y});
    }
  }

  /**
   * Inserts a point — taken from the cached provisional point at the given
   * point-array index — into the shape's point array, on the current and
   * all future frames.
   * 
   * @param {number} insertIndex - Point-array index where the new point should be inserted.
   */
  insertPoint(insertIndex, provisionalPoint) {
    if (!this._provisionalPoints || insertIndex === undefined || insertIndex === null || insertIndex < 0 || !provisionalPoint) {
      return;
    }

    const pointToInsert = {
      x: provisionalPoint.x,
      y: provisionalPoint.y
    };

    for (var i = frameIdx; i < numFrames; i++) {
      if (!this._frames[i] || (this._modified[i] && i > frameIdx)) {
        break;
      }

      const nextFramePoints = this._frames[i].slice();
      nextFramePoints.splice(Math.min(insertIndex, nextFramePoints.length), 0, pointToInsert);
      this._frames[i] = nextFramePoints;
    }
  }

  /**
   * Whether the shape was explicitly modified on the given `frame`.
   * @param {number} frame
   * @returns {boolean} 
   */
  getModified(frame) {
    return this._modified[frame];
  }

  /**
   * Deletes the point at `idx` from the current and all future frames.
   * @param {number} idx - Index of the point in the shape as it is in the current frame.
   */
  deletePoint(idx) {
    for (var i = frameIdx; i < numFrames; i++) {
      this._frames[i].splice(idx, 1);
    }
  }

  /** Deletes the last point of the shape from the current and all future frames. */
  deleteLastPoint() {
    for (var i = frameIdx; i < numFrames; i++) {
      this._frames[i].pop();
    }
  }

  /**
   * The shape's points on the given frame.
   * @param {number} frame
   * @returns {Array<{x: number, y: number}>|undefined} 
   */
  getPoints(frame) {
    return this._frames[frame];
  }

  /**
   * Sets whether the shape was explicitly modified on the given frame.
   * @param {number} frame - Frame where the modified condition is being set
   * @param {boolean} condition – Boolean modified condition to be set (true or false)
   */
  setModified(frame, condition) {
    this._modified[frame] = condition;
  }

  /**
   * Computes transparent midpoint markers ("provisional points") for
   * each segment of the shape on the current frame that's longer than
   * 18px, so the user has a clickable target to insert a new point into
   * that segment. Skips if provisional points are already active
   * (`editingPoints` is true) — call {@link Shape#resetProvisionalPoints|Shape.resetProvisionalPoints()}
   * to force a recompute instead.
   */
  setUpProvisionalPoints() {
    if (!editingPoints) {
      var lengthSubtract;
      editingPoints = true;
      if (!this._closed) {
        lengthSubtract = 1;
      } else {
        lengthSubtract = 0;
      }
      for (var i = 0; i < this._frames[frameIdx].length-lengthSubtract; i++) {
        var p1 = this._frames[frameIdx][i];
        var p2 = this._frames[frameIdx][(i+1)%(this._frames[frameIdx].length)];
        if (Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2) > 18) {
          this._provisionalPoints.push({
            x: ((p1.x + p2.x) / 2),
            y: ((p1.y + p2.y) / 2),
            insertIndex: i + 1
          });
        }
      }
    }
  }

  /** Clears provisional points and exits point-editing mode. */
  deactivateProvisionalPoints() {
    this._provisionalPoints = [];
    editingPoints = false;
  }

  /**
   * Fully recomputes provisional points from the shape's current point
   * layout. This should be called after any change to the shape's points (insert,
   * delete, drag) so the provisional points are always current.
   */
  resetProvisionalPoints() {
    this.deactivateProvisionalPoints();
    this.setUpProvisionalPoints();
  }

  /**
   * Draws the shape's outline for `frameIndex` onto `ctx`, plus
   * selection handles and/or provisional point markers if this shape is
   * selected. Does nothing if the shape doesn't exist (is paused) on
   * `frameIndex`.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} frameIndex
   */
  draw(ctx, frameIndex) {
    if (this._frames[frameIndex] === undefined || this._frames[frameIndex] === null) return; // If this shape doesn't exist in the current frame, don't draw it
    let mySelBoxSize = getSelBoxSize();
    let half = mySelBoxSize / 2;

    ctx.beginPath();
    ctx.moveTo(this._frames[frameIndex][0].x, this._frames[frameIndex][0].y);
    for (var i = 1; i < this._frames[frameIndex].length; i++) {
      ctx.lineTo(this._frames[frameIndex][i].x, this._frames[frameIndex][i].y);
    }
    if (this._closed) ctx.closePath();
    
    ctx.strokeStyle = this._color;
    ctx.lineWidth = 4 / (viewport.baseScale * viewport.userZoom);
    ctx.stroke();

    // console.log(drawClass.selection, this)

    if (drawClass.selection === this && editingPoints === true) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1 / (viewport.baseScale * viewport.userZoom);
      for (var i = 0; i < this._provisionalPoints.length; i++) {
        var p = this._provisionalPoints[i];
        ctx.fillRect(p.x - half, p.y - half, mySelBoxSize, mySelBoxSize);
        ctx.strokeRect(p.x - half, p.y - half, mySelBoxSize, mySelBoxSize);
      }
    }

    if (drawClass.selection === this && frameIndex === frameIdx) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1 / (viewport.baseScale * viewport.userZoom);
      // draw selection boxes
      for (var i = 0; i < this._frames[frameIndex].length; i++) {
        var p = this._frames[frameIndex][i];
        ctx.fillRect(p.x - half, p.y - half, mySelBoxSize, mySelBoxSize);
        ctx.strokeRect(p.x - half, p.y - half, mySelBoxSize, mySelBoxSize);
      }
    }
  }

  /**
   * Computes the shortest distance from the mouse cursor position (px, py) to the line
   * segment from a to b.
   * @param {number} px - Mouse cursor x
   * @param {number} py - Mouse cursor y
   * @param {{x: number, y: number}} a - First point of line segment
   * @param {{x: number, y: number}} b - Second point of line segment
   * @returns {number}
   */
  distToSegment(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((px - a.x)*dx + (py - a.y)*dy) / (dx*dx + dy*dy)));
    return Math.hypot(px - (a.x + t*dx), py - (a.y + t*dy));
  }

  /**
   * Tests whether (mx, my) is within `tolerance` px of any segment of
   * the shape on the current frame.
   * @param {number} mx - Mouse cursor x
   * @param {number} my - Mouse cursor y
   * @param {number} [tolerance=6] - Tolerance of hit test in px
   * @returns {boolean}
   */
  hitTest(mx, my, tolerance = (6 / (viewport.baseScale * viewport.userZoom))) {
    const pts = this._frames[frameIdx];
    if (!pts) return false;
    if (pts.length < 2) return false;

    // number of segments depends on whether the shape is closed
    const segCount = this.closed ? pts.length : pts.length - 1;

    for (let i = 0; i < segCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length]; // % wraps the last point back to first when closed
      if (this.distToSegment(mx, my, a, b) < tolerance) return true;
    }
    return false;
  }

  /**
   * Pauses the shape: sets its points to null on the current and all
   * future frames (so it stops being drawn/exported on those frames),
   * deselects it, and redraws.
   */
  pause() {
    for (var i = frameIdx; i < numFrames; i++) {
      this._frames[i] = null;
    }
    drawClass.deSelect();
    drawClass.draw(frameIdx);
  }

  /**
   * Reverses {@link Shape#pause|Shape.pause()} by restoring the shape's per-frame
   * points and re-selecting it.
   * @param {Object<number, Array<{x: number, y: number}>>} startPoints - Per-frame points to restore, as captured before pausing.
   */
  unpause(startPoints) { /* TODO: Unpause button, rather than just undo/redo */
    this._frames = startPoints;
    drawClass._selection = this;
    drawClass.draw(frameIdx);
  }
}