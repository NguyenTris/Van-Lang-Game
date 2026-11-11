# Kịch bản nghiệm thu MVP

## Kiểm tra tự động

```bash
npm ci
npm run check
npm run build
npm audit --omit=dev
```

Kỳ vọng: tất cả lệnh exit code 0, output có `dist/index.html`.

## Smoke test gameplay

1. Mở tab ẩn danh, vào game và chọn **Bắt đầu khai mở**.
2. Đóng modal mở đầu, dùng `WASD`; nhiệm vụ chuyển sang “Chọn Âu Cơ”.
3. Click Âu Cơ, click phải lúa; Lúa tăng 15.
4. Click Lạc Long Quân, click phải cây; Gỗ đạt 50.
5. Chọn Nhà Sàn, thử đặt sát cây (phải bị từ chối), sau đó đặt trên đất trống.
6. Chờ xây xong; dân số thành 4/12 và 2 Lạc Dân xuất hiện.
7. Chọn Long Quân, click phải Ngư Tinh; boss mất đúng 3 × 40 HP.
8. Xác nhận kho có 100 Đá, 100 Đồng.
9. Xây Lều Trưởng Bản bằng 80 Đá.
10. Nhấn Lên đời; kiểm tra animation, Đền Hùng và modal Hùng Quốc Vương.
11. Nhận 500 Vàng; bước vào Level 1 và xác nhận nhận Thần Nông cùng vật tư khởi nghiệp.
12. Xây Ruộng Lúa; hạn hán phải làm ruộng đổi màu và dừng sản xuất.
13. Dùng Gọi Mưa; kiểm tra ruộng cộng đúng 3 Lúa/2 giây và hiện +15 sau 10 giây.
14. Thu thêm Gỗ và dựng Trại Lạc Quân. Sau khi hoàn tất, trại phải tự được chọn và hiện nút Chiến binh Rìu Đồng.
15. Chọn một unit khác rồi click lại Trại Lạc Quân; bảng huấn luyện phải mở lại. Huấn luyện Rìu Đồng phải trừ 60 Lúa + 20 Đồng và sinh quân sau 2,2 giây.
16. Khi thiếu tài nguyên hoặc đầy dân số, nút vẫn nhận click và hiện toast giải thích thay vì im lặng.
17. Sang Level 2, mở lại Trại và huấn luyện Xạ thủ; fog tại Vũ Ninh phải tan.
18. Chọn một trong hai nhánh: kết minh trừ đúng cống vật hoặc chinh phạt bằng Lạc Quân.
19. F5 và kiểm tra level, công trình, quân đã huấn luyện, lựa chọn bộ lạc và tài nguyên còn nguyên.

## Edge cases

- Chuột phải khi chưa chọn unit: toast hướng dẫn, không crash.
- Chọn sai tướng/resource trong tutorial: báo đúng nhân vật cần dùng.
- `Esc` và chuột phải hủy building placement.
- Không thể đặt nhà trên sông, resource, unit hay nhà khác.
- Click Đàn Tế hai lần: lần hai không cấp thêm phần thưởng.
- Bật/tắt âm thanh trước khi browser cấp AudioContext không tạo lỗi.
- Fullscreen từ chối hoặc thoát fullscreen không làm mất state.
- Xóa IndexedDB: localStorage fallback vẫn có thể khôi phục.
- Mất mạng sau lần tải đầu: service worker phục vụ application shell đã cache.

## Responsive

- Desktop chuẩn: 1920×1080, 1366×768, 1280×720.
- Tablet/khung hẹp: 760×900; HUD thu gọn, chức năng vẫn dùng được.
- Mobile không phải target chính; cần hiện đủ tutorial và ba action button, nhưng trải nghiệm RTS tối ưu cho chuột/bàn phím.

## Browser target

- Chrome / Edge / Cốc Cốc: 2 phiên bản gần nhất.
- Firefox: 2 phiên bản gần nhất.
- Safari desktop: 17+; kiểm tra Web Audio và IndexedDB private mode riêng.
