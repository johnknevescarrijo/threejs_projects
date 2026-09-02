import * as THREE from 'three';
import { ViewModel } from './ViewModel.js';
import { Inventory } from './Inventory.js';
import { BuildingSystem } from './BuildingSystem.js';

/**
 * Player - First-person survival controller with stats, head bobbing, viewmodel, harvesting, combat and dino riding
 */

export class Player {
  constructor(camera, scene, terrain, floraManager, entityManager, particleSystem, audioManager, notificationUI) {
    this.camera = camera;
    this.scene = scene;
    this.terrain = terrain;
    this.flora = floraManager;
    this.entities = entityManager;
    this.particles = particleSystem;
    this.audio = audioManager;
    this.notifications = notificationUI;

    // Player Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxStamina = 100;
    this.stamina = 100;
    this.maxHunger = 100;
    this.hunger = 100;
    this.maxThirst = 100;
    this.thirst = 100;

    // Position & Physics
    this.position = new THREE.Vector3(0, 10, 0);
    this.velocity = new THREE.Vector3();
    this.height = 1.85;
    this.isGrounded = false;
    this.isSprinting = false;
    this.isCrouching = false;

    // Camera Angles
    this.cameraPitch = 0;
    this.cameraYaw = 0;
    this.baseFov = 75;
    this.targetFov = 75;

    // Head Bobbing
    this.bobTimer = 0;
    this.bobOffset = new THREE.Vector3();
    this.screenShake = 0;
    this.damageFlash = 0;

    // Mount / Riding State
    this.mountedDino = null;

    // Systems
    this.inventory = new Inventory();
    this.viewModel = new ViewModel(this.camera);
    this.building = new BuildingSystem(this.scene, this.terrain, this.inventory, this.particles, this.audio);

    // Initial position on safe island shore
    this.respawn();

    // Interaction raycaster
    this.raycaster = new THREE.Raycaster();
    this.interactPrompt = '';
    this.interactTarget = null;
  }

  respawn() {
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.hunger = this.maxHunger;
    this.thirst = this.maxThirst;
    
    // Spawn at beach coordinate
    const spawnX = -10;
    const spawnZ = 20;
    const spawnY = this.terrain.getHeight(spawnX, spawnZ) + this.height;
    this.position.set(spawnX, spawnY, spawnZ);
    this.velocity.set(0, 0, 0);
    this.mountedDino = null;
  }

  takeDamage(amount, attacker = null) {
    if (this.health <= 0) return;

    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 0.8;
    this.triggerScreenShake(0.6, 0.25);
    this.audio.playPlayerHurt();

    if (this.notifications) {
      this.notifications.show(`-${Math.round(amount)} Dano Recebido!`, 'damage');
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (this.notifications) {
      this.notifications.show('💀 Você sucumbiu na selva! Renascendo na praia...', 'alert');
    }
    setTimeout(() => {
      this.respawn();
    }, 2500);
  }

  triggerScreenShake(intensity = 0.5, duration = 0.2) {
    this.screenShake = intensity;
  }

  // Handle player inputs
  handleInput(input, delta) {
    // Mouse Look
    const lookDelta = input.getLookDelta();
    this.cameraYaw -= lookDelta.x;
    this.cameraPitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.cameraPitch - lookDelta.y));

    // Handle Dino Riding Controls
    if (this.mountedDino) {
      this.handleMountedInput(input, delta);
      return;
    }

    // Hotbar Slot Selection (Keys 1 - 6)
    for (let i = 1; i <= 6; i++) {
      if (input.wasKeyJustPressed(`Digit${i}`)) {
        this.selectHotbarSlot(i - 1);
      }
    }

    // Movement Vector
    const move = input.getMovementVector();
    this.isSprinting = input.isKeyDown('ShiftLeft') && this.stamina > 5 && move.forward > 0;
    this.isCrouching = input.isKeyDown('KeyC');

    // Move Speed
    let baseSpeed = 4.8;
    if (this.isSprinting) baseSpeed = 8.6;
    if (this.isCrouching) baseSpeed = 2.4;

