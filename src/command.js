/**
 * Interface for any user action on the canvas that should support
 * undo/redo. Any new action ("concrete command") must extend this class
 * and implement {@link Command#execute|Command.execute()} and {@link Command#undo|Command.undo()}.
 * 
 * Note that {@link Command#execute|execute()} doubles as the redo path — there is no separate
 * redo method. The app state at original-execution time may not match
 * the state at redo time (e.g. the user has since changed frames), so
 * {@link Command#execute|execute()} implementations must restore relevant context (frame,
 * selection) themselves rather than assume it.
 * @abstract
 */
export default class Command {
  /** Executes (or redoes) the command. Must be implemented by subclasses. */
  execute() {
    throw new Error('execute() method must be implemented');
  }

  /** Undoes the command. Must be implemented by subclasses. */
  undo() {
    throw new Error('undo() method must be implemented');
  }
}