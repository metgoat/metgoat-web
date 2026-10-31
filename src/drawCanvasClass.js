/**
 * Controls the drawing canvas: shape storage, selection, mouse/touch
 * event handling, and dispatching user actions as {@link Command}s for
 * undo/redo. This is the heart of the app's interactivity.
 *
 * Properties prefixed `this._` are intended to be read/written from
 * outside the class via the `get`/`set` accessors below; unprefixed
 * properties are for internal use within the class only.
 */

import { viewport, numFrames, frameIdx, currentTool, setViewportOffset, setViewportUserZoom, shapeOpacity, overlayOpacity } from "./main.js"
import HistoryManager from "./historyManager.js"
import Command from './command.js'
import changeFrame from './changeFrame.js'
import drawRequestedFrame from "./drawRequestedFrame.js"
import getSelBoxSize from './getSelBoxSize.js'
import { CreateShapeCommand, AddPointCommand, CloseShapeCommand, DragPointCommand, InsertPointCommand, DragShapeCommand, ColorChangeCommand, LabelChangeCommand, FramePauseCommand, ContourDeleteCommand } from './concreteCommands.js'

const drawCanvas = document.querySelector("#drawCanvas");
const drawCtx = drawCanvas.getContext('2d');
const canvasContainer = document.querySelector("#canvasContainer");
const colorPicker = document.querySelector("#contourColor");
const contourLabel = document.querySelector("#contourLabel");
const pauseButton = document.querySelector("#endContour");
const deleteButton = document.querySelector("#deleteContour");
const shapeOverlayCheckbox = document.querySelector("#shapeOverlayCheckbox");

export default class DrawCanvasClass {
  constructor() {
    // Mouse offset variables — used by getPos() to translate page-relative
    // mouse coordinates into canvas-relative coordinates.
    this.styleBorderTop = 0;
    this.styleBorderLeft = 0;
    if (window.getComputedStyle) {
      this.styleBorderTop = parseInt(getComputedStyle(drawCanvas, null).getPropertyValue('border-top-width'));
      this.styleBorderLeft = parseInt(getComputedStyle(drawCanvas, null).getPropertyValue('border-left-width')); /* TODO: Save scale factor */
    }
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // Shape objects
    /**
     * All shapes currently in this session.
     * @type {Shape[]}
     */
    this._shapes = [];
    /**
     * The currently selected shape, or null if none.
     * @type {Shape|null}
     */
    this._selection = null;

    // State tracking
    /**
     * Info about an in-progress drag, or null if the user isn't dragging.
     * 
     * The parameter `mode: 'body'` is in effect when the user is dragging the whole shape.
     * 
     * The parameter `mode: 'point'` is in effect when the user is dragging a single selection handle.
     * @type {{mode: 'body'|'point', startMouse: {x: number, y: number}, startPoints: Array<{x: number, y: number}>}|null}
     */
    this.dragState = null;
    /**
     * Index of the selection handle the cursor is hovering over, -1 if none.
     * @type {number}
     */
    this.expectResize = -1;
    /**
     * Index of the selected shape's provisional points that the cursor is hovering over, or -1 if none.
     * @type {number}
     */
    this.expectInsert = -1;

    // History manager
    /** @type {HistoryManager} */
    this._historyManager = new HistoryManager();

    this.isPanning = false;
    this.lastPanX = 0;
    this.lastPanY = 0;
  }

  get selection() {
    return this._selection;
  }

  set selection(val) {
    this._selection = val;
  }

  get shapes() {
    return this._shapes;
  }

  get historyManager() {
    return this._historyManager;
  }

