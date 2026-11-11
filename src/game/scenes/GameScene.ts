import Phaser from 'phaser';
import { GameAudio } from '../audio';
import {
  BUILD_COSTS,
  EMPTY_SAVE,
  RESOURCE_META,
  TUTORIAL_COPY,
  type BuildingType,
  type ResourceKey,
  type Resources,
  type SavedBuilding,
  type SavedUnit,
  type SaveState,
  type TutorialStage,
} from '../data';
import type { SaveManager } from '../save';
import { hideModal, showModal, showToast, text } from '../../ui';

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1400;

type UnitKind = 'hero' | 'villager' | 'soldier';
type BuildType = BuildingType;

interface UnitModel {
  id: string;
  name: string;
  role: string;
  trait: string;
  symbol: string;
  kind: UnitKind;
  container: Phaser.GameObjects.Container;
  selectionRing: Phaser.GameObjects.Ellipse;
  busy: boolean;
  combatDamage: number;
}

interface ResourceNode {
  type: ResourceKey;
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
}

interface BuildingModel {
  data: SavedBuilding;
  container: Phaser.GameObjects.Container;
  selectionRing: Phaser.GameObjects.Ellipse;
}

interface BossModel {
  container: Phaser.GameObjects.Container;
  health: number;
  maxHealth: number;
  healthFill: Phaser.GameObjects.Rectangle;
  attacking: boolean;
}

interface ControlKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  ESC: Phaser.Input.Keyboard.Key;
  ONE: Phaser.Input.Keyboard.Key;
  TWO: Phaser.Input.Keyboard.Key;
  THREE: Phaser.Input.Keyboard.Key;
}

export class GameScene extends Phaser.Scene {
  private readonly saveManager: SaveManager;
  private readonly loadedState: SaveState | null;
  private readonly gameAudio = new GameAudio();

  private state: SaveState;
  private keys!: ControlKeys;
  private units = new Map<string, UnitModel>();
  private resourceNodes: ResourceNode[] = [];
  private buildings: BuildingModel[] = [];
  private selectedUnit: UnitModel | null = null;
  private selectedBuilding: BuildingModel | null = null;
  private boss: BossModel | null = null;
  private tribeChief: BossModel | null = null;
  private tribeCamp: Phaser.GameObjects.Container | null = null;
  private tribeFog: Phaser.GameObjects.Container | null = null;
  private productionTicks = 0;
  private placementType: BuildType | null = null;
  private placementGhost: Phaser.GameObjects.Container | null = null;
  private guideMarker: Phaser.GameObjects.Container | null = null;
  private controlsEnabled = false;
  private cameraOrigin = new Phaser.Math.Vector2();
  private ritualUsed = false;

  constructor(saveManager: SaveManager, loadedState: SaveState | null) {
    super({ key: 'GameScene' });
    this.saveManager = saveManager;
    this.loadedState = loadedState;
    this.state = this.sanitizeState(loadedState);
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(1030, 690);
    this.cameraOrigin.set(this.cameras.main.scrollX, this.cameras.main.scrollY);

    this.drawWorld();
    this.createResourceNodes();
    this.restoreBuildings();
    this.createFounders();
    this.restoreStageActors();
    this.restoreCampaignActors();
    this.createGuideMarker();
    this.configureInput();
    this.configureHud();
    this.updateAllHud();
    this.updateGuide();

    this.time.addEvent({
      delay: 30_000,
      loop: true,
      callback: () => void this.saveGame(),
    });
    this.time.addEvent({
      delay: 2_000,
      loop: true,
      callback: () => this.tickRiceProduction(),
    });

    if (this.loadedState) {
      this.controlsEnabled = true;
      showToast('Đã khôi phục bản lưu', 'Vương quốc của bạn vẫn nguyên vẹn trên thiết bị này.', '↻');
      if (this.state.tutorialStage === 'boss-warning') {
        this.state.tutorialStage = 'fight-boss';
        this.setTutorial('fight-boss', false);
      } else if (this.state.tutorialStage === 'complete') {
        this.controlsEnabled = false;
        this.time.delayedCall(450, () => {
          if (this.state.originGiftClaimed) this.beginLevelOne(true);
          else this.showVictoryModal();
        });
      } else if (this.state.tutorialStage === 'level1-complete') {
        this.controlsEnabled = false;
        this.time.delayedCall(550, () => this.showLevelOneComplete());
      } else if (this.state.tutorialStage === 'level2-tribe-choice') {
        this.time.delayedCall(650, () => this.showTribeChoice());
      }
    } else {
      this.showOpeningModal();
    }
  }

