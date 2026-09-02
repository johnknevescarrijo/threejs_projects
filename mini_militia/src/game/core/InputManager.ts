export class InputManager {
  public moveX = 0;
  public moveY = 0;
  public isJumping = false;
  public isJetpacking = false;
  public isShooting = false;
  public wantsReload = false;
  public wantsGrenade = false;
  public switchWeaponSlot: number | null = null;
  public showScoreboard = false;
  public mouseScreenX = 0;
  public mouseScreenY = 0;

  private keysDown: Set<string> = new Set();
  private element: HTMLElement | null = null;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
  }

  public attach(element: HTMLElement) {
    this.element = element;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    element.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', this.onContextMenu);
  }

  public detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.element) {
      this.element.removeEventListener('mousedown', this.onMouseDown);
      this.element.removeEventListener('wheel', this.onWheel);
      this.element.removeEventListener('contextmenu', this.onContextMenu);
    }
    this.keysDown.clear();
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keysDown.add(e.code);

    if (e.code === 'KeyR') {
      this.wantsReload = true;
    }
    if (e.code === 'KeyG') {
      this.wantsGrenade = true;
    }
    if (e.code === 'Digit1') {
      this.switchWeaponSlot = 0;
    }
    if (e.code === 'Digit2') {
      this.switchWeaponSlot = 1;
    }
    if (e.code === 'Digit3') {
      this.switchWeaponSlot = 2;
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      this.showScoreboard = true;
    }

    this.updateAxes();
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keysDown.delete(e.code);

    if (e.code === 'Tab') {
      this.showScoreboard = false;
    }

    this.updateAxes();
  }

  private updateAxes() {
    let mx = 0;
    let my = 0;

    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) mx -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) mx += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) my -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) my += 1;

    this.moveX = mx;
    this.moveY = my;

    // Space or W initiates jetpack flight
    this.isJetpacking = this.keysDown.has('Space') || this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp');
    this.isJumping = this.keysDown.has('Space') || this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp');
  }

  private onMouseMove(e: MouseEvent) {
    this.mouseScreenX = e.clientX;
    this.mouseScreenY = e.clientY;
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.isShooting = true;
    } else if (e.button === 2) {
      // Right click alternative for grenade
      this.wantsGrenade = true;
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.isShooting = false;
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY > 0) {
      this.switchWeaponSlot = -1; // next weapon
    } else if (e.deltaY < 0) {
      this.switchWeaponSlot = -2; // prev weapon
    }
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  // Consume single-frame impulses
  public consumeImpulses() {
    this.wantsReload = false;
    this.wantsGrenade = false;
    this.switchWeaponSlot = null;
  }
}
