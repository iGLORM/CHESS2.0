class Animator {
  constructor(boardRenderer) {
    this.boardRenderer = boardRenderer;
    this.queue = [];
    this.running = false;
  }

  enqueueMove(from, to, piece, callback) {
    this.queue.push({ from, to, piece, callback });
    if (!this.running) this.processNext();
  }

  processNext() {
    if (this.queue.length === 0) {
      this.running = false;
      return;
    }
    this.running = true;
    const { from, to, piece, callback } = this.queue.shift();
    this.boardRenderer.animateMove(from.row, from.col, to.row, to.col, piece, () => {
      if (callback) callback();
      this.processNext();
    });
  }

  clear() {
    this.queue = [];
    this.running = false;
    this.boardRenderer.clearAnimations();
  }
}