  /** Clears the drawing canvas. */
  clear() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }

  /**
   * Redraws all shapes for the given frame. If "overlay last" is
   * checked, also draws the previous frame's shapes at 50% opacity as a
   * reference ghost.
   * @param {number} frame
   */
  draw(frame) {
    this.clear();
    drawCtx.save();
    drawCtx.translate(viewport.offsetX, viewport.offsetY);
    drawCtx.scale(viewport.baseScale * viewport.userZoom, viewport.baseScale * viewport.userZoom);
    // draw all shapes
    if (shapeOverlayCheckbox.checked) {
      var l = this._shapes.length;
      for (var i = 0; i < l; i++) {
        drawCtx.globalAlpha = shapeOpacity;
        this._shapes[i].draw(drawCtx, frame);
      }
    }

    if (overlayLastCheckbox.checked) {
      if (frameIdx > 0) {
        var l = this._shapes.length;
        for (var i = 0; i < l; i++) {
          drawCtx.globalAlpha = overlayOpacity;
          this._shapes[i].draw(drawCtx, frame - 1);
        }
      }
    }
    drawCtx.restore();
  }

  /**
   * Translates a mouse/touch event's page coordinates into coordinates
   * relative to the drawing canvas's top-left corner.
   * @param {MouseEvent|Touch} e
   * @returns {{x: number, y: number}}
   */
  getPos(e) {
    const rect = drawCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.pageX ?? rect.left;
    const clientY = e.clientY ?? e.pageY ?? rect.top;

    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const nativeX = (mx - viewport.offsetX) / (viewport.baseScale * viewport.userZoom);
    const nativeY = (my - viewport.offsetY) / (viewport.baseScale * viewport.userZoom);

    return {x: nativeX, y: nativeY};
  }

  /**
   * Handles mousedown/touchstart on the canvas. Behavior depends on
   * {@link currentTool}:
   * - Select tool (0): begins a point-drag or shape-drag if the cursor is
   *   over a handle/shape, inserts a point if hovering a provisional
   *   marker, or selects/deselects a shape under the cursor.
   * - Pen tool (1): starts a new shape if none is selected, otherwise
   *   adds a point to the selected shape (closing it if clicking near its
   *   first point).
   * @param {MouseEvent|Touch} e
   */
  doDown(e) {
    var pos = this.getPos(e);
    var mx = pos.x;
    var my = pos.y;
    if (currentTool === 0) {
      if (this.expectResize !== -1) {
        let selPoints = this._selection.getPoints(frameIdx);
        this.dragState = {
          mode: 'point',
          startPoints: selPoints.map(p => ({x: p.x, y: p.y}))
        };
        this._historyManager.beginCommandGroup();
        canvasContainer.style.cursor = 'grabbing';
        return;
      }

      if (this.expectInsert !== -1) {
        const provisionalPoint = this._selection.provisionalPoints.find((point) => point.insertIndex === this.expectInsert);
        if (provisionalPoint) {
          this._historyManager.executeCommand(new InsertPointCommand(this._selection, this.expectInsert, provisionalPoint));
        }
        this.expectInsert = -1;
        this.draw(frameIdx);
        return;
      }
    
      // run through all the objects
      var l = this.shapes.length;
      for (var i = l-1; i >= 0; i--) {
        // if the mouse pixel exists, select and break
        let selPoints = this.shapes[i].getPoints(frameIdx);
        if (this.shapes[i].hitTest(mx, my) > 0) {
          this.deSelect();
          this._selection = this.shapes[i];
          colorPicker.disabled = false;
          colorPicker.value = this._selection.color;
          contourLabel.disabled = false;
          contourLabel.placeholder = "";
          contourLabel.value = this._selection.label;
          pauseButton.disabled = false;
          deleteButton.disabled = false;
          this.dragState = {
            mode: 'body',
            startMouse: {x: mx, y: my},
            startPoints: selPoints.map(p => ({x: p.x, y: p.y}))
          };
          this._historyManager.beginCommandGroup();
          this.draw(frameIdx);
          return;
        }
      }
      
      // havent returned means we have selected nothing
      this.deSelect();
      const rect = drawCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.isPanning = true;
      this.lastPanX = mouseX;
      this.lastPanY = mouseY;
      canvasContainer.style.cursor = 'grabbing';
      // Draw again because we might need the selection boxes to disappear
      this.draw(frameIdx);
    } else if (currentTool === 1) {
      if (this._selection == null) {
        const command = new CreateShapeCommand(this, mx, my);
        this._historyManager.executeCommand(command);
      } else {
        let selPoints = this._selection.getPoints(frameIdx);
        // If the user clicks near the starting point, close the shape and return to select mode
        if (mx > (selPoints[0].x - (5 / (viewport.baseScale * viewport.userZoom))) && mx < (selPoints[0].x + (5 / (viewport.baseScale * viewport.userZoom))) && my > (selPoints[0].y - (5 / (viewport.baseScale * viewport.userZoom))) && my < (selPoints[0].y + (5 / (viewport.baseScale * viewport.userZoom)))) {
          this._historyManager.beginCommandGroup();
          this._historyManager.executeCommand(new AddPointCommand(this._selection, selPoints[0].x, selPoints[0].y));
          this._historyManager.executeCommand(new CloseShapeCommand(this._selection));
          this._historyManager.endCommandGroup();
        } else {
          this._historyManager.executeCommand(new AddPointCommand(this._selection, mx, my));
        }
      }
      this.draw(frameIdx);
    }
  }

  /**
   * Handles mousemove/touchmove on the canvas. If a drag is in progress,
   * calls the corresponding drag command. Otherwise, with the
   * select tool active and a shape selected, updates
   * {@link DrawCanvasClass#expectResize|DrawCanvasClass.expectResize}/
   * {@link DrawCanvasClass#expectInsert|DrawCanvasClass.expectInsert}
   * and the cursor style based on what the cursor is currently hovering
   * (a selection handle, a provisional point, the shape body, or nothing).
   * @param {MouseEvent|Touch} e
   */
  doMove(e) {
    var mouse = this.getPos(e);
    // If we're dragging a shape, move it by the amount the mouse has moved since the mouse originally clicked
    if (this.dragState && this.dragState.mode === 'body' && this._selection) {
      this._historyManager.executeCommand(new DragShapeCommand(this._selection, this.dragState, mouse));
      this.draw(frameIdx);
    // If we're dragging the point of a shape, move just that point to the mouse location
    } else if (this.dragState && this.dragState.mode === 'point' && this._selection) {
      this._historyManager.executeCommand(new DragPointCommand(this._selection, this.expectResize, this.dragState, mouse))
      this.draw(frameIdx);
    }
    
    if ((!this.dragState) && currentTool === 0) {
      if (this._selection !== null) {
        let selPoints = this._selection.getPoints(frameIdx);
        let provPoints = this._selection.provisionalPoints;
        let half = getSelBoxSize() / 2;
        for (var i = 0; i < selPoints.length; i++) {
          var cur = selPoints[i];
          if ((mouse.x >= (cur.x - half)) && (mouse.x <= (cur.x + half)) && 
              (mouse.y >= (cur.y - half)) && (mouse.y <= (cur.y + half))) {
            // we found one!
            this.expectResize = i;
            this.expectInsert = -1;
            canvasContainer.style.cursor = 'pointer';
            return;
          }
        }

        for (var i = 0; i < provPoints.length; i++) {
          var cur = provPoints[i];
          if ((mouse.x >= (cur.x - half)) && (mouse.x <= (cur.x + half)) && 
              (mouse.y >= (cur.y - half)) && (mouse.y <= (cur.y + half))) {
            // we found one!
            this.expectResize = -1;
            this.expectInsert = cur.insertIndex;
            canvasContainer.style.cursor = 'pointer';
            return;
          }
        }

        if (this._selection.hitTest(mouse.x, mouse.y) > 0) {
          this.expectResize = -1;
          this.expectInsert = -1;
          canvasContainer.style.cursor = 'all-scroll';
          return;
        }

        // not over a selection box, return to normal
        this.dragState = null;
        this.expectResize = -1;
        this.expectInsert = -1;
      }

      for (var i = 0; i < this.shapes.length; i++) {
        if (this.shapes[i].hitTest(mouse.x, mouse.y) > 0) {
          canvasContainer.style.cursor = 'pointer';
          return;
        }
      }

      if (this.isPanning) {
        const rect = drawCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        viewport.offsetX += (mouseX - this.lastPanX);
        viewport.offsetY += (mouseY - this.lastPanY);
        this.lastPanX = mouseX;
        this.lastPanY = mouseY;
        drawRequestedFrame();
        return;
      }

      canvasContainer.style.cursor='default';
    }
  }

  /**
   * Handles mouseup/touchend on the canvas: ends any in-progress drag
   * and command group.
   * @param {MouseEvent|Touch} e
   */
  doUp(e) {
    this.dragState = null;
    this.expectResize = -1;
    this.expectInsert = -1;
    if (canvasContainer.style.cursor === 'grabbing') { 
      canvasContainer.style.cursor = 'grab';
    }
    if (this._historyManager.groupingActive) {
      this._historyManager.endCommandGroup();
    }
    if (this.isPanning) {
      this.isPanning = false;
      canvasContainer.style.cursor = 'default';
    }
  }

  /**
   * Handles double-click on the canvas. If the select tool is active and
   * the double-click lands on the selected shape, shows transparent
   * provisional midpoint markers (via {@link Shape#setUpProvisionalPoints|Shape.setUpProvisionalPoints()})
   * so the user can click one to insert a new point there.
   * @param {MouseEvent} e
   */
  doDoubleClick(e) {
    var pos = this.getPos(e);
    var mx = pos.x;
    var my = pos.y;
    if (currentTool === 0) {
      if (this._selection.hitTest(mx, my) > 0) {
        this._selection.setUpProvisionalPoints();
        this.draw(frameIdx);
      }
    }
  }

  doWheel(e) {
    e.preventDefault();
    if (currentTool === 0) {
      const rect = drawCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const oldEffectiveScale = viewport.baseScale * viewport.userZoom;

      // native point currently under the cursor, BEFORE zoom changes
      const nativeX = (mouseX - viewport.offsetX) / oldEffectiveScale;
      const nativeY = (mouseY - viewport.offsetY) / oldEffectiveScale;

      // update zoom (clamp to sane bounds)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // scroll down = zoom out, up = zoom in
      setViewportUserZoom(viewport.userZoom * zoomFactor);

      const newEffectiveScale = viewport.baseScale * viewport.userZoom;

      // solve offset so the SAME native point still lands at (canvasX, canvasY)
      setViewportOffset((mouseX - nativeX * newEffectiveScale), (mouseY - nativeY * newEffectiveScale));

      drawRequestedFrame();
    }
  }

  /**
   * Adds a shape to the {@link DrawCanvasClass}.
   * @param {Shape} shape
   */
  addShape(shape) {
    this.shapes.push(shape);
  }

  /** Removes the currently selected shape from the session, if any, and deselects. */
  removeSelectedShape() {
    if (this._selection) {
      const index = this.shapes.indexOf(this._selection);
      if (index > -1) {
        this.shapes.splice(index, 1);
        this.deSelect();
      }
    }
  }

  /**
   * Clears the current selection and resets the contour-editor UI
   * (color picker, label field, pause/delete buttons) to their
   * no-selection state. Deactivates any provisional points on the
   * previously selected shape.
   */
  deSelect() {
    if (this._selection) {
      this._selection.deactivateProvisionalPoints();
    }
    this._selection = null;
    
    colorPicker.value = "#ff0000";
    colorPicker.disabled = true;
    contourLabel.disabled = true;
    contourLabel.placeholder = "";
    contourLabel.value = "No contour selected";
    pauseButton.disabled = true;
    deleteButton.disabled = true;
    this.draw(frameIdx);
  }

  /**
   * Applies a color change to the selected shape via a
   * {@link ColorChangeCommand}, if a shape is selected.
   * @param {Event} e - Change event from the color picker input.
   */
  changeSelectedShapeColor(e) {
    if (this._selection) {
      this._historyManager.executeCommand(new ColorChangeCommand(this._selection, e.target.value));
    }
    this.draw(frameIdx);
  }

  /**
   * Applies a label change to the selected shape via a
   * {@link LabelChangeCommand}, if a shape is selected.
   * @param {Event} event - Change event from the label input.
   */
  changeSelectedShapeLabel(event) {
    if (this._selection) {
      this._historyManager.executeCommand(new LabelChangeCommand(this._selection, event.target.value));
    }
  }

  /** Pauses the selected shape (via {@link FramePauseCommand}), if any. */
  pauseSelectedShape() {
    if (this._selection) {
      this._historyManager.executeCommand(new FramePauseCommand(this._selection));
    }
  }

  /** Deletes the selected shape (via {@link ContourDeleteCommand}), if any. */
  deleteSelectedShape() {
    if (this.selection) {
      this._historyManager.executeCommand(new ContourDeleteCommand(this, this._selection));
    }
    this.draw(frameIdx);
  }

  /**
   * Returns the largest number of points any single shape has on any
   * single frame, across all shapes. Used to size the coordinate columns
   * of the exported CSV header.
   * @returns {number}
   */
  getMaxNumPoints() {
    let max = 0;
    for (var i = 0; i < this.shapes.length; i++) {
      for (var j = 0; j < numFrames; j++) {
        if (this.shapes[i].frames[j]) {
          if (this.shapes[i].frames[j].length > max) {
            max = this.shapes[i].frames[j].length
          }
        }
      }
    }
    return max;
  }
}