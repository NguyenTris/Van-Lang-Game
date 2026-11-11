# Kiến trúc kỹ thuật

## Quyết định chính

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Engine | Phaser 3 + TypeScript | Tải nhanh, WebGL/Canvas fallback, phù hợp RTS 2D |
| Bundler | Vite | Dev loop nhanh, static output dễ deploy |
| Render | Procedural vector ở runtime | Không phụ thuộc sprite bên thứ ba, bundle nhỏ |
| UI | DOM/CSS overlay trên Phaser | HUD sắc nét, responsive, accessibility tốt hơn |
| Save | IndexedDB + localStorage fallback | Hoạt động offline, bền hơn chỉ dùng localStorage |
| Audio | Web Audio oscillator | Không cần file audio, chỉ khởi tạo sau tương tác |
| Offline | Service worker cache-first + revalidate | Chơi lại khi mất mạng sau lần tải đầu |
| Hosting | GitHub Pages | Static, miễn phí, CI/CD đơn giản |

## Runtime flow

```text
index.html
  └── main.ts
      ├── SaveManager.load()
      ├── renderApp(save)
      └── new Phaser.Game(GameScene)
             ├── world render
             ├── input + tutorial state machine
             ├── unit/building/combat systems
             └── SaveManager.save(snapshot)
```

## State model

`SaveState` có `version` để migration trong tương lai. Snapshot chỉ lưu dữ liệu có ý nghĩa nghiệp vụ, không serialize object Phaser:

```ts
interface SaveState {
  version: 1;
  level: number;
  resources: Resources;
  population: number;
  populationCap: number;
  tutorialStage: TutorialStage;
  buildings: SavedBuilding[];
  originGiftClaimed: boolean;
  savedAt: number;
}
```

Khi load, scene tái dựng object từ state. Cách này tránh save bị phụ thuộc cấu trúc nội bộ của engine.

## Performance budget

MVP production hiện khoảng:

- key art: ~235 KB;
- CSS: ~18 KB trước gzip;
- JS + Phaser: ~1.25 MB trước gzip, ~350 KB gzip;
- không có texture atlas/audio nặng.

Mục tiêu tiếp theo:

- route-level/dynamic import cho engine nếu landing cần first paint nhanh hơn;
- atlas WebP/AVIF theo level;
- object pooling cho projectile/floating text;
- spatial hash cho target query;
- Web Worker cho A*/flow field khi số unit >100.

## Ads production adapter

Prototype **không phát quảng cáo thật**. Production cần interface tách nhà cung cấp:

```ts
interface RewardedAds {
  isAvailable(): Promise<boolean>;
  show(placement: string): Promise<'completed' | 'skipped' | 'failed'>;
}
```

Chỉ cộng thưởng khi SDK trả `completed`; với nền tảng có server callback thì backend mới là nguồn xác thực. Game pause khi ad mở, mute audio, resume an toàn khi ad đóng hoặc lỗi. Không làm người chơi mất save nếu AdBlock/mất mạng.

## Cloud save roadmap

Static MVP không có backend. Bản production nên thêm API nhỏ (FastAPI/Node): OAuth, optimistic concurrency bằng save revision, payload validation và ad callback. Client-side trận đấu vẫn phải chạy offline; cloud sync là eventual consistency.

## Security

- Không có secret trong frontend/repository.
- Không nhận HTML từ người dùng.
- GitHub Pages deploy dùng OIDC thay vì token thủ công.
- Dependency audit hiện không có vulnerability đã biết.
- Save local không được xem là chống cheat; leaderboard production phải xác thực server-side.
