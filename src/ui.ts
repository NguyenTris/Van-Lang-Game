import { RESOURCE_META, type ResourceKey, type SaveState } from './game/data';

export interface ModalAction {
  label: string;
  kind?: 'primary' | 'secondary';
  onClick: () => void;
}

export function renderApp(saved: SaveState | null): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing app root');

  const resourceItems = (Object.entries(RESOURCE_META) as [ResourceKey, (typeof RESOURCE_META)[ResourceKey]][])
    .map(
      ([key, meta]) => `
        <div class="resource" data-resource="${key}" title="${meta.label}">
          <span class="resource__icon" style="--resource-color:${meta.color}">${meta.icon}</span>
          <span><small>${meta.label}</small><strong id="resource-${key}">0</strong></span>
        </div>`,
    )
    .join('');

  const continueLabel = saved ? 'Tiếp tục dựng nước' : 'Bắt đầu khai mở';
  const saveCaption = saved
    ? `Bản lưu gần nhất · ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(saved.savedAt)}`
    : 'Không cần tài khoản · Tiến trình lưu trên trình duyệt';

  app.innerHTML = `
    <main id="landing" class="landing" aria-label="Màn hình bắt đầu">
      <div class="landing__veil"></div>
      <nav class="landing__nav">
        <div class="brand-mark"><span>VL</span><div><b>VĂN LANG</b><small>Dấu son hồng hoang</small></div></div>
        <div class="landing__status"><i></i> BẢN CHƠI THỬ · WEB RTS</div>
      </nav>
      <section class="landing__content">
        <p class="kicker"><span></span> HUYỀN SỬ VIỆT · CHIẾN THUẬT THỜI GIAN THỰC</p>
        <h1>VĂN LANG</h1>
        <h2>DẤU SON <em>HỒNG HOANG</em></h2>
        <p class="landing__lead">Từ bờ bãi sông Hồng, gây dựng cơ đồ người Lạc Việt.<br/>Khai ruộng, dựng làng và bảo vệ con dân trước những thế lực từ thuở hồng hoang.</p>
        <div class="landing__actions">
          <button id="start-game" class="button button--hero"><span>${continueLabel}</span><b>→</b></button>
          ${saved ? '<button id="new-game" class="button button--ghost">Chơi lại từ đầu</button>' : ''}
        </div>
        <p class="save-caption"><span>◆</span> ${saveCaption}</p>
      </section>
      <aside class="landing__features" aria-label="Tính năng nổi bật">
        <div><strong>01</strong><span><b>KHỞI NGUYÊN</b><small>Lạc Long Quân & Âu Cơ</small></span></div>
        <div><strong>02</strong><span><b>DỰNG NƯỚC</b><small>Thu thập · Xây dựng</small></span></div>
        <div><strong>03</strong><span><b>GIỮ NƯỚC</b><small>Thần thoại · Ngoại xâm</small></span></div>
      </aside>
      <p class="art-credit">Hình ảnh minh họa tạo riêng cho dự án · Nội dung đang trong giai đoạn prototype</p>
    </main>

    <main id="game-shell" class="game-shell" aria-label="Văn Lang RTS">
      <div id="game-container"></div>
      <header class="hud-top">
        <div class="hud-top__resources">${resourceItems}<div class="population"><span>♟</span><span><small>Dân số</small><strong id="population">2 / 6</strong></span></div></div>
        <div class="era-crest">
          <small id="era-kicker">KHỞI ĐẦU · KINH DƯƠNG VƯƠNG</small>
          <strong id="era-title">Miền đất bên sông Hồng</strong>
          <div><span id="era-progress"></span></div>
        </div>
        <div class="hud-top__actions">
          <button id="ritual-button" class="icon-button icon-button--ritual" aria-label="Đàn tế" title="Đàn Tế Trời Đất"><span>✦</span><small>ĐÀN TẾ</small></button>
          <button id="sound-button" class="icon-button" aria-label="Bật tắt âm thanh" title="Âm thanh">♪</button>
          <button id="fullscreen-button" class="icon-button" aria-label="Toàn màn hình" title="Toàn màn hình">⛶</button>
        </div>
      </header>

      <aside id="tutorial-card" class="tutorial-card">
        <div class="tutorial-card__top"><span id="tutorial-eyebrow">BƯỚC CHÂN ĐẦU TIÊN · 01/08</span><b id="tutorial-percent">12%</b></div>
        <div class="tutorial-card__bar"><span id="tutorial-bar"></span></div>
        <h3 id="tutorial-title">Quan sát miền đất mới</h3>
        <p id="tutorial-body">Dùng W A S D để dịch chuyển tầm nhìn.</p>
        <div class="tutorial-card__hint"><span>i</span><p id="tutorial-hint">Di chuyển camera một đoạn để tiếp tục</p></div>
      </aside>

      <aside class="world-label world-label--river"><small>PHƯƠNG ĐÔNG</small><strong>Sông Hồng</strong></aside>

      <section id="selection-panel" class="selection-panel is-empty">
        <div class="portrait" id="selection-portrait"><span>?</span></div>
        <div class="selection-panel__copy"><small id="selection-role">CHƯA CHỌN ĐƠN VỊ</small><strong id="selection-name">Lạc Việt</strong><div class="health"><i id="selection-health"></i></div><p id="selection-trait">Nhấp vào một nhân vật trên bản đồ</p></div>
      </section>

      <section class="action-panel">
        <div class="action-panel__heading"><span>HÀNH ĐỘNG</span><small id="action-context">XÂY DỰNG</small></div>
        <div class="action-grid">
          <button id="build-house" class="action-card" disabled>
            <span class="action-card__art">⌂</span><span><b>Nhà Sàn</b><small><i>⌁</i> 50 Gỗ</small></span><kbd>1</kbd>
          </button>
          <button id="build-chief" class="action-card" disabled>
            <span class="action-card__art">♜</span><span><b>Lều Trưởng Bản</b><small><i>◆</i> 80 Đá</small></span><kbd>2</kbd>
          </button>
          <button id="upgrade-era" class="action-card action-card--upgrade" disabled>
            <span class="action-card__art">✦</span><span><b>Lên đời</b><small>Hùng Quốc Vương</small></span><kbd>3</kbd>
          </button>
          <button id="build-field" class="action-card campaign-action" hidden disabled>
            <span class="action-card__art">≋</span><span><b>Ruộng Lúa Nước</b><small><i>⌁</i> 60 Gỗ · +15 Lúa/10s</small></span>
          </button>
          <button id="call-rain" class="action-card campaign-action action-card--skill" hidden disabled>
            <span class="action-card__art">☂</span><span><b>Thần Nông · Gọi Mưa</b><small>Khôi phục sản xuất ruộng</small></span>
          </button>
          <button id="build-barracks" class="action-card campaign-action" hidden disabled>
            <span class="action-card__art">⚑</span><span><b>Trại Lạc Quân</b><small>80 Gỗ · 40 Đá</small></span>
          </button>
          <button id="train-warrior" class="action-card campaign-action" hidden disabled>
            <span class="action-card__art">⚔</span><span><b>Chiến binh Rìu Đồng</b><small>60 Lúa · 20 Đồng</small></span>
          </button>
          <button id="train-archer" class="action-card campaign-action" hidden disabled>
            <span class="action-card__art">➶</span><span><b>Xạ thủ Nỏ Tre</b><small>40 Lúa · 40 Gỗ</small></span>
          </button>
        </div>
      </section>

      <section class="minimap" aria-label="Bản đồ thu nhỏ">
        <div class="minimap__face"><span class="minimap__river"></span><i class="minimap__home"></i><i class="minimap__resource one"></i><i class="minimap__resource two"></i><i class="minimap__danger"></i></div>
        <small>CHÂU PHONG · VĂN LANG</small>
      </section>

      <footer class="controls-strip">
        <span><kbd>W A S D</kbd> Di chuyển</span><span><kbd>CHUỘT TRÁI</kbd> Chọn</span><span><kbd>CHUỘT PHẢI</kbd> Ra lệnh</span><span><kbd>CUỘN</kbd> Thu phóng</span>
        <b id="save-status"><i></i> Đã lưu cục bộ</b>
      </footer>

      <div id="placing-banner" class="placing-banner"><span>⌖</span> Chọn vị trí trên đất trống · <b>ESC</b> để hủy</div>
    </main>

    <div id="modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__backdrop"></div>
      <article class="modal__card">
        <div class="modal__seal" id="modal-seal">✦</div>
        <p id="modal-eyebrow">THUỞ HỒNG HOANG</p>
        <h2 id="modal-title">Khởi nguyên Văn Lang</h2>
        <div id="modal-body" class="modal__body"></div>
        <div id="modal-actions" class="modal__actions"></div>
      </article>
    </div>
    <div id="toast" class="toast" role="status"><span id="toast-icon">✦</span><div><b id="toast-title"></b><small id="toast-body"></small></div></div>
  `;
}

export function showModal(options: {
  eyebrow: string;
  title: string;
  body: string;
  seal?: string;
  actions: ModalAction[];
}): void {
  text('#modal-eyebrow', options.eyebrow);
  text('#modal-title', options.title);
  const body = document.querySelector<HTMLElement>('#modal-body');
  if (body) body.innerHTML = options.body;
  text('#modal-seal', options.seal ?? '✦');
  const actions = document.querySelector<HTMLElement>('#modal-actions');
  if (actions) {
    actions.innerHTML = '';
    options.actions.forEach((action) => {
      const button = document.createElement('button');
      button.className = action.kind === 'secondary' ? 'button button--ghost' : 'button button--modal';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick, { once: true });
      actions.append(button);
    });
  }
  document.querySelector('#modal')?.classList.add('is-open');
}

export function hideModal(): void {
  document.querySelector('#modal')?.classList.remove('is-open');
}

let toastTimer = 0;
export function showToast(title: string, body: string, icon = '✦'): void {
  text('#toast-title', title);
  text('#toast-body', body);
  text('#toast-icon', icon);
  const toast = document.querySelector('#toast');
  toast?.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast?.classList.remove('is-visible'), 3600);
}

export function text(selector: string, value: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}