  update(_time: number, delta: number): void {
    if (!this.controlsEnabled) return;

    const camera = this.cameras.main;
    const speed = (0.42 * delta) / camera.zoom;
    let dx = 0;
    let dy = 0;

    if (this.keys.W.isDown) dy -= speed;
    if (this.keys.S.isDown) dy += speed;
    if (this.keys.A.isDown) dx -= speed;
    if (this.keys.D.isDown) dx += speed;

    const pointer = this.input.activePointer;
    const edge = 9;
    if (!this.placementType && pointer.y > 75 && pointer.y < this.scale.height - 42) {
      if (pointer.x < edge) dx -= speed * 0.62;
      if (pointer.x > this.scale.width - edge) dx += speed * 0.62;
      if (pointer.y < 86) dy -= speed * 0.62;
      if (pointer.y > this.scale.height - 48) dy += speed * 0.62;
    }

    if (dx !== 0 || dy !== 0) {
      camera.scrollX += dx;
      camera.scrollY += dy;
      if (
        this.state.tutorialStage === 'pan' &&
        Phaser.Math.Distance.Between(camera.scrollX, camera.scrollY, this.cameraOrigin.x, this.cameraOrigin.y) > 54
      ) {
        this.setTutorial('select-au-co');
        showToast('Tầm nhìn đã mở', 'Nhấp chuột trái để chọn một nhân vật.', '⌖');
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.cancelPlacement();
    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) document.querySelector<HTMLButtonElement>('#build-house')?.click();
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) document.querySelector<HTMLButtonElement>('#build-chief')?.click();
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) document.querySelector<HTMLButtonElement>('#upgrade-era')?.click();
  }

  private sanitizeState(loaded: SaveState | null): SaveState {
    if (!loaded || loaded.version !== 1) {
      return { ...EMPTY_SAVE, resources: { ...EMPTY_SAVE.resources }, buildings: [], trainedUnits: [], savedAt: Date.now() };
    }
    return {
      ...EMPTY_SAVE,
      ...loaded,
      resources: { ...EMPTY_SAVE.resources, ...loaded.resources },
      buildings: Array.isArray(loaded.buildings) ? loaded.buildings.map((building) => ({ ...building })) : [],
      trainedUnits: Array.isArray(loaded.trainedUnits) ? loaded.trainedUnits.map((unit) => ({ ...unit })) : [],
    };
  }

  private showOpeningModal(): void {
    showModal({
      eyebrow: 'THUỞ HỒNG HOANG · CHƯƠNG MỞ ĐẦU',
      title: 'Bước chân đầu tiên',
      seal: '✦',
      body:
        '<p>Thuở đất trời còn phủ sương, <strong>Lạc Long Quân và Âu Cơ</strong> dẫn con cháu xuống đồng bằng, tìm miền đất lành bên sông Hồng để dựng cơ đồ.</p><p>Hãy khai mở tầm nhìn, tìm nguồn sống và bảo vệ những người Lạc Việt đầu tiên.</p>',
      actions: [
        {
          label: 'Bắt đầu khai hoang',
          onClick: () => {
            hideModal();
            this.controlsEnabled = true;
            this.gameAudio.drum();
          },
        },
      ],
    });
  }

  private configureInput(): void {
    this.input.mouse?.disableContextMenu();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,ESC,ONE,TWO,THREE') as unknown as ControlKeys;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.controlsEnabled) return;
      if (pointer.rightButtonDown()) {
        if (this.placementType) {
          this.cancelPlacement();
          return;
        }
        this.handleWorldCommand(pointer.worldX, pointer.worldY);
        return;
      }
      if (pointer.leftButtonDown() && this.placementType) this.tryPlaceBuilding(pointer.worldX, pointer.worldY);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.placementGhost) {
        this.placementGhost.setPosition(pointer.worldX, pointer.worldY);
        const valid = this.isValidBuildingPosition(pointer.worldX, pointer.worldY);
        this.placementGhost.setAlpha(valid ? 0.78 : 0.38);
      }
    });

    this.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        const camera = this.cameras.main;
        camera.setZoom(Phaser.Math.Clamp(camera.zoom - dy * 0.00055, 0.72, 1.28));
      },
    );
  }

  private configureHud(): void {
    document.querySelector<HTMLButtonElement>('#build-house')?.addEventListener('click', () => this.beginPlacement('house'));
    document.querySelector<HTMLButtonElement>('#build-chief')?.addEventListener('click', () => this.beginPlacement('chief'));
    document.querySelector<HTMLButtonElement>('#upgrade-era')?.addEventListener('click', () => this.upgradeEra());
    document.querySelector<HTMLButtonElement>('#build-field')?.addEventListener('click', () => this.beginPlacement('rice-field'));
    document.querySelector<HTMLButtonElement>('#call-rain')?.addEventListener('click', () => this.callRain());
    document.querySelector<HTMLButtonElement>('#build-barracks')?.addEventListener('click', () => this.beginPlacement('barracks'));
    document.querySelector<HTMLButtonElement>('#train-warrior')?.addEventListener('click', () => this.trainUnit('lac-quan'));
    document.querySelector<HTMLButtonElement>('#train-archer')?.addEventListener('click', () => this.trainUnit('archer'));
    document.querySelector<HTMLButtonElement>('#sound-button')?.addEventListener('click', (event) => {
      const muted = this.gameAudio.toggle();
      (event.currentTarget as HTMLButtonElement).textContent = muted ? '×' : '♪';
      showToast(muted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh', 'Bạn có thể thay đổi bất cứ lúc nào.', muted ? '×' : '♪');
    });
    document.querySelector<HTMLButtonElement>('#fullscreen-button')?.addEventListener('click', async () => {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    });
    document.querySelector<HTMLButtonElement>('#ritual-button')?.addEventListener('click', () => this.openRitual());
  }

  private drawWorld(): void {
    const graphics = this.add.graphics().setDepth(-10_000);
    graphics.fillStyle(0x294b37).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const random = this.seededRandom(3187);
    for (let index = 0; index < 120; index += 1) {
      const x = random() * 1780;
      const y = random() * WORLD_HEIGHT;
      const radius = 30 + random() * 120;
      graphics.fillStyle(random() > 0.5 ? 0x31543c : 0x24432f, 0.28);
      graphics.fillEllipse(x, y, radius * 1.8, radius);
    }

    graphics.lineStyle(2, 0x8b9161, 0.11);
    for (let row = 0; row < 9; row += 1) {
      const y = 260 + row * 78;
      graphics.beginPath();
      graphics.moveTo(190, y);
      graphics.lineTo(470, y - 35).lineTo(720, y + 35).lineTo(1020, y - 5);
      graphics.strokePath();
    }

    graphics.fillStyle(0x9c7b48, 0.22);
    graphics.beginPath();
    graphics.moveTo(300, 1030);
    graphics.lineTo(620, 860).lineTo(780, 760).lineTo(1100, 700);
    graphics.lineTo(1290, 665).lineTo(1420, 670).lineTo(1640, 760);
    graphics.lineTo(1630, 820);
    graphics.lineTo(1400, 730).lineTo(1250, 735).lineTo(1080, 770);
    graphics.lineTo(760, 830).lineTo(600, 940).lineTo(330, 1090);
    graphics.closePath().fillPath();

    graphics.fillStyle(0x284d4b);
    graphics.beginPath();
    graphics.moveTo(1580, -50);
    graphics.lineTo(1510, 210).lineTo(1745, 395).lineTo(1625, 635);
    graphics.lineTo(1510, 860).lineTo(1770, 1085).lineTo(1650, 1450);
    graphics.lineTo(2250, 1450).lineTo(2250, -50).closePath().fillPath();
    graphics.lineStyle(13, 0xb9a66b, 0.16);
    graphics.beginPath();
    graphics.moveTo(1580, -50);
    graphics.lineTo(1510, 210).lineTo(1745, 395).lineTo(1625, 635);
    graphics.lineTo(1510, 860).lineTo(1770, 1085).lineTo(1650, 1450);
    graphics.strokePath();
    graphics.lineStyle(3, 0xb7d5c7, 0.11);
    for (let line = 0; line < 8; line += 1) {
      const x = 1690 + line * 62;
      graphics.beginPath().moveTo(x, 70).lineTo(x + 70, 130).strokePath();
      graphics.beginPath().moveTo(x - 80, 940).lineTo(x + 15, 1010).strokePath();
    }

    this.drawRiceTerraces(graphics, 345, 455);
    this.drawRiceTerraces(graphics, 470, 500);
    this.drawRiceTerraces(graphics, 325, 720);

    for (let index = 0; index < 38; index += 1) {
      const angle = (index / 38) * Math.PI * 2;
      const radius = 500 + (index % 4) * 38;
      const x = 960 + Math.cos(angle) * radius;
      const y = 700 + Math.sin(angle) * radius * 0.72;
      if (x < 1510) this.drawDistantTree(graphics, x, y, 0.7 + (index % 3) * 0.14);
    }

    const title = this.add.text(1040, 335, 'CHÂU PHONG', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#e5d8b0',
      letterSpacing: 8,
    });
    title.setOrigin(0.5).setAlpha(0.34).setDepth(-9000);
    const subtitle = this.add.text(1040, 354, 'ĐẤT TỔ NGƯỜI LẠC VIỆT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '7px',
      color: '#d3c79f',
      letterSpacing: 3,
    });
    subtitle.setOrigin(0.5).setAlpha(0.25).setDepth(-9000);
  }

  private drawRiceTerraces(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
    for (let index = 0; index < 4; index += 1) {
      graphics.fillStyle(index % 2 ? 0x8d813f : 0x697b3b, 0.28);
      graphics.fillRoundedRect(x + index * 13, y + index * 27, 250 - index * 24, 20, 8);
    }
  }

  private drawDistantTree(graphics: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    graphics.fillStyle(0x142f24, 0.7).fillRect(x - 3 * scale, y, 6 * scale, 16 * scale);
    graphics.fillStyle(0x1a3929, 0.88).fillCircle(x, y - 7 * scale, 18 * scale);
    graphics.fillStyle(0x234731, 0.8).fillCircle(x - 12 * scale, y, 13 * scale);
    graphics.fillCircle(x + 12 * scale, y, 12 * scale);
  }

  private createResourceNodes(): void {
    this.resourceNodes.push(this.createRiceNode(755, 600));
    this.resourceNodes.push(this.createTreeNode(1095, 535));
    this.resourceNodes.push(this.createStoneNode(1250, 900));
    this.createRiceNode(620, 520, true);
    this.createTreeNode(1325, 450, true);
    this.createStoneNode(430, 930, true);
  }

  private createRiceNode(x: number, y: number, decorative = false): ResourceNode {
    const container = this.add.container(x, y).setDepth(y);
    const patch = this.add.ellipse(0, 12, 100, 32, 0x4b5830, 0.72);
    container.add(patch);
    for (let index = 0; index < 13; index += 1) {
      const stalk = this.add.rectangle(-40 + index * 7, 0 + (index % 3) * 4, 2, 27, 0xd2a64a);
      stalk.setRotation(index % 2 ? -0.12 : 0.1);
      const grain = this.add.ellipse(stalk.x + (index % 2 ? -2 : 2), stalk.y - 14, 5, 10, 0xe6c362);
      container.add([stalk, grain]);
    }
    const label = this.add.text(0, 34, decorative ? '' : 'LÚA DẠI', this.nodeLabelStyle()).setOrigin(0.5);
    container.add(label);
    if (!decorative) this.addNodePulse(container, 0xdab455);
    return { type: 'food', x, y, container };
  }

  private createTreeNode(x: number, y: number, decorative = false): ResourceNode {
    const container = this.add.container(x, y).setDepth(y);
    const shadow = this.add.ellipse(0, 28, 100, 34, 0x091b14, 0.35);
    const trunk = this.add.rectangle(0, -5, 18, 85, 0x68472d).setStrokeStyle(3, 0x3f2c22);
    const crownA = this.add.circle(0, -64, 42, 0x1d4a31).setStrokeStyle(3, 0x142f24);
    const crownB = this.add.circle(-31, -43, 31, 0x285a38);
    const crownC = this.add.circle(33, -42, 33, 0x244f34);
    const highlight = this.add.circle(-11, -73, 14, 0x456d3e, 0.58);
    container.add([shadow, trunk, crownA, crownB, crownC, highlight]);
    const label = this.add.text(0, 48, decorative ? '' : 'CÂY CỔ THỤ', this.nodeLabelStyle()).setOrigin(0.5);
    container.add(label);
    if (!decorative) this.addNodePulse(container, 0x85aa65);
    return { type: 'wood', x, y, container };
  }

  private createStoneNode(x: number, y: number, decorative = false): ResourceNode {
    const container = this.add.container(x, y).setDepth(y);
    const shadow = this.add.ellipse(0, 17, 92, 27, 0x10231a, 0.42);
    const rockA = this.add.polygon(-15, 0, [-30, 18, -23, -18, 5, -37, 28, 13], 0x777b70).setStrokeStyle(2, 0x4f554d);
    const rockB = this.add.polygon(25, 5, [-18, 15, -11, -14, 10, -22, 24, 13], 0x96998c);
    const shine = this.add.line(-12, -13, 0, 0, 12, -9, 0xbfc0ae, 0.56).setLineWidth(2);
    container.add([shadow, rockA, rockB, shine]);
    const label = this.add.text(0, 40, decorative ? '' : 'MỎ ĐÁ', this.nodeLabelStyle()).setOrigin(0.5);
    container.add(label);
    if (!decorative) this.addNodePulse(container, 0xb6b7aa);
    return { type: 'stone', x, y, container };
  }

  private nodeLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#e9e1c9',
      backgroundColor: '#13271fcc',
      padding: { x: 5, y: 3 },
    };
  }

  private addNodePulse(container: Phaser.GameObjects.Container, color: number): void {
    const ring = this.add.ellipse(0, 13, 116, 50).setStrokeStyle(1, color, 0.45);
    container.addAt(ring, 0);
    this.tweens.add({ targets: ring, scaleX: 1.12, scaleY: 1.12, alpha: 0.12, duration: 1250, yoyo: true, repeat: -1 });
  }

  private createFounders(): void {
    this.createUnit({
      id: 'lac-long-quan',
      name: 'Lạc Long Quân',
      role: 'THỦY TỔ · TƯỚNG CHIẾN',
      trait: 'Long uy: khắc chế thủy quái, +15% sức mạnh quân đội',
      symbol: '龍',
      kind: 'hero',
      x: 900,
      y: 720,
      color: 0x386a72,
      accent: 0xd3a04d,
    });
    this.createUnit({
      id: 'au-co',
      name: 'Âu Cơ',
      role: 'QUỐC MẪU · TƯỚNG HỖ TRỢ',
      trait: 'Mẹ trăm con: +50% Lúa thu hoạch trong bản demo',
      symbol: 'ÂU',
      kind: 'hero',
      x: 805,
      y: 680,
      color: 0x8c3f37,
      accent: 0xe0be74,
    });
  }

  private createUnit(options: {
    id: string;
    name: string;
    role: string;
    trait: string;
    symbol: string;
    kind: UnitKind;
    x: number;
    y: number;
    color: number;
    accent: number;
    combatDamage?: number;
  }): UnitModel {
    const container = this.add.container(options.x, options.y).setDepth(options.y + 20);
    const shadow = this.add.ellipse(0, 15, options.kind === 'hero' ? 58 : 42, 20, 0x06150f, 0.48);
    const selectionRing = this.add.ellipse(0, 13, options.kind === 'hero' ? 66 : 50, 28).setStrokeStyle(3, 0xb9d66e, 0.95);
    selectionRing.setVisible(false);
    const legs = this.add.rectangle(0, 2, options.kind === 'hero' ? 20 : 15, 30, 0x442c22);
    const torso = this.add.ellipse(0, -17, options.kind === 'hero' ? 35 : 27, options.kind === 'hero' ? 45 : 36, options.color).setStrokeStyle(2, options.accent, 0.72);
    const head = this.add.circle(0, -45, options.kind === 'hero' ? 14 : 11, 0xc98c66).setStrokeStyle(2, 0x44281f);
    const plume = this.add.triangle(0, -70, -12, 20, 0, -13, 12, 20, options.accent, 0.94);
    const weapon = this.add.rectangle(22, -12, 4, options.kind === 'hero' ? 60 : 43, options.accent).setRotation(-0.15);
    const badge = this.add.text(0, -18, options.symbol, {
      fontFamily: 'Georgia, serif',
      fontSize: options.symbol.length > 1 ? '7px' : '11px',
      fontStyle: 'bold',
      color: '#f6e7bc',
    }).setOrigin(0.5);
    const nameplate = this.add.text(0, 37, options.name, {
      fontFamily: 'Arial, sans-serif',
      fontSize: options.kind === 'hero' ? '9px' : '7px',
      fontStyle: 'bold',
      color: '#f1e8d3',
      backgroundColor: '#10231ccc',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5);
    container.add([shadow, selectionRing, legs, weapon, torso, head, plume, badge, nameplate]);
    container.setSize(options.kind === 'hero' ? 72 : 56, 100).setInteractive({ useHandCursor: true });

    const unit: UnitModel = {
      id: options.id,
      name: options.name,
      role: options.role,
      trait: options.trait,
      symbol: options.symbol,
      kind: options.kind,
      container,
      selectionRing,
      busy: false,
      combatDamage: options.combatDamage ?? (options.kind === 'hero' ? 40 : options.kind === 'soldier' ? 28 : 4),
    };
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.controlsEnabled && !this.placementType) this.selectUnit(unit);
    });
    container.on('pointerover', () => container.setScale(1.035));
    container.on('pointerout', () => container.setScale(1));
    this.units.set(options.id, unit);
    return unit;
  }

  private restoreBuildings(): void {
    this.state.buildings.forEach((building) => this.createBuilding({ ...building }, false));
    if (this.state.buildings.some((building) => building.type === 'house')) this.ensureVillagers();
  }

  private restoreStageActors(): void {
    if (this.state.tutorialStage === 'boss-warning' || this.state.tutorialStage === 'fight-boss') {
      this.spawnBoss(true);
    }
  }

  private restoreCampaignActors(): void {
    if (this.state.campaignStarted) this.createThanNong();
    if (this.state.level >= 2) {
      this.createLacHau();
      this.createNeutralCamp(this.state.tutorialStage !== 'level2-train-archer');
    }
    this.state.trainedUnits.forEach((unit) => this.createTrainedUnit(unit));
    if (this.state.tutorialStage === 'level1-drought') {
      const field = this.buildings.find((building) => building.data.type === 'rice-field');
      if (field) this.applyDroughtVisual(field);
    }
    if (this.state.tutorialStage === 'level2-conquest') {
      this.createNeutralCamp(true);
      this.spawnTribeChief();
    }
  }

  private createThanNong(): void {
    if (this.units.has('than-nong')) return;
    this.createUnit({
      id: 'than-nong', name: 'Thần Nông', role: 'TỔ NGHỀ LÚA · TƯỚNG KINH TẾ',
      trait: 'Nông lịch: Ruộng Lúa Nước sản xuất 15 Lúa mỗi 10 giây', symbol: '農', kind: 'hero',
      x: 1035, y: 650, color: 0x65733f, accent: 0xe0b95d, combatDamage: 18,
    });
  }

  private createLacHau(): void {
    if (this.units.has('lac-hau')) return;
    this.createUnit({
      id: 'lac-hau', name: 'Lạc Hầu', role: 'NỘI CHÍNH · SỨ GIẢ',
      trait: 'Kết giao: giảm cống vật khi thu phục bộ lạc bằng hòa bình', symbol: '侯', kind: 'hero',
      x: 945, y: 805, color: 0x69547a, accent: 0xd6b86d, combatDamage: 24,
    });
  }

  private createTrainedUnit(saved: SavedUnit): UnitModel {
    const warrior = saved.type === 'lac-quan';
    return this.createUnit({
      id: saved.id,
      name: warrior ? 'Chiến binh Rìu Đồng' : 'Xạ thủ Nỏ Tre',
      role: warrior ? 'LẠC QUÂN · CẬN CHIẾN' : 'LẠC QUÂN · TẦM XA',
      trait: warrior ? '+20% sát thương lên công trình và thủ lĩnh bộ lạc' : 'Tên độc gây sát thương từ xa',
      symbol: warrior ? '斧' : '➶', kind: 'soldier', x: saved.x, y: saved.y,
      color: warrior ? 0x8a4f35 : 0x466845, accent: warrior ? 0xd18a46 : 0xc4b35b,
      combatDamage: warrior ? 32 : 22,
    });
  }

  private ensureVillagers(): void {
    if (this.units.has('villager-1')) return;
    const house = this.state.buildings.find((building) => building.type === 'house');
    const origin = house ?? { x: 720, y: 820 };
    this.createUnit({
      id: 'villager-1', name: 'Lạc Dân', role: 'DÂN LÀNG · THỢ XÂY', trait: 'Khai thác tài nguyên và dựng công trình', symbol: 'L', kind: 'villager', x: origin.x - 35, y: origin.y + 54, color: 0x6d7541, accent: 0xc59a54,
    });
    this.createUnit({
      id: 'villager-2', name: 'Lạc Dân', role: 'DÂN LÀNG · THỢ XÂY', trait: 'Khai thác tài nguyên và dựng công trình', symbol: 'L', kind: 'villager', x: origin.x + 35, y: origin.y + 59, color: 0x756046, accent: 0xc59a54,
    });
  }

  private selectUnit(unit: UnitModel): void {
    if (this.selectedUnit === unit && !this.selectedBuilding) return;
    this.selectedBuilding?.selectionRing.setVisible(false);
    this.selectedBuilding = null;
    this.selectedUnit?.selectionRing.setVisible(false);
    this.selectedUnit = unit;
    unit.selectionRing.setVisible(true);
    this.gameAudio.hit(330);

    document.querySelector('#selection-panel')?.classList.remove('is-empty');
    text('#selection-role', unit.role);
    text('#selection-name', unit.name);
    text('#selection-trait', unit.trait);
    text('#selection-portrait span', unit.symbol);
    const portrait = document.querySelector<HTMLElement>('#selection-portrait');
    if (portrait) portrait.style.background = unit.id === 'au-co' ? 'radial-gradient(circle at 50% 30%, #a86150, #3f2424 67%)' : 'radial-gradient(circle at 50% 30%, #477b77, #1c3329 67%)';

    if (this.state.tutorialStage === 'select-au-co' && unit.id === 'au-co') {
      this.setTutorial('gather-rice');
      showToast('Đã chọn Âu Cơ', 'Nhấp chuột phải vào bụi lúa để ra lệnh thu hoạch.', '◒');
    }
    this.syncActionButtons();
    this.updateGuide();
  }

  private selectBuilding(building: BuildingModel): void {
    if (this.selectedBuilding === building) {
      this.syncActionButtons();
      return;
    }
    this.selectedUnit?.selectionRing.setVisible(false);
    this.selectedUnit = null;
    this.selectedBuilding?.selectionRing.setVisible(false);
    this.selectedBuilding = building;
    building.selectionRing.setVisible(true);
    this.gameAudio.hit(285);

    const buildingCopy: Record<BuildType, { role: string; name: string; trait: string; symbol: string }> = {
      house: { role: 'CÔNG TRÌNH DÂN SỰ', name: 'Nhà Sàn', trait: 'Tăng giới hạn dân số và chống ngập', symbol: '⌂' },
      chief: { role: 'TRUNG TÂM VĂN LANG', name: building.data.upgraded ? 'Đền Hùng' : 'Lều Trưởng Bản', trait: 'Trung tâm quyền lực và nơi tiến lên đời mới', symbol: '♜' },
      'rice-field': { role: 'CÔNG TRÌNH KINH TẾ', name: 'Ruộng Lúa Nước', trait: this.state.droughtResolved ? 'Đang sản xuất 15 Lúa mỗi 10 giây' : 'Đang ngừng sản xuất vì hạn hán', symbol: '≋' },
      barracks: { role: 'CÔNG TRÌNH QUÂN SỰ', name: 'Trại Lạc Quân', trait: 'Mở bảng huấn luyện binh lính Văn Lang', symbol: '⚑' },
    };
    const copy = buildingCopy[building.data.type];
    document.querySelector('#selection-panel')?.classList.remove('is-empty');
    text('#selection-role', copy.role);
    text('#selection-name', copy.name);
    text('#selection-trait', copy.trait);
    text('#selection-portrait span', copy.symbol);
    const portrait = document.querySelector<HTMLElement>('#selection-portrait');
    if (portrait) portrait.style.background = 'radial-gradient(circle at 50% 30%, #8c673d, #273c30 68%)';

    this.syncActionButtons();
    this.updateGuide();
    if (building.data.type === 'barracks' && ['level1-train-warrior', 'level2-train-archer'].includes(this.state.tutorialStage)) {
      showToast('Đã mở Trại Lạc Quân', 'Chọn loại binh muốn huấn luyện ở bảng hành động.', '⚑');
    }
  }

  private handleWorldCommand(x: number, y: number): void {
    const unit = this.selectedUnit;
    if (!unit || unit.busy) {
      showToast('Chưa chọn nhân vật', 'Nhấp chuột trái vào Lạc Long Quân hoặc Âu Cơ trước.', 'i');
      return;
    }

    if (this.tribeChief && Phaser.Math.Distance.Between(x, y, this.tribeChief.container.x, this.tribeChief.container.y) < 125) {
      if (this.state.tutorialStage === 'level2-conquest' && unit.id.startsWith('lac-quan')) this.attackTribeChief(unit);
      else showToast('Cần Chiến binh Rìu Đồng', 'Hãy dùng đội Lạc Quân vừa huấn luyện để chinh phạt.', '⚔');
      return;
    }

    if (this.boss && Phaser.Math.Distance.Between(x, y, this.boss.container.x, this.boss.container.y) < 115) {
      if (this.state.tutorialStage === 'fight-boss' && unit.id === 'lac-long-quan') this.attackBoss(unit);
      else showToast('Cần Lạc Long Quân', 'Thủy tổ có nội tại khắc chế Ngư Tinh.', '⚔');
      return;
    }

    const target = this.resourceNodes
      .map((node) => ({ node, distance: Phaser.Math.Distance.Between(x, y, node.x, node.y) }))
      .sort((left, right) => left.distance - right.distance)[0];
    if (target && target.distance < 105) {
      this.gatherResource(unit, target.node);
      return;
    }

    this.moveUnit(unit, x, y);
  }

  private gatherResource(unit: UnitModel, node: ResourceNode): void {
    const stage = this.state.tutorialStage;
    if (stage === 'gather-rice' && (unit.id !== 'au-co' || node.type !== 'food')) {
      showToast('Hãy dùng Âu Cơ', 'Chọn Âu Cơ rồi ra lệnh tại bụi lúa vàng.', '◒');
      return;
    }
    if (stage === 'gather-wood' && (unit.id !== 'lac-long-quan' || node.type !== 'wood')) {
      showToast('Hãy dùng Lạc Long Quân', 'Chọn Lạc Long Quân rồi ra lệnh tại cây cổ thụ.', '⌁');
      return;
    }
    const campaignGathering = this.state.level >= 1 && !['level2-conquest'].includes(stage);
    if (!['gather-rice', 'gather-wood', 'complete'].includes(stage) && !campaignGathering) {
      showToast('Nhiệm vụ đang tiếp diễn', 'Hoàn thành hướng dẫn hiện tại trước khi khai thác tự do.', 'i');
      return;
    }

    unit.busy = true;
    this.moveUnit(unit, node.x - 42, node.y + 18, () => {
      this.time.delayedCall(520, () => {
        const base = this.state.level >= 1 ? 20 : 10;
        const amount = unit.id === 'au-co' && node.type === 'food' ? (this.state.level >= 1 ? 30 : 15) : unit.id === 'lac-long-quan' && node.type === 'wood' ? 20 : base;
        this.addResource(node.type, amount);
        this.floatText(node.x, node.y - 55, `+${amount} ${RESOURCE_META[node.type].label}`, RESOURCE_META[node.type].color);
        this.gameAudio.chime();
        unit.busy = false;
        if (stage === 'gather-rice') {
          this.setTutorial('gather-wood');
          showToast('+15 Lúa', 'Nội tại Mẹ Trăm Con đã tăng sản lượng.', '◒');
        } else if (stage === 'gather-wood') {
          this.setTutorial('build-house');
          showToast('Đã đủ 50 Gỗ', 'Nút Nhà Sàn đã được mở khóa.', '⌂');
        }
      });
    });
  }

  private moveUnit(unit: UnitModel, x: number, y: number, onComplete?: () => void): void {
    const safeX = Phaser.Math.Clamp(x, 80, 1550);
    const safeY = Phaser.Math.Clamp(y, 130, WORLD_HEIGHT - 80);
    const distance = Phaser.Math.Distance.Between(unit.container.x, unit.container.y, safeX, safeY);
    this.tweens.killTweensOf(unit.container);
    this.tweens.add({
      targets: unit.container,
      x: safeX,
      y: safeY,
      duration: Math.max(180, distance * 3.2),
      ease: 'Sine.easeInOut',
      onUpdate: () => unit.container.setDepth(unit.container.y + 20),
      onComplete,
    });
  }

  private beginPlacement(type: BuildType): void {
    if (!this.controlsEnabled || this.placementType) return;
    const stage = this.state.tutorialStage;
    const allowed =
      (type === 'house' && (stage === 'build-house' || stage === 'level2-complete')) ||
      (type === 'chief' && stage === 'build-chief') ||
      (type === 'rice-field' && stage === 'level1-build-field') ||
      (type === 'barracks' && stage === 'level1-build-barracks');
    if (!allowed) return;
    if (!this.canAfford(BUILD_COSTS[type])) {
      const requirements: Record<BuildType, string> = {
        house: 'Cần 50 Gỗ để dựng Nhà Sàn.',
        chief: 'Cần 80 Đá để dựng Lều Trưởng Bản.',
        'rice-field': 'Cần 60 Gỗ để khai mở Ruộng Lúa Nước.',
        barracks: 'Cần 80 Gỗ và 40 Đá để dựng Trại Lạc Quân.',
      };
      showToast('Chưa đủ tài nguyên', requirements[type], '!');
      return;
    }
    this.placementType = type;
    this.placementGhost = this.createBuildingVisual(type, this.input.activePointer.worldX, this.input.activePointer.worldY, false);
    this.placementGhost.setAlpha(0.72).setDepth(9_000);
    document.querySelector('#placing-banner')?.classList.add('is-visible');
  }

  private tryPlaceBuilding(x: number, y: number): void {
    const type = this.placementType;
    if (!type) return;
    if (!this.isValidBuildingPosition(x, y)) {
      showToast('Không thể xây ở đây', 'Chọn vùng đất trống, tránh sông và các công trình khác.', '⌖');
      return;
    }
    this.spendResources(BUILD_COSTS[type]);
    this.cancelPlacement();
    const data: SavedBuilding = {
      id: `${type}-${Date.now()}`,
      type,
      x,
      y,
      upgraded: false,
    };
    const building = this.createBuilding(data, true);
    this.syncActionButtons();
    this.controlsEnabled = false;
    this.tweens.add({
      targets: building.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      y: y,
      duration: type === 'house' ? 3000 : type === 'rice-field' ? 2600 : 4200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.controlsEnabled = true;
        this.handleBuildComplete(type);
      },
    });
  }

  private createBuilding(data: SavedBuilding, constructing: boolean): BuildingModel {
    const container = this.createBuildingVisual(data.type, data.x, data.y, Boolean(data.upgraded));
    container.setDepth(data.y + 5);
    const selectionWidth = data.type === 'rice-field' ? 174 : data.type === 'barracks' ? 190 : data.type === 'chief' ? 182 : 142;
    const selectionRing = this.add.ellipse(0, 22, selectionWidth, data.type === 'barracks' ? 76 : 61).setStrokeStyle(3, 0xe2c467, 0.95);
    selectionRing.setVisible(false);
    container.addAt(selectionRing, 0);
    const hitHeight = data.type === 'barracks' ? 145 : data.type === 'rice-field' ? 95 : 130;
    container.setSize(selectionWidth, hitHeight).setInteractive({ useHandCursor: true });
    if (constructing) container.setAlpha(0.25).setScale(0.72).setY(data.y + 24);
    const building: BuildingModel = { data, container, selectionRing };
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.controlsEnabled && !this.placementType) this.selectBuilding(building);
    });
    container.on('pointerover', () => {
      if (this.controlsEnabled && !this.placementType) container.setScale(1.025);
    });
    container.on('pointerout', () => {
      if (!constructing || this.controlsEnabled) container.setScale(1);
    });
    this.buildings.push(building);
    if (!this.state.buildings.some((saved) => saved.id === data.id)) this.state.buildings.push(data);
    return building;
  }

  private createBuildingVisual(type: BuildType, x: number, y: number, upgraded: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    if (type === 'rice-field') {
      const shadow = this.add.ellipse(0, 14, 158, 67, 0x081710, 0.38);
      const bank = this.add.rectangle(0, 0, 145, 62, 0x73633b).setStrokeStyle(5, 0x4a432a);
      const water = this.add.rectangle(0, -2, 130, 47, 0x668f82, 0.88).setName('field-water');
      const seedlings: Phaser.GameObjects.GameObject[] = [];
      for (let row = -2; row <= 2; row += 1) {
        const line = this.add.line(0, row * 9 - 2, -58, 0, 58, 0, 0xa8bd67, 0.72).setLineWidth(2);
        seedlings.push(line);
        for (let column = -2; column <= 2; column += 1) {
          seedlings.push(this.add.triangle(column * 23, row * 9 - 4, -3, 5, 0, -5, 3, 5, 0xc9b95b));
        }
      }
      const label = this.add.text(0, 46, 'RUỘNG LÚA NƯỚC · +15/10s', this.nodeLabelStyle()).setOrigin(0.5);
      container.add([shadow, bank, water, ...seedlings, label]);
      return container;
    }

    if (type === 'barracks') {
      const shadow = this.add.ellipse(0, 24, 174, 58, 0x081710, 0.48);
      const yard = this.add.rectangle(0, 7, 124, 54, 0x69513a).setStrokeStyle(3, 0x382b22);
      const posts: Phaser.GameObjects.GameObject[] = [];
      for (let index = -3; index <= 3; index += 1) {
        posts.push(this.add.rectangle(index * 20, -7, 7, 57, 0x5a3a28).setStrokeStyle(1, 0x2f231d));
      }
      const roof = this.add.polygon(0, -31, [-76, 14, -47, -23, 0, -44, 47, -23, 76, 14], 0x74402f).setStrokeStyle(3, 0xbd8149);
      const banner = this.add.rectangle(0, -60, 19, 28, 0x8e3027).setStrokeStyle(1, 0xd4a153);
      const spear = this.add.rectangle(0, -55, 3, 51, 0xd2aa62);
      const label = this.add.text(0, 62, 'TRẠI LẠC QUÂN', this.nodeLabelStyle()).setOrigin(0.5);
      container.add([shadow, yard, ...posts, roof, spear, banner, label]);
      return container;
    }

    const house = type === 'house';
    const shadow = this.add.ellipse(0, 23, house ? 130 : 168, house ? 43 : 57, 0x081710, 0.48);
    const platform = this.add.rectangle(0, 9, house ? 92 : 124, house ? 36 : 48, upgraded ? 0x815637 : 0x69462f).setStrokeStyle(2, 0x3d2b20);
    const postLeft = this.add.rectangle(house ? -31 : -45, 33, 7, 36, 0x4b3426);
    const postRight = this.add.rectangle(house ? 31 : 45, 33, 7, 36, 0x4b3426);
    const roofColor = upgraded ? 0xb56b3c : type === 'chief' ? 0x8e4a33 : 0x76502f;
    const roof = this.add.polygon(0, -22, house
      ? [-64, 16, -43, -22, 0, -42, 43, -22, 64, 16]
      : [-86, 21, -57, -30, 0, -57, 57, -30, 86, 21], roofColor).setStrokeStyle(3, upgraded ? 0xd7ac5b : 0x3d291f);
    const roofLine = this.add.line(0, -22, house ? -45 : -61, 7, house ? 45 : 61, 7, 0xe0bd70, upgraded ? 0.9 : 0.45).setLineWidth(2);
    const door = this.add.rectangle(0, 12, house ? 18 : 25, house ? 31 : 41, 0x2b201b);
    const drum = type === 'chief' ? this.add.ellipse(0, 5, upgraded ? 37 : 27, upgraded ? 22 : 17, upgraded ? 0xc28a42 : 0x8c6b45).setStrokeStyle(2, 0xe1bd67) : null;
    const label = this.add.text(0, house ? 59 : 70, upgraded ? 'ĐỀN HÙNG · ĐỜI I' : house ? 'NHÀ SÀN' : 'LỀU TRƯỞNG BẢN', this.nodeLabelStyle()).setOrigin(0.5);
    container.add([shadow, postLeft, postRight, platform, door, roof, roofLine]);
    if (drum) container.add(drum);
    container.add(label);
    return container;
  }

  private isValidBuildingPosition(x: number, y: number): boolean {
    if (x < 220 || x > 1470 || y < 360 || y > 1190) return false;
    if (this.resourceNodes.some((node) => Phaser.Math.Distance.Between(x, y, node.x, node.y) < 150)) return false;
    if (this.buildings.some((building) => Phaser.Math.Distance.Between(x, y, building.data.x, building.data.y) < 155)) return false;
    if (this.units.size > 0 && [...this.units.values()].some((unit) => Phaser.Math.Distance.Between(x, y, unit.container.x, unit.container.y) < 80)) return false;
    return true;
  }

  private cancelPlacement(): void {
    this.placementGhost?.destroy(true);
    this.placementGhost = null;
    this.placementType = null;
    document.querySelector('#placing-banner')?.classList.remove('is-visible');
  }

  private handleBuildComplete(type: BuildType): void {
    this.gameAudio.drum();
    if (type === 'house') {
      this.state.population = Math.max(this.state.population, 4);
      this.state.populationCap += this.state.populationCap < 12 ? 6 : 4;
      this.ensureVillagers();
      this.updateResourcesHud();
      if (this.state.level === 0) {
        this.setTutorial('boss-warning');
        showToast('Nhà Sàn hoàn thành', 'Hai Lạc Dân đã gia nhập xóm mới.', '⌂');
        this.time.delayedCall(1000, () => this.spawnBoss(false));
      } else {
        showToast('Nhà Sàn hoàn thành', 'Giới hạn dân số đã được mở rộng.', '⌂');
        void this.saveGame();
      }
      return;
    }
    if (type === 'chief') {
      this.setTutorial('upgrade');
      showToast('Lều Trưởng Bản hoàn thành', 'Đã sẵn sàng tiến vào đời Hùng Quốc Vương.', '♜');
      return;
    }
    if (type === 'rice-field') {
      const field = this.buildings.filter((building) => building.data.type === 'rice-field').at(-1);
      if (field) this.applyDroughtVisual(field);
      this.cameras.main.shake(420, 0.004);
      this.setTutorial('level1-drought');
      showToast('Hạn hán ập tới!', 'Ruộng vừa khai mở đã khô cạn. Hãy gọi Thần Nông.', '☀');
      return;
    }
    this.setTutorial('level1-train-warrior');
    const barracks = this.buildings.filter((building) => building.data.type === 'barracks').at(-1);
    if (barracks) this.selectBuilding(barracks);
    showToast('Trại Lạc Quân hoàn thành', 'Trại đã mở. Chọn Chiến binh Rìu Đồng để huấn luyện.', '⚑');
  }

  private spawnBoss(restored: boolean): void {
    if (this.boss) return;
    document.body.classList.add('boss-active');
    const x = restored ? 1395 : 1530;
    const y = 705;
    const container = this.add.container(x, y).setDepth(y + 40);
    const shadow = this.add.ellipse(0, 22, 112, 38, 0x07140f, 0.55);
    const tail = this.add.triangle(-48, 4, -38, -15, -78, 18, -24, 23, 0x426b61).setStrokeStyle(3, 0x18362f);
    const body = this.add.ellipse(0, -1, 105, 59, 0x315f58).setStrokeStyle(3, 0x173d36);
    const belly = this.add.ellipse(5, 8, 70, 28, 0x5f8068, 0.72);
    const jaw = this.add.polygon(48, -1, [-8, -18, 34, -10, 49, 4, 30, 17, -8, 14], 0x3f7167).setStrokeStyle(2, 0x17352f);
    const eye = this.add.circle(60, -9, 5, 0xe24c32);
    const teeth = this.add.triangle(68, 2, -5, -3, 5, -3, 0, 6, 0xf0e6c9);
    const healthBack = this.add.rectangle(0, -57, 112, 8, 0x281c19).setStrokeStyle(1, 0xd4bd8a, 0.45);
    const healthFill = this.add.rectangle(-55, -57, 108, 5, 0xb74436).setOrigin(0, 0.5);
    const label = this.add.text(0, -77, 'NGƯ TINH · THỦY QUÁI', {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#efc9a9', backgroundColor: '#421f1ccc', padding: { x: 6, y: 3 },
    }).setOrigin(0.5);
    container.add([shadow, tail, body, belly, jaw, eye, teeth, healthBack, healthFill, label]);
    this.boss = { container, health: 120, maxHealth: 120, healthFill, attacking: false };
    this.cameras.main.shake(520, 0.006);
    this.gameAudio.drum();

    if (!restored) {
      this.tweens.add({
        targets: container,
        x: 1395,
        duration: 1750,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.setTutorial('fight-boss');
          showToast('Ngư Tinh xuất hiện!', 'Điều Lạc Long Quân tới bảo vệ dân làng.', '⚔');
        },
      });
    } else {
      this.setTutorial('fight-boss', false);
    }
  }

  private attackBoss(unit: UnitModel): void {
    if (!this.boss || this.boss.attacking) return;
    this.boss.attacking = true;
    unit.busy = true;
    this.moveUnit(unit, this.boss.container.x - 82, this.boss.container.y + 18, () => {
      [0, 700, 1400].forEach((delay, index) => {
        this.time.delayedCall(delay, () => {
          if (!this.boss) return;
          this.gameAudio.hit(150 - index * 18);
          this.cameras.main.shake(120, 0.003 + index * 0.001);
          this.boss.health = Math.max(0, this.boss.health - 40);
          this.boss.healthFill.setScale(this.boss.health / this.boss.maxHealth, 1);
          this.boss.container.setScale(1.06);
          this.time.delayedCall(100, () => this.boss?.container.setScale(1));
          this.floatText(this.boss.container.x, this.boss.container.y - 92, '-40 LONG UY', '#ef795d');
          if (this.boss.health <= 0) this.defeatBoss(unit);
        });
      });
    });
  }

  private defeatBoss(unit: UnitModel): void {
    const defeated = this.boss;
    if (!defeated) return;
    this.boss = null;
    unit.busy = false;
    document.body.classList.remove('boss-active');
    this.tweens.add({
      targets: defeated.container,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: 700,
      onComplete: () => defeated.container.destroy(true),
    });
    this.addResource('stone', 100);
    this.addResource('bronze', 100);
    this.floatText(1395, 630, '+100 Đá  ·  +100 Đồng', '#edc76e');
    this.setTutorial('build-chief');
    this.gameAudio.chime();
    showToast('Ngư Tinh đã bị khuất phục', 'Thu được 100 Đá và 100 Đồng thau.', '✦');
  }

  private upgradeEra(): void {
    if (this.state.tutorialStage !== 'upgrade' || !this.canAfford(BUILD_COSTS.upgrade)) {
      if (this.state.tutorialStage === 'upgrade') showToast('Chưa đủ tài nguyên', 'Cần 50 Lúa, 20 Đá và 80 Đồng.', '!');
      return;
    }
    const chief = this.buildings.find((building) => building.data.type === 'chief');
    if (!chief) return;
    this.spendResources(BUILD_COSTS.upgrade);
    this.controlsEnabled = false;
    this.cameras.main.pan(chief.data.x, chief.data.y, 700, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1.18, 700);
    this.gameAudio.drum();

    const beam = this.add.rectangle(chief.data.x, chief.data.y - 130, 62, 330, 0xf4d47d, 0.14).setDepth(chief.data.y + 100).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: beam, alpha: 0.65, scaleX: 1.7, yoyo: true, duration: 720, onComplete: () => beam.destroy() });
    this.time.delayedCall(700, () => {
      const { x, y, id } = chief.data;
      chief.container.destroy(true);
      this.buildings = this.buildings.filter((building) => building !== chief);
      this.state.buildings = this.state.buildings.filter((building) => building.id !== id);
      this.createBuilding({ id, type: 'chief', x, y, upgraded: true }, false);
      this.state.level = 1;
      this.state.tutorialStage = 'complete';
      this.createCelebration(x, y);
      this.updateAllHud();
      void this.saveGame();
      this.time.delayedCall(620, () => this.showVictoryModal());
    });
  }

  private showVictoryModal(): void {
    showModal({
      eyebrow: 'CHÚC MỪNG · THỜI ĐẠI MỚI',
      title: 'Hùng Quốc Vương',
      seal: 'Ⅰ',
      body:
        '<p>Ánh trống đồng đã vang trên miền đất mới. Bạn đã hoàn thành chương mở đầu và đặt nền móng đầu tiên cho <strong>Văn Lang</strong>.</p><div class="unlock"><span>MỞ KHÓA · THẦN NÔNG</span><span>RUỘNG LÚA NƯỚC</span></div><p>Món quà khởi nguyên đang chờ người dựng nước.</p>',
      actions: [
        {
          label: this.state.originGiftClaimed ? 'Tiếp tục khám phá' : 'Nhận 500 Vàng',
          onClick: () => {
            if (!this.state.originGiftClaimed) {
              this.state.originGiftClaimed = true;
              this.addResource('gold', 500);
              showToast('Món quà khởi nguyên', '+500 Vàng đã được đưa vào kho.', '✦');
            }
            hideModal();
            this.cameras.main.zoomTo(0.92, 850);
            this.time.delayedCall(260, () => this.beginLevelOne(true));
          },
        },
      ],
    });
  }

  private beginLevelOne(showIntro: boolean): void {
    if (!this.state.campaignStarted) {
      this.state.campaignStarted = true;
      this.state.resources.food += 60;
      this.state.resources.wood += 120;
      this.state.resources.stone += 80;
      this.state.resources.bronze += 40;
      this.updateResourcesHud();
    }
    this.createThanNong();
    this.setTutorial('level1-build-field');
    this.controlsEnabled = !showIntro;
    if (!showIntro) return;

    showModal({
      eyebrow: 'ĐỜI I · HÙNG QUỐC VƯƠNG',
      title: 'Nền nông nghiệp đầu tiên',
      seal: 'Ⅰ',
      body: '<p>Thần Nông mang tới giống lúa và nông lịch. Hãy biến vùng đất ven sông thành <strong>Ruộng Lúa Nước</strong>, nguồn sống bền vững cho người Lạc Việt.</p><div class="unlock"><span>VẬT TƯ · 60 LÚA</span><span>120 GỖ · 80 ĐÁ · 40 ĐỒNG</span></div>',
      actions: [{
        label: 'Khai mở ruộng nước',
        onClick: () => {
          hideModal();
          this.controlsEnabled = true;
          this.gameAudio.chime();
        },
      }],
    });
  }

  private applyDroughtVisual(field: BuildingModel): void {
    if (field.container.getByName('drought-overlay')) return;
    this.state.droughtResolved = false;
    const water = field.container.getByName('field-water') as Phaser.GameObjects.Rectangle | null;
    water?.setFillStyle(0x8b6d43, 0.9);
    const overlay = this.add.rectangle(0, -2, 132, 49, 0x9b6335, 0.42).setName('drought-overlay');
    const cracks = this.add.text(0, -2, '╱  ╲  ╱  ╲', {
      fontFamily: 'Georgia, serif', fontSize: '19px', color: '#583b28',
    }).setOrigin(0.5).setName('drought-cracks');
    field.container.add([overlay, cracks]);
  }

  private callRain(): void {
    if (this.state.tutorialStage !== 'level1-drought') return;
    const field = this.buildings.find((building) => building.data.type === 'rice-field');
    if (!field) return;
    this.controlsEnabled = false;
    this.gameAudio.drum();
    for (let index = 0; index < 28; index += 1) {
      const rain = this.add.line(field.data.x - 90 + (index % 14) * 14, field.data.y - 130 - Math.floor(index / 14) * 50, 0, 0, -8, 28, 0x8ed4dc, 0.8)
        .setLineWidth(2).setDepth(field.data.y + 150);
      this.tweens.add({
        targets: rain, y: field.data.y + 40, alpha: 0, duration: 620 + (index % 5) * 85,
        delay: (index % 7) * 40, onComplete: () => rain.destroy(),
      });
    }
    this.time.delayedCall(900, () => {
      field.container.getByName('drought-overlay')?.destroy();
      field.container.getByName('drought-cracks')?.destroy();
      const water = field.container.getByName('field-water') as Phaser.GameObjects.Rectangle | null;
      water?.setFillStyle(0x668f82, 0.9);
      this.state.droughtResolved = true;
      this.controlsEnabled = true;
      this.setTutorial('level1-build-barracks');
      showToast('Mưa lành đã tới', 'Ruộng hoạt động trở lại: +15 Lúa mỗi 10 giây.', '☂');
      this.gameAudio.chime();
    });
  }

  private tickRiceProduction(): void {
    if (!this.state.droughtResolved || !this.buildings.some((building) => building.data.type === 'rice-field')) return;
    this.state.resources.food += 3;
    this.productionTicks += 1;
    this.updateResourcesHud();
    if (this.productionTicks % 5 === 0) {
      const field = this.buildings.find((building) => building.data.type === 'rice-field');
      if (field) this.floatText(field.data.x, field.data.y - 70, '+15 Lúa / 10s', RESOURCE_META.food.color);
      void this.saveGame();
    }
  }

  private trainUnit(type: SavedUnit['type']): void {
    const warrior = type === 'lac-quan';
    const stage = this.state.tutorialStage;
    const barracks = this.selectedBuilding?.data.type === 'barracks' ? this.selectedBuilding : null;
    const stageAllowsTraining = ['level1-train-warrior', 'level2-train-archer', 'level2-complete'].includes(stage);
    const unitUnlocked = warrior ? this.state.level >= 1 : this.state.level >= 2;
    if (!this.controlsEnabled || !barracks || !stageAllowsTraining || !unitUnlocked) {
      showToast('Hãy mở Trại Lạc Quân', 'Nhấp chuột trái vào Trại Lạc Quân để mở bảng huấn luyện.', '⚑');
      return;
    }
    if (this.state.population >= this.state.populationCap) {
      showToast('Đã đạt giới hạn dân số', 'Hãy xây thêm Nhà Sàn trước khi huấn luyện binh lính.', '!');
      return;
    }
    const cost = warrior ? BUILD_COSTS.warrior : BUILD_COSTS.archer;
    if (!this.canAfford(cost)) {
      showToast('Chưa đủ tài nguyên', warrior ? 'Cần 60 Lúa và 20 Đồng.' : 'Cần 40 Lúa và 40 Gỗ.', '!');
      return;
    }
    const progressesQuest = (warrior && stage === 'level1-train-warrior') || (!warrior && stage === 'level2-train-archer');
    this.spendResources(cost);
    this.controlsEnabled = false;
    this.syncActionButtons();
    showToast('Đang huấn luyện', warrior ? 'Chiến binh Rìu Đồng sắp xuất trận.' : 'Xạ thủ đang thử dây nỏ tre.', '⚑');
    this.time.delayedCall(2200, () => {
      const saved: SavedUnit = {
        id: `${type}-${Date.now()}`,
        type,
        x: barracks.data.x + (warrior ? -58 : 58),
        y: barracks.data.y + 72,
      };
      this.state.trainedUnits.push(saved);
      const unit = this.createTrainedUnit(saved);
      this.state.population += 1;
      this.controlsEnabled = true;
      this.updateResourcesHud();
      this.selectUnit(unit);
      this.gameAudio.drum();
      if (!progressesQuest) {
        showToast('Huấn luyện hoàn tất', `${unit.name} đã gia nhập đội quân.`, warrior ? '⚔' : '➶');
        void this.saveGame();
        return;
      }
      if (warrior) {
        this.setTutorial('level1-complete');
        this.time.delayedCall(450, () => this.showLevelOneComplete());
      } else {
        this.setTutorial('level2-tribe-choice');
        this.revealNeutralCamp();
        this.time.delayedCall(1150, () => this.showTribeChoice());
      }
    });
  }

  private showLevelOneComplete(): void {
    this.controlsEnabled = false;
    showModal({
      eyebrow: 'HOÀN THÀNH ĐỜI I',
      title: 'Mùa vàng bên sông Hồng',
      seal: 'Ⅰ',
      body: '<p>Hạn hán đã qua. Ruộng nước và đội Lạc Quân tạo nên nền móng để Văn Lang tiến ra ngoài xóm làng đầu tiên.</p><div class="unlock"><span>MỞ KHÓA · LẠC HẦU</span><span>XẠ THỦ NỎ TRE</span></div>',
      actions: [{
        label: 'Tiến vào đời II',
        onClick: () => {
          hideModal();
          this.beginLevelTwo();
        },
      }],
    });
  }

  private beginLevelTwo(): void {
    this.state.level = 2;
    this.state.resources.food += 120;
    this.state.resources.wood += 100;
    this.createLacHau();
    this.createNeutralCamp(false);
    this.setTutorial('level2-train-archer');
    this.updateResourcesHud();
    this.controlsEnabled = false;
    showModal({
      eyebrow: 'ĐỜI II · HÙNG HY VƯƠNG',
      title: 'Mở rộng bờ cõi',
      seal: 'Ⅱ',
      body: '<p>Lạc Hầu báo tin có khói bếp sau màn sương phía tây. Hãy lập một đội <strong>Xạ thủ Nỏ Tre</strong> trước khi thám sát bộ lạc lân cận.</p><div class="unlock"><span>VIỆN TRỢ · 120 LÚA</span><span>100 GỖ</span></div>',
      actions: [{
        label: 'Chuẩn bị thám sát',
        onClick: () => {
          hideModal();
          this.controlsEnabled = true;
          void this.saveGame();
        },
      }],
    });
  }

  private createNeutralCamp(revealed: boolean): void {
    if (this.tribeCamp) {
      if (revealed) this.revealNeutralCamp(false);
      return;
    }
    const x = 430;
    const y = 390;
    const container = this.add.container(x, y).setDepth(y + 2);
    const shadow = this.add.ellipse(0, 30, 210, 80, 0x07140f, 0.48);
    const fire = this.add.circle(0, 20, 12, 0xe8923f);
    const fireCore = this.add.circle(0, 22, 5, 0xffd26a);
    const tentLeft = this.add.polygon(-58, 0, [-50, 35, 0, -37, 50, 35], 0x795039).setStrokeStyle(3, 0x3d2d24);
    const tentRight = this.add.polygon(67, 6, [-39, 28, 0, -30, 39, 28], 0x654936).setStrokeStyle(3, 0x34271f);
    const flagPole = this.add.rectangle(-98, -21, 4, 82, 0x9c7647);
    const flag = this.add.triangle(-79, -52, -19, -13, 22, 0, -19, 13, 0x8e3027);
    const label = this.add.text(0, 66, 'BỘ LẠC VŨ NINH · TRUNG LẬP', this.nodeLabelStyle()).setOrigin(0.5);
    container.add([shadow, tentLeft, tentRight, fire, fireCore, flagPole, flag, label]);
    this.tweens.add({ targets: fire, scale: 1.22, alpha: 0.64, duration: 420, yoyo: true, repeat: -1 });
    this.tribeCamp = container;

    const fogChildren: Phaser.GameObjects.GameObject[] = [];
    for (let row = -2; row <= 2; row += 1) {
      for (let column = -2; column <= 2; column += 1) {
        fogChildren.push(this.add.circle(column * 58, row * 42, 78, 0x0a1714, 0.91));
      }
    }
    const fogLabel = this.add.text(0, 0, 'VÙNG CHƯA KHÁM PHÁ', {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#708078', letterSpacing: 2,
    }).setOrigin(0.5);
    fogChildren.push(fogLabel);
    this.tribeFog = this.add.container(x, y, fogChildren).setDepth(y + 180);
    if (revealed) this.tribeFog.setVisible(false);
  }

  private revealNeutralCamp(animate = true): void {
    this.createNeutralCamp(false);
    if (!this.tribeFog) return;
    this.cameras.main.pan(470, 430, animate ? 950 : 0, 'Sine.easeInOut');
    if (animate) {
      this.tweens.add({
        targets: this.tribeFog, alpha: 0, scaleX: 1.25, scaleY: 1.25, duration: 1050,
        onComplete: () => this.tribeFog?.setVisible(false),
      });
      showToast('Đã khám phá Vũ Ninh', 'Một bộ lạc trung lập xuất hiện sau màn sương.', '⌖');
    } else {
      this.tribeFog.setVisible(false);
    }
  }

  private showTribeChoice(): void {
    if (this.state.tutorialStage !== 'level2-tribe-choice') return;
    this.controlsEnabled = false;
    showModal({
      eyebrow: 'QUYẾT SÁCH · BỘ LẠC VŨ NINH',
      title: 'Kết giao hay chinh phạt?',
      seal: '◇',
      body: '<p><strong>Kết minh</strong> tốn 50 Lúa và 50 Vàng, đổi lại Vũ Ninh cống nạp Đồng. <strong>Chinh phạt</strong> cần Lạc Quân đánh bại thủ lĩnh, đổi lại chiến lợi phẩm lớn hơn.</p>',
      actions: [
        {
          label: 'Kết minh · 50 Lúa + 50 Vàng',
          kind: 'secondary',
          onClick: () => {
            this.spendResources(BUILD_COSTS.diplomacy);
            this.state.tribeOutcome = 'diplomacy';
            hideModal();
            this.finishLevelTwo('diplomacy');
          },
        },
        {
          label: 'Chọn chinh phạt',
          onClick: () => {
            hideModal();
            this.controlsEnabled = true;
            this.setTutorial('level2-conquest');
            this.spawnTribeChief();
          },
        },
      ],
    });
  }

  private spawnTribeChief(): void {
    if (this.tribeChief) return;
    this.revealNeutralCamp(false);
    const x = 565;
    const y = 440;
    const container = this.add.container(x, y).setDepth(y + 60);
    const shadow = this.add.ellipse(0, 19, 70, 25, 0x07140f, 0.5);
    const legs = this.add.rectangle(0, 5, 22, 36, 0x382821);
    const body = this.add.ellipse(0, -20, 44, 56, 0x6f3430).setStrokeStyle(3, 0xd1a354);
    const head = this.add.circle(0, -57, 16, 0xb87959).setStrokeStyle(2, 0x3d271f);
    const plume = this.add.triangle(0, -88, -17, 22, 0, -14, 17, 22, 0xd0a050);
    const spear = this.add.rectangle(29, -18, 5, 92, 0xb58b54).setRotation(-0.13);
    const healthBack = this.add.rectangle(0, -106, 116, 8, 0x281c19).setStrokeStyle(1, 0xd4bd8a, 0.45);
    const healthFill = this.add.rectangle(-57, -106, 112, 5, 0xb74436).setOrigin(0, 0.5);
    const label = this.add.text(0, -125, 'THỦ LĨNH VŨ NINH', {
      fontFamily: 'Arial, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#efc9a9', backgroundColor: '#421f1ccc', padding: { x: 6, y: 3 },
    }).setOrigin(0.5);
    container.add([shadow, legs, spear, body, head, plume, healthBack, healthFill, label]);
    this.tribeChief = { container, health: 160, maxHealth: 160, healthFill, attacking: false };
    document.body.classList.add('boss-active');
    this.cameras.main.shake(330, 0.004);
    this.updateGuide();
  }

  private attackTribeChief(unit: UnitModel): void {
    const chief = this.tribeChief;
    if (!chief || chief.attacking) return;
    chief.attacking = true;
    unit.busy = true;
    this.moveUnit(unit, chief.container.x - 72, chief.container.y + 24, () => {
      const hits = Math.ceil(chief.maxHealth / unit.combatDamage);
      for (let index = 0; index < hits; index += 1) {
        this.time.delayedCall(index * 520, () => {
          if (!this.tribeChief) return;
          this.gameAudio.hit(165 - index * 5);
          this.tribeChief.health = Math.max(0, this.tribeChief.health - unit.combatDamage);
          this.tribeChief.healthFill.setScale(this.tribeChief.health / this.tribeChief.maxHealth, 1);
          this.tribeChief.container.setScale(1.05);
          this.time.delayedCall(90, () => this.tribeChief?.container.setScale(1));
          this.floatText(chief.container.x, chief.container.y - 132, `-${unit.combatDamage}`, '#ef795d');
          if (this.tribeChief.health <= 0) this.defeatTribeChief(unit);
        });
      }
    });
  }

  private defeatTribeChief(unit: UnitModel): void {
    const chief = this.tribeChief;
    if (!chief) return;
    this.tribeChief = null;
    unit.busy = false;
    document.body.classList.remove('boss-active');
    this.tweens.add({ targets: chief.container, alpha: 0, y: chief.container.y + 20, duration: 600, onComplete: () => chief.container.destroy(true) });
    this.state.tribeOutcome = 'conquest';
    this.finishLevelTwo('conquest');
  }

  private finishLevelTwo(outcome: 'diplomacy' | 'conquest'): void {
    if (outcome === 'diplomacy') {
      this.state.resources.bronze += 80;
    } else {
      this.state.resources.gold += 150;
      this.state.resources.bronze += 40;
    }
    this.setTutorial('level2-complete');
    this.updateResourcesHud();
    this.controlsEnabled = false;
    const title = outcome === 'diplomacy' ? 'Vũ Ninh nguyện kết minh' : 'Vũ Ninh đã quy phục';
    const reward = outcome === 'diplomacy' ? '+80 Đồng cống nạp' : '+150 Vàng · +40 Đồng chiến lợi phẩm';
    showModal({
      eyebrow: 'HOÀN THÀNH ĐỜI II · HÙNG HY VƯƠNG',
      title,
      seal: 'Ⅱ',
      body: `<p>Bộ lạc Vũ Ninh trở thành chư hầu đầu tiên. Bờ cõi Văn Lang đã vượt ra ngoài xóm làng khởi nguyên.</p><div class="unlock"><span>${reward}</span><span>DANH HIỆU · NGƯỜI MỞ CÕI</span></div>`,
      actions: [{
        label: 'Tiếp tục xây dựng',
        onClick: () => {
          hideModal();
          this.controlsEnabled = true;
          this.cameras.main.pan(930, 700, 900, 'Sine.easeInOut');
          void this.saveGame();
        },
      }],
    });
  }

  private createCelebration(x: number, y: number): void {
    this.gameAudio.drum();
    this.time.delayedCall(240, () => this.gameAudio.drum());
    for (let index = 0; index < 42; index += 1) {
      const color = index % 3 === 0 ? 0xe7c467 : index % 3 === 1 ? 0xb64732 : 0x7fa65b;
      const particle = this.add.circle(x, y - 70, 2 + (index % 3), color).setDepth(y + 200);
      const angle = (index / 42) * Math.PI * 2;
      const distance = 90 + (index % 8) * 18;
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y - 90 + Math.sin(angle) * distance * 0.65,
        alpha: 0,
        duration: 950 + (index % 5) * 150,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private openRitual(): void {
    if (this.ritualUsed) {
      showToast('Thần linh đang nghỉ', 'Phúc lành thử nghiệm chỉ nhận một lần trong phiên chơi.', '✦');
      return;
    }
    const previousControls = this.controlsEnabled;
    this.controlsEnabled = false;
    showModal({
      eyebrow: 'ĐÀN TẾ TRỜI ĐẤT · REWARDED DEMO',
      title: 'Cầu phúc thần linh',
      seal: '✦',
      body:
        '<p>Bản prototype chưa kết nối mạng quảng cáo thật. Nút này mô phỏng điểm tích hợp <strong>Rewarded Video</strong>: game tạm dừng, xác nhận hoàn tất rồi mới trao thưởng.</p><div class="unlock"><span>PHÚC LÀNH · +50 LÚA</span></div>',
      actions: [
        {
          label: 'Nhận phúc lành (demo)',
          onClick: () => {
            this.ritualUsed = true;
            this.addResource('food', 50);
            hideModal();
            this.controlsEnabled = previousControls;
            showToast('Nghi lễ hoàn tất', '+50 Lúa đã được ban cho dân làng.', '✦');
          },
        },
      ],
    });
  }

  private setTutorial(stage: TutorialStage, persist = true): void {
    this.state.tutorialStage = stage;
    const copy = TUTORIAL_COPY[stage];
    text('#tutorial-eyebrow', copy.eyebrow.toUpperCase());
    text('#tutorial-title', copy.title);
    text('#tutorial-body', copy.body);
    text('#tutorial-hint', copy.hint);
    const percent = Math.round((copy.step / (copy.total ?? 8)) * 100);
    text('#tutorial-percent', `${percent}%`);
    const tutorialBar = document.querySelector<HTMLElement>('#tutorial-bar');
    if (tutorialBar) tutorialBar.style.width = `${percent}%`;
    this.updateEraHud();
    this.syncActionButtons();
    this.updateGuide();
    if (persist) void this.saveGame();
  }

  private updateAllHud(): void {
    this.updateResourcesHud();
    this.setTutorial(this.state.tutorialStage, false);
  }

  private updateResourcesHud(): void {
    (Object.keys(RESOURCE_META) as ResourceKey[]).forEach((key) => text(`#resource-${key}`, Math.floor(this.state.resources[key]).toLocaleString('vi-VN')));
    text('#population', `${this.state.population} / ${this.state.populationCap}`);
    this.syncActionButtons();
  }

  private updateEraHud(): void {
    if (this.state.level >= 2) {
      text('#era-kicker', 'ĐỜI THỨ II · HÙNG HY VƯƠNG');
      text('#era-title', this.state.tutorialStage === 'level2-complete' ? 'Chư hầu Vũ Ninh' : 'Mở rộng bờ cõi');
    } else if (this.state.level >= 1) {
      text('#era-kicker', 'ĐỜI THỨ I · HÙNG QUỐC VƯƠNG');
      text('#era-title', 'Nền móng nước Văn Lang');
    } else {
      text('#era-kicker', 'KHỞI ĐẦU · KINH DƯƠNG VƯƠNG');
      text('#era-title', 'Miền đất bên sông Hồng');
    }
    const copy = TUTORIAL_COPY[this.state.tutorialStage];
    const progress = document.querySelector<HTMLElement>('#era-progress');
    if (progress) progress.style.width = `${Math.max(3, (copy.step / (copy.total ?? 8)) * 100)}%`;
  }

  private syncActionButtons(): void {
    const stage = this.state.tutorialStage;
    const campaign = this.state.campaignStarted;
    const grid = document.querySelector('.action-grid');
    grid?.classList.toggle('is-campaign', campaign);
    const barracksOpen = this.selectedBuilding?.data.type === 'barracks';
    text('#action-context', barracksOpen ? 'TRẠI LẠC QUÂN' : campaign ? (this.state.level >= 2 ? 'ĐỜI II · QUÂN SỰ' : 'ĐỜI I · NÔNG NGHIỆP') : 'XÂY DỰNG');

    const configure = (selector: string, visible: boolean, enabled: boolean): void => {
      const button = document.querySelector<HTMLButtonElement>(selector);
      if (!button) return;
      button.hidden = !visible;
      button.disabled = !enabled;
    };

    configure('#build-house', !campaign || stage === 'level2-complete', (stage === 'build-house' || stage === 'level2-complete') && this.canAfford(BUILD_COSTS.house));
    configure('#build-chief', !campaign, stage === 'build-chief' && this.canAfford(BUILD_COSTS.chief));
    configure('#upgrade-era', !campaign, stage === 'upgrade' && this.canAfford(BUILD_COSTS.upgrade));
    configure('#build-field', stage === 'level1-build-field', stage === 'level1-build-field' && this.canAfford(BUILD_COSTS['rice-field']));
    configure('#call-rain', stage === 'level1-drought', stage === 'level1-drought');
    configure('#build-barracks', stage === 'level1-build-barracks', stage === 'level1-build-barracks' && this.canAfford(BUILD_COSTS.barracks));
    const trainingStage = ['level1-train-warrior', 'level2-train-archer', 'level2-complete'].includes(stage);
    configure('#train-warrior', Boolean(barracksOpen && trainingStage && this.state.level >= 1), Boolean(this.controlsEnabled));
    configure('#train-archer', Boolean(barracksOpen && trainingStage && this.state.level >= 2), Boolean(this.controlsEnabled));
  }

  private addResource(key: ResourceKey, amount: number, persist = true): void {
    this.state.resources[key] += amount;
    this.updateResourcesHud();
    if (persist) void this.saveGame();
  }

  private canAfford(cost: Partial<Resources> | Readonly<Partial<Resources>>): boolean {
    return (Object.entries(cost) as [ResourceKey, number][]).every(([key, value]) => this.state.resources[key] >= value);
  }

  private spendResources(cost: Partial<Resources> | Readonly<Partial<Resources>>): void {
    (Object.entries(cost) as [ResourceKey, number][]).forEach(([key, value]) => {
      this.state.resources[key] -= value;
    });
    this.updateResourcesHud();
  }

  private floatText(x: number, y: number, value: string, color: string): void {
    const label = this.add.text(x, y, value, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color,
      stroke: '#102019',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10_000);
    this.tweens.add({ targets: label, y: y - 42, alpha: 0, duration: 1250, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  private createGuideMarker(): void {
    const ring = this.add.ellipse(0, 0, 74, 34).setStrokeStyle(2, 0xf2cd6e, 0.9);
    const arrow = this.add.triangle(0, -47, -9, -13, 9, -13, 0, 4, 0xf2cd6e);
    const label = this.add.text(0, -74, 'MỤC TIÊU', {
      fontFamily: 'Arial, sans-serif', fontSize: '7px', fontStyle: 'bold', color: '#f5dc97', backgroundColor: '#44281dcc', padding: { x: 5, y: 3 },
    }).setOrigin(0.5);
    this.guideMarker = this.add.container(0, 0, [ring, arrow, label]).setDepth(20_000);
    this.tweens.add({ targets: arrow, y: -8, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private updateGuide(): void {
    if (!this.guideMarker) return;
    const stage = this.state.tutorialStage;
    let target: { x: number; y: number } | null = null;
    if (stage === 'select-au-co') target = this.units.get('au-co')?.container ?? null;
    if (stage === 'gather-rice') target = this.resourceNodes.find((node) => node.type === 'food') ?? null;
    if (stage === 'gather-wood') {
      target = this.selectedUnit?.id === 'lac-long-quan' ? this.resourceNodes.find((node) => node.type === 'wood') ?? null : this.units.get('lac-long-quan')?.container ?? null;
    }
    if (stage === 'fight-boss') target = this.selectedUnit?.id === 'lac-long-quan' ? this.boss?.container ?? null : this.units.get('lac-long-quan')?.container ?? null;
    if (stage === 'level1-drought') target = this.units.get('than-nong')?.container ?? null;
    if ((stage === 'level1-train-warrior' || stage === 'level2-train-archer') && this.selectedBuilding?.data.type !== 'barracks') {
      target = this.buildings.find((building) => building.data.type === 'barracks')?.container ?? null;
    }
    if (stage === 'level2-conquest') {
      const warrior = [...this.units.values()].find((unit) => unit.id.startsWith('lac-quan'));
      target = this.selectedUnit?.id.startsWith('lac-quan') ? this.tribeChief?.container ?? null : warrior?.container ?? null;
    }
    this.guideMarker.setVisible(Boolean(target));
    if (target) this.guideMarker.setPosition(target.x, target.y - 4);
  }

  private async saveGame(): Promise<void> {
    const status = document.querySelector<HTMLElement>('#save-status');
    if (status) status.innerHTML = '<i></i> Đang lưu…';
    const snapshot: SaveState = {
      ...this.state,
      savedAt: Date.now(),
      resources: { ...this.state.resources },
      buildings: this.state.buildings.map((building) => ({ ...building })),
      trainedUnits: this.state.trainedUnits.map((unit) => ({ ...unit })),
    };
    await this.saveManager.save(snapshot);
    this.state.savedAt = snapshot.savedAt;
    if (status) status.innerHTML = '<i></i> Đã lưu cục bộ';
  }

  private seededRandom(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }
}
