# Văn Lang: Dấu Son Hồng Hoang

> Web RTS lấy cảm hứng từ thời đại Hùng Vương, văn hóa lúa nước và kho tàng huyền sử Việt Nam.

**Trạng thái:** First Playable / MVP tutorial · **Nền tảng:** Web desktop · **Ngôn ngữ:** Tiếng Việt

![Văn Lang key art](src/assets/van-lang-hero.jpg)

## Chơi ngay

- **Bản web:** [https://nguyentris.github.io/Van-Lang-Game/](https://nguyentris.github.io/Van-Lang-Game/)
- Không cần đăng ký. Bản lưu nằm trong IndexedDB của trình duyệt và có localStorage dự phòng.
- Khuyến nghị Chrome, Edge hoặc Cốc Cốc bản mới nhất, màn hình từ 1280 × 720.

## Nội dung đã hoàn thành

Bản MVP hiện thực hóa trọn vẹn tutorial mở đầu trong hồ sơ dự án:

1. Màn hình mở đầu và onboarding bằng tiếng Việt.
2. Bản đồ RTS 2D/2.5D vẽ trực tiếp bằng Phaser.
3. Camera WASD, edge pan, zoom; chọn nhân vật và ra lệnh bằng chuột.
4. Hai tướng khởi đầu: **Lạc Long Quân** và **Âu Cơ**.
5. Thu hoạch Lúa/Gỗ cùng nội tại riêng của tướng.
6. Đặt và xây **Nhà Sàn**, sinh hai Lạc Dân.
7. Mini-boss **Ngư Tinh**, chiến đấu ba đòn và phần thưởng chiến lợi phẩm.
8. Xây **Lều Trưởng Bản**, lên đời **Hùng Quốc Vương** và nhận 500 Vàng.
9. HUD tài nguyên, dân số, nhiệm vụ, minimap, fullscreen, âm thanh tổng hợp.
10. Autosave 30 giây/lần, khôi phục sau F5, PWA shell và offline cache.
11. Điểm tích hợp “Đàn Tế” mô phỏng luồng rewarded-ad an toàn; chưa gọi mạng quảng cáo thật.
12. Pipeline build/deploy tự động lên GitHub Pages bằng GitHub Actions.

## Điều khiển

| Thao tác | Điều khiển |
|---|---|
| Di chuyển camera | `W` `A` `S` `D` hoặc đưa chuột sát mép màn hình |
| Thu/phóng | Con lăn chuột |
| Chọn nhân vật | Chuột trái |
| Di chuyển / khai thác / tấn công | Chuột phải |
| Xây Nhà Sàn / Lều / Lên đời | `1` / `2` / `3` hoặc nút HUD |
| Hủy đặt công trình | `Esc` hoặc chuột phải |
| Toàn màn hình / âm thanh | Nút góc trên phải |

## Chạy dự án cục bộ

Yêu cầu Node.js 22+.

```bash
npm install
npm run dev
```

Mở URL mà Vite in ra. Dev server đã bind `0.0.0.0` để chạy được trong container/preview.

### Kiểm tra và build production

```bash
npm run check
npm run build
npm run preview
```

Thư mục xuất bản là `dist/`. Cấu hình Vite dùng asset path tương đối nên có thể deploy ở sub-path như GitHub Pages.

## Kiến trúc thư mục

```text
src/
├── assets/                # Key art dành riêng cho dự án
├── game/
│   ├── scenes/GameScene.ts # World, unit, tutorial, combat, building
│   ├── audio.ts            # Web Audio SFX tổng hợp tại runtime
│   ├── data.ts             # Master data và type game
│   └── save.ts             # IndexedDB + localStorage fallback
├── main.ts                 # Bootstrap Phaser và service worker
├── styles.css              # Landing page + toàn bộ HUD responsive
└── ui.ts                   # DOM UI, modal và toast
public/                     # PWA manifest, icon, service worker
docs/                       # GDD, kiến trúc, QA và brief gốc
.github/workflows/          # CI/CD GitHub Pages
```

Tài liệu chi tiết:

- [Game Design Document](docs/GAME_DESIGN.md)
- [Kiến trúc và quyết định kỹ thuật](docs/ARCHITECTURE.md)
- [Kịch bản nghiệm thu](docs/QA.md)
- [Brief dự án gốc (PDF)](docs/brief/van-lang-game-brief.pdf)

## Deploy

Workflow `.github/workflows/deploy-pages.yml` chạy khi push lên `main`, nhánh làm việc Arena hoặc khi bấm **Run workflow**:

1. `npm ci`
2. Type-check + Vite production build
3. Upload `dist/`
4. Deploy GitHub Pages qua OIDC

Trong **Settings → Pages**, nguồn deploy cần đặt là **GitHub Actions**. Không cần commit thư mục `dist/`.

## Phạm vi và ghi chú nội dung

Đây là **first playable**, không phải toàn bộ chiến dịch 18 đời Vua Hùng. Dữ liệu nhân vật/sự kiện trong brief kết hợp truyền thuyết, ngọc phả và diễn giải sáng tạo; cần hội đồng cố vấn sử học – khảo cổ thẩm định trước bản thương mại. Các nhân vật có niên đại gây tranh luận không nên được giới thiệu như sự kiện lịch sử đã được xác quyết.

Tích hợp quảng cáo thật cần tài khoản nhà phát hành, SDK và callback xác thực của đối tác (Poki, CrazyGames, Google H5 Games Ads...). Prototype chỉ cung cấp adapter UX và phần thưởng mô phỏng, không theo dõi người dùng và không gửi dữ liệu ra ngoài.

## Công nghệ

- Phaser 3.90
- TypeScript 5.9
- Vite 7.3
- IndexedDB, Web Audio, Service Worker
- GitHub Actions + GitHub Pages
