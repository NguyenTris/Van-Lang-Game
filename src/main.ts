import Phaser from 'phaser';
import './styles.css';
import { GameScene } from './game/scenes/GameScene';
import { SaveManager } from './game/save';
import { renderApp, showModal } from './ui';

const saveManager = new SaveManager();
const savedState = await saveManager.load();
renderApp(savedState);

let game: Phaser.Game | null = null;

async function launch(useSave: boolean): Promise<void> {
  const state = useSave ? await saveManager.load() : null;
  document.body.classList.add('game-active');
  document.querySelector('#landing')?.setAttribute('aria-hidden', 'true');
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#173329',
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
      powerPreference: 'high-performance',
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    input: {
      mouse: { preventDefaultWheel: true },
      touch: { capture: true },
    },
    scene: [new GameScene(saveManager, state)],
  });
}

document.querySelector('#start-game')?.addEventListener('click', () => void launch(Boolean(savedState)));
document.querySelector('#new-game')?.addEventListener('click', () => {
  showModal({
    eyebrow: 'BẮT ĐẦU LẠI',
    title: 'Xóa hành trình hiện tại?',
    body: '<p>Toàn bộ công trình và tài nguyên trong bản lưu trên thiết bị này sẽ bị xóa.</p>',
    seal: '↺',
    actions: [
      {
        label: 'Giữ lại',
        kind: 'secondary',
        onClick: () => document.querySelector('#modal')?.classList.remove('is-open'),
      },
      {
        label: 'Khai mở lại',
        onClick: async () => {
          await saveManager.clear();
          document.querySelector('#modal')?.classList.remove('is-open');
          await launch(false);
        },
      },
    ],
  });
});

window.addEventListener('beforeunload', () => game?.destroy(true));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
