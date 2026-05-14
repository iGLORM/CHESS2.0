class InputManager {
  constructor() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClicked = false;

    this._onKeyDown = (e) => {
      this.keys[e.key] = true;
    };
    this._onKeyUp = (e) => {
      this.keys[e.key] = false;
    };
    this._onMouseMove = (e) => {
      const canvas = document.getElementById('gameCanvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
  }

  isKeyDown(key) {
    return !!this.keys[key];
  }

  getMousePos() {
    return { x: this.mouseX, y: this.mouseY };
  }

  wasMouseClicked() {
    const val = this.mouseClicked;
    this.mouseClicked = false;
    return val;
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
  }
}

const inputManager = new InputManager();
