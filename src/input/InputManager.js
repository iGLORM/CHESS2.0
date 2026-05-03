class InputManager {
  constructor() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseClicked = false;

    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
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
}

const inputManager = new InputManager();