    // Movement Direction relative to camera yaw
    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    const moveDir = new THREE.Vector3()
      .addScaledVector(forwardVec, move.forward)
      .addScaledVector(rightVec, move.right);

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) {
      moveDir.normalize();
      this.velocity.x = moveDir.x * baseSpeed;
      this.velocity.z = moveDir.z * baseSpeed;

      // Drain stamina on sprint
      if (this.isSprinting) {
        this.stamina = Math.max(0, this.stamina - delta * 14.0);
      }

      // Footstep sound interval
      this.bobTimer += delta * (this.isSprinting ? 14.0 : 8.0);
      if (this.isGrounded && Math.sin(this.bobTimer) > 0.95) {
        const h = this.terrain.getHeight(this.position.x, this.position.z);
        const surface = h < 2.5 ? 'sand' : (h > 15 ? 'stone' : 'grass');
        this.audio.playFootstep(surface);
      }
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, delta * 12);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, delta * 12);
    }

    // Jump
    if (input.wasKeyJustPressed('Space') && this.isGrounded && this.stamina > 8) {
      this.velocity.y = 7.5;
      this.isGrounded = false;
      this.stamina = Math.max(0, this.stamina - 10);
      this.audio.playSwing();
    }

    // Left Click (Attack / Harvest / Build Placement)
    if (input.wasMouseJustPressed(0)) {
      this.performPrimaryAction();
    }

    // Right Click (Cancel Building / Secondary)
    if (input.wasMouseJustPressed(2)) {
      if (this.building.isBuildingMode) {
        this.building.stopBuilding();
      }
    }

    // [E] Key (Interact / Quick harvest / Tame / Mount)
    if (input.wasKeyJustPressed('KeyE')) {
      this.performInteractAction();
    }

    // Viewmodel update
    this.viewModel.update(delta, isMoving, this.isSprinting, lookDelta);
  }

  selectHotbarSlot(index) {
    this.inventory.setActiveHotbarIndex(index);
    const active = this.inventory.getActiveItem();

    if (!active) {
      this.viewModel.setTool('fists');
      this.building.stopBuilding();
      return;
    }

    if (active.type === 'structure') {
      this.viewModel.setTool('building');
      this.building.startBuilding(active.structureType);
    } else if (active.type === 'tool' || active.type === 'weapon') {
      this.viewModel.setTool(active.toolType || 'fists');
      this.building.stopBuilding();
    } else if (active.type === 'food') {
      this.viewModel.setTool('fists');
      this.building.stopBuilding();
      // Eat food directly
      this.consumeFood(active);
    }
  }

  consumeFood(item) {
    if (this.inventory.removeItem(item.id, 1)) {
      if (item.foodVal) this.hunger = Math.min(this.maxHunger, this.hunger + item.foodVal);
      if (item.thirstVal) this.thirst = Math.min(this.maxThirst, this.thirst + item.thirstVal);
      if (item.healthGain) this.health = Math.min(this.maxHealth, this.health + item.healthGain);
      if (item.healthLoss) this.takeDamage(item.healthLoss);

      this.audio.playHarvestBush();
      if (this.notifications) {
        this.notifications.show(`Consumiu: ${item.name}`, 'food');
      }
    }
  }

  performPrimaryAction() {
    if (this.building.isBuildingMode) {
      this.building.placeStructure();
      return;
    }

    this.viewModel.triggerAttack();
    const active = this.inventory.getActiveItem();
    const toolType = active ? active.toolType : 'fists';

    // Stamina drain for swinging
    this.stamina = Math.max(0, this.stamina - 3);

    // Hit Raycast
    const rayOrigin = this.camera.position;
    const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const reach = toolType === 'spear' ? 4.8 : 3.2;

    // 1. Check hitting Dinosaurs
    const hitDino = this.entities.getClosestDinosaur(rayOrigin.clone().addScaledVector(rayDir, reach * 0.5), reach);
    if (hitDino) {
      let dmg = 12;
      if (toolType === 'spear') dmg = 36;
      else if (toolType === 'axe') dmg = 24;
      else if (toolType === 'pickaxe') dmg = 18;

      hitDino.takeDamage(dmg, this);
      if (this.notifications) {
        this.notifications.show(`-${dmg} HP no ${hitDino.name}!`, 'hit');
      }
      return;
    }

    // 2. Check hitting Flora (Trees / Rocks / Bushes)
    let closestProp = null;
    let minDist = reach;
    for (const prop of this.flora.props) {
      if (!prop.userData.isAlive) continue;
      const d = prop.position.distanceTo(rayOrigin);
      if (d < minDist) {
        minDist = d;
        closestProp = prop;
      }
    }

    if (closestProp) {
      const yields = this.flora.hitProp(closestProp, toolType);
      if (yields) {
        for (const [resId, count] of Object.entries(yields)) {
          this.inventory.addItem(resId, count);
          if (this.notifications) {
            const itemDef = this.inventory.slots[resId] || { name: resId, icon: '+' };
            this.notifications.show(`+${count} ${resId}`, 'loot');
          }
        }
      }
    }
  }

  performInteractAction() {
    // If currently mounted, dismount!
    if (this.mountedDino) {
      this.dismount();
      return;
    }

    const rayOrigin = this.camera.position;
    const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    // 1. Check Dinosaur Interaction (Tame / Mount)
    const dino = this.entities.getClosestDinosaur(rayOrigin.clone().addScaledVector(rayDir, 2.5), 4.5);
    if (dino) {
      if (dino.isTamed) {
        // Mount dinosaur!
        this.mount(dino);
        return;
      } else if (dino.isTamable) {
        // Feed berries to tame!
        const hasBerries = this.inventory.getItemCount('berry_purple') > 0 || this.inventory.getItemCount('berry_red') > 0;
        if (hasBerries) {
          const berryId = this.inventory.getItemCount('berry_purple') > 0 ? 'berry_purple' : 'berry_red';
          this.inventory.removeItem(berryId, 5);
          const isDone = dino.feedBerry(34);
          if (isDone) {
            if (this.notifications) {
              this.notifications.show(`🦕 Parabéns! Você domesticou um ${dino.name}! [E] para montar`, 'tame');
            }
          } else {
            if (this.notifications) {
              this.notifications.show(`Alimentou ${dino.name}! Progresso: ${Math.round(dino.tamingProgress)}%`, 'tame');
            }
          }
        } else {
          if (this.notifications) {
            this.notifications.show('Precisa de Bagas (Mejoberry/Amarberry) para domesticar!', 'alert');
          }
        }
        return;
      }
    }

    // 2. Check Bush Harvest
    for (const prop of this.flora.props) {
      if (prop.userData.type === 'bush' && prop.userData.isAlive) {
        if (prop.position.distanceTo(rayOrigin) < 3.5) {
          const yields = this.flora.harvestBushDirect(prop);
          if (yields) {
            for (const [resId, count] of Object.entries(yields)) {
              this.inventory.addItem(resId, count);
              if (this.notifications) {
                this.notifications.show(`+${count} ${resId}`, 'loot');
              }
            }
          }
          return;
        }
      }
    }
  }

  mount(dino) {
    this.mountedDino = dino;
    dino.isRidden = true;
    if (this.notifications) {
      this.notifications.show(`🦖 Montado no ${dino.name}! Use WASD para cavalgar, [E] para desmontar`, 'mount');
    }
  }

  dismount() {
    if (!this.mountedDino) return;
    this.position.copy(this.mountedDino.group.position).add(new THREE.Vector3(1.5, 1.0, 0));
    this.mountedDino.isRidden = false;
    this.mountedDino = null;
    if (this.notifications) {
      this.notifications.show('Desmontou do dinossauro.', 'info');
    }
  }

  handleMountedInput(input, delta) {
    const dino = this.mountedDino;
    const move = input.getMovementVector();
    const isSprinting = input.isKeyDown('ShiftLeft');

    dino.currentSpeed = isSprinting ? dino.runSpeed * 1.3 : dino.speed * 1.2;

    if (move.forward !== 0 || move.right !== 0) {
      dino.isMoving = true;
      dino.group.rotation.y = this.cameraYaw;
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      dino.group.position.addScaledVector(forward, move.forward * dino.currentSpeed * delta);
    } else {
      dino.isMoving = false;
    }

    // Snap player position to dino back saddle
    this.position.copy(dino.group.position).add(new THREE.Vector3(0, 2.4, 0));

    if (input.wasKeyJustPressed('KeyE') || input.wasKeyJustPressed('Space')) {
      this.dismount();
    }
  }

  update(delta) {
    // 1. Natural Stats Drain & Regeneration
    this.hunger = Math.max(0, this.hunger - delta * 0.18);
    this.thirst = Math.max(0, this.thirst - delta * 0.25);

    // Stamina Regeneration when not sprinting
    if (!this.isSprinting && this.stamina < this.maxStamina) {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 20.0);
    }

    // Health regeneration if well-fed and quenched
    if (this.hunger > 60 && this.thirst > 60 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + delta * 3.0);
    }

    // Starvation / Dehydration damage
    if (this.hunger <= 0 || this.thirst <= 0) {
      this.takeDamage(delta * 2.0);
    }

    // 2. Physics & Gravity (if not mounted)
    if (!this.mountedDino) {
      this.velocity.y -= 18.0 * delta; // Gravity

      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.position.y += this.velocity.y * delta;

      // Ground height collision
      const groundH = this.terrain.getHeight(this.position.x, this.position.z);
      if (this.position.y <= groundH + this.height) {
        this.position.y = groundH + this.height;
        this.velocity.y = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }

    // 3. Head Bobbing Calculation
    if (this.isGrounded && this.velocity.lengthSq() > 0.1 && !this.mountedDino) {
      const bobFreq = this.isSprinting ? 14.0 : 8.0;
      const bobAmount = this.isSprinting ? 0.08 : 0.035;
      this.bobOffset.y = Math.sin(this.bobTimer) * bobAmount;
      this.bobOffset.x = Math.cos(this.bobTimer * 0.5) * (bobAmount * 0.5);
    } else {
      this.bobOffset.set(0, 0, 0);
    }

    // 4. Damage Flash & Screen Shake
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - delta * 2.5);
    }
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - delta * 3.0);
    }

    const shakeX = (Math.random() - 0.5) * this.screenShake * 0.1;
    const shakeY = (Math.random() - 0.5) * this.screenShake * 0.1;

    // 5. Camera Transformation
    this.camera.position.copy(this.position).add(this.bobOffset);
    this.camera.position.x += shakeX;
    this.camera.position.y += shakeY;

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraYaw;
    this.camera.rotation.x = this.cameraPitch;

    // 6. Dynamic FOV Kick on Sprint
    this.targetFov = this.isSprinting ? 86 : 75;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, delta * 8.0);
    this.camera.updateProjectionMatrix();

    // 7. Update Building Hologram
    if (this.building.isBuildingMode) {
      const ray = new THREE.Ray(
        this.camera.position,
        new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
      );
      this.building.updateHologram(ray, this);
    }

    // 8. Update Context Prompt for HUD
    this.updateInteractPrompt();
  }

  updateInteractPrompt() {
    const rayOrigin = this.camera.position;
    const rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    if (this.mountedDino) {
      this.interactPrompt = '🦖 Montado no Dinossauro • [E] Desmontar';
      return;
    }

    // Dino prompt
    const dino = this.entities.getClosestDinosaur(rayOrigin.clone().addScaledVector(rayDir, 2.5), 4.5);
    if (dino) {
      if (dino.isTamed) {
        this.interactPrompt = `🦕 [E] Montar ${dino.name} (Amigável)`;
      } else if (dino.isTamable) {
        this.interactPrompt = `🍇 [E] Alimentar Bagas para Domesticar (${Math.round(dino.tamingProgress)}%)`;
      } else {
        this.interactPrompt = `⚠️ [Ataque] ${dino.name} Hostil!`;
      }
      return;
    }

    // Bush prompt
    for (const prop of this.flora.props) {
      if (prop.userData.type === 'bush' && prop.userData.isAlive) {
        if (prop.position.distanceTo(rayOrigin) < 3.5) {
          this.interactPrompt = '🌿 [E] Colher Fibras e Bagas';
          return;
        }
      }
    }

    this.interactPrompt = '';
  }
}
