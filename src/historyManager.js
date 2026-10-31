import CommandGroup from './commandGroup.js'
import { drawClass, frameIdx, undo, redo } from './main.js'

/**
 * Stores the history of executed {@link Command}/{@link CommandGroup}
 * objects for undo/redo, and manages grouping consecutive commands that
 * belong to one user gesture.
 */
export default class HistoryManager {
  constructor() {
    /**
     * Commands executed, oldest first.
     * @type {Array<Command|CommandGroup>}
     */
    this.history = [];
    /**
     * Stack that keeps undone commands, ready to redo.
     * @type {Array<Command|CommandGroup>}
     */
    this.redoStack = [];
    /**
     * Maximum number of history entries kept before the oldest is dropped.
     * @type {number} @constant
     * @default 100
     */
    this.maxHistorySize = 100; /* TODO: See what the greatest size without crashing the program could be */
    /**
     * Whether commands are currently being collected into {@link HistoryManager#currentCommandGroup|HistoryManager.currentCommandGroup} instead of pushed to history individually.
     * @type {boolean}
     */
    this.groupingActive = false;
    /**
     * The command group currently being built, if grouping is active.
     * @type {CommandGroup|null}
     */
    this.currentCommandGroup = null;
  }

  /**
   * Executes a command immediately. If a command group is active, the
   * command is added to that group instead of being pushed to history on
   * its own; otherwise it's pushed to {@link HistoryManager#history|HistoryManager.history} directly and the redo stack is cleared.
   * @param {Command} command Command to be executed
   */
  executeCommand(command) {
    command.execute();

    if (this.groupingActive && this.currentCommandGroup) {
      this.currentCommandGroup.addCommand(command);
    } else {
      // Clear redo stack when a new command is executed
      this.redoStack = [];

      // Add to history, maintaining max size
      this.history.push(command);

      if (this.history.length > this.maxHistorySize) {
        this.history.shift(); // Remove oldest command
      }
    }
    if (undo.disabled) {
      undo.disabled = false;
    }
  }

  /**
   * Begins collecting subsequent {@link HistoryManager#executeCommand|HistoryManager.executeCommand}
   * calls into a single {@link CommandGroup} rather than separate history
   * entries. Call when a continuous user gesture (drag, multi-step
   * action) begins, and then ends with {@link HistoryManager#endCommandGroup|HistoryManager.endCommandGroup}.
   */
  beginCommandGroup() { /* TODO: Abstract command group into beginning and end points for drag actions */
    this.groupingActive = true;
    this.currentCommandGroup = new CommandGroup();
  }

  /**
   * Ends the current command group (started via
   * {@link HistoryManager#beginCommandGroup|HistoryManager.beginCommandGroup}) and pushes it to history as
   * a single undoable unit, if it contains at least one command.
   */
  endCommandGroup() {
    if (this.groupingActive && this.currentCommandGroup) {
      if (this.currentCommandGroup.commands.length > 0) {
        this.redoStack = [];
        this.history.push(this.currentCommandGroup);
        if (this.history.length > this.maxHistorySize) {
          this.history.shift();
        }
      }
      this.groupingActive = false;
      this.currentCommandGroup = null;
    }
  }

  /** Undoes the most recent command/group in history, moving it to the redo stack and redraws the current frame. */
  undo() {
    if (this.history.length > 0) {
      const command = this.history.pop();
      command.undo();
      drawClass.draw(frameIdx);
      this.redoStack.push(command);
    }
    if (redo.disabled) {
      redo.disabled = false;
    }
    if (this.history.length == 0) {
      undo.disabled = true;
    }
    console.log("History ", this.history);
    console.log("Redo stack ", this.redoStack);
  }

  /** Re-executes the most recently undone command/group, moving it back to history and redraws the current frame. */
  redo() {
    if (this.redoStack.length > 0) {
      const command = this.redoStack.pop();
      command.execute();
      drawClass.draw(frameIdx);
      this.history.push(command);
    }
    if (undo.disabled) {
      undo.disabled = false;
    }
    if (this.redoStack.length == 0) {
      redo.disabled = true;
    }
    console.log("History ", this.history);
    console.log("Redo stack ", this.redoStack);
  }
}