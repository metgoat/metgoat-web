/**
 * Bundles a sequence of {@link Commands} so they execute/undo as a single
 * unit. Used for actions that are one fluid user gesture (e.g. dragging a
 * shape) but internally register as multiple commands, so they undo
 * together rather than one-by-one. 
 * @see {@link HistoryManager#beginCommandGroup|HistoryManager.beginCommandGroup()}
 */
export default class CommandGroup {
  constructor() {
    /**
     * Commands belonging to this group, in execution order.
     * @type {Command[]}
     */
    this.commands = [];
  }

  /**
   * Adds a command to this group.
   * @param {Command} command
   */
  addCommand(command) {
    this.commands.push(command);
  }

  /** Executes every command in the group, in order. */
  execute() {
    this.commands.forEach(command => command.execute());
  }

  /** Undoes every command in the group, in reverse order. */
  undo() {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) { 
      this.commands[i].undo();
    }
  }
}