/**
 * InputManager - Handles keyboard inputs, mouse movements and Pointer Lock.
 */

export class InputManager {
  constructor(domElement) {
    this.domElement = domElement || document.body;
    this.keys = {};
    this.justPressed = {};
    this.mouseButtons = {};
    this.mouseJustPressed = {};
    
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.isPointerLocked = false;
    this.sensitivity = 0.0022;

    this.onLockChangeCallbacks = [];
    this.onKeyPressCallbacks = {};

    this.setupListeners();
  }

  setupListeners() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keys[code]) {
        this.justPressed[code] = true;
        if (this.onKeyPressCallbacks[code]) {
          this.onKeyPressCallbacks[code].forEach(cb => cb(e));
        }
      }
      this.keys[code] = true;

      // Prevent default browser scrolling on Space and tab navigation
      if (['Space', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse button listeners
    window.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;
      if (!this.mouseButtons[e.button]) {
        this.mouseJustPressed[e.button] = true;
      }
      this.mouseButtons[e.button] = true;
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });

    // Mouse move
    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    });

    // Pointer Lock change
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
      this.onLockChangeCallbacks.forEach(cb => cb(this.isPointerLocked));
    });

    // Request pointer lock on click if not locked and not clicking UI
    this.domElement.addEventListener('click', (e) => {
      if (!this.isPointerLocked && !e.target.closest('.ui-interactive')) {
        this.requestLock();
      }
    });
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  exitLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  onLockChange(callback) {
    this.onLockChangeCallbacks.push(callback);
  }

  onKeyPress(code, callback) {
    if (!this.onKeyPressCallbacks[code]) {
      this.onKeyPressCallbacks[code] = [];
    }
    this.onKeyPressCallbacks[code].push(callback);
  }

  isKeyDown(code) {
    return !!this.keys[code];
  }

  wasKeyJustPressed(code) {
    return !!this.justPressed[code];
  }

  isMouseDown(button = 0) {
    return !!this.mouseButtons[button];
  }

  wasMouseJustPressed(button = 0) {
    return !!this.mouseJustPressed[button];
  }

  getMovementVector() {
    let forward = 0;
    let right = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;

    return { forward, right };
  }

  getLookDelta() {
    const delta = {
      x: this.mouseDeltaX * this.sensitivity,
      y: this.mouseDeltaY * this.sensitivity
    };
    return delta;
  }

  // Clear single-frame states at end of frame
  update() {
    this.justPressed = {};
    this.mouseJustPressed = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }
}
