# Game Design Document — Văn Lang: Dấu Son Hồng Hoang

## 1. Tầm nhìn

Một game chiến thuật thời gian thực chơi trực tiếp trên trình duyệt, đưa người chơi vào vai trò người dựng nước: khai thác tài nguyên, dựng xóm làng, thu phục các bộ lạc và bảo vệ Văn Lang trước thiên tai, quái thú và ngoại xâm.

**Trụ cột trải nghiệm**

1. **Dựng nước:** Lúa → dân số → công trình → quân đội → lên đời.
2. **Giữ nước:** Phòng thủ trước AI, quái thú, thiên tai và chiến dịch lớn.
3. **Huyền sử sống động:** Mỗi tướng thay đổi cách chơi chứ không chỉ thay chỉ số.
4. **Hồn Việt dễ nhận diện:** lúa nước, nhà sàn, thuyền, trống đồng, hoa văn Đông Sơn.

## 2. Core loop mục tiêu

```text
Khai thác → Xây dựng → Mở khóa tướng/quân → Ứng phó biến cố
     ↑                                           ↓
Nâng cấp công nghệ ← Thu chiến lợi phẩm ← Chiến đấu / ngoại giao
```

Năm tài nguyên chính:

| Tài nguyên | Nguồn | Sink chính |
|---|---|---|
| Lúa | Ruộng, săn bắt, đánh cá | Dân/quân, lễ tế, upkeep |
| Gỗ | Rừng, tre | Nhà, thuyền, cung nỏ, sửa chữa |
| Đá | Mỏ, núi | Thành lũy, đê, Đền Hùng |
| Đồng thau | Mỏ + lò luyện | Vũ khí, giáp, trống đồng |
| Vàng | Giao thương, boss | Tướng, kỹ năng, vật phẩm hiếm |

## 3. First Playable đã triển khai

### Mục tiêu phiên chơi

Trong khoảng 5–8 phút, người chơi phải:

- học camera và hai nút chuột;
- hiểu tướng có buff khai thác khác nhau;
- xây được công trình bằng tài nguyên;
- trải qua một biến cố chiến đấu;
- nhận khoảnh khắc “wow” khi lên đời.

### Chuỗi nhiệm vụ

| # | Nhiệm vụ | Điều kiện hoàn thành | Kết quả |
|---|---|---|---|
| 1 | Quan sát miền đất | Camera đi >54 px | Mở chọn nhân vật |
| 2 | Chọn Âu Cơ | Click đúng Âu Cơ | Mở thu hoạch |
| 3 | Thu lúa dại | Âu Cơ tương tác với lúa | +15 Lúa |
| 4 | Lấy gỗ | Lạc Long Quân tương tác cây | +20 Gỗ |
| 5 | Dựng Nhà Sàn | Đặt công trình hợp lệ | 2 Lạc Dân, cap 12 |
| 6 | Diệt Ngư Tinh | Long Quân đánh đủ 3 đòn | +100 Đá, +100 Đồng |
| 7 | Dựng Lều Trưởng Bản | Dùng 80 Đá | Mở nút lên đời |
| 8 | Hùng Quốc Vương | Trả 50 Lúa, 20 Đá, 80 Đồng | Đền Hùng, 500 Vàng |

Tutorial có anti-fail: boss không tấn công thật vào Lạc Dân; tài nguyên được cân chính xác để người chơi không mắc kẹt.

## 4. Hệ thống MVP

### Tướng

- **Lạc Long Quân:** +100% Gỗ trong nhiệm vụ mở đầu, khắc chế Ngư Tinh.
- **Âu Cơ:** +50% Lúa trong nhiệm vụ mở đầu.

### Xây dựng

- Vị trí phải nằm trên đất, cách resource node và công trình hiện hữu một bán kính an toàn.
- Placement ghost báo hợp lệ/không hợp lệ bằng opacity.
- `Esc` hoặc chuột phải để hủy.

### Chiến đấu

Prototype dùng auto-attack theo lệnh: tiếp cận → đánh theo nhịp → cập nhật HP → drop loot. Kiến trúc này có thể mở rộng thành damage type, armor, aggro, cooldown và behavior tree.

### Lưu game

State gồm tài nguyên, dân số, tutorial stage, level, công trình và trạng thái quà. Autosave sau mỗi mốc quan trọng và mỗi 30 giây.

## 5. Roadmap nội dung

### Milestone A — Vertical slice Level 1–2

- Ruộng Lúa Nước và production tick.
- Lạc Dân thực sự khai thác theo chu kỳ.
- Trại Lạc Quân, Chiến binh Rìu Đồng, Xạ thủ Nỏ Tre.
- Fog of war, pathfinding trên grid, một bộ lạc trung lập.

### Milestone B — Level 3–6

- Chử Đồng Tử – Tiên Dung và chợ Đầm Dạ Trạch.
- Tản Viên, Mộc Tinh.
- Thánh Gióng và chiến dịch Giặc Ân.
- Thiên tai lũ/cháy có counterplay bằng đê và sửa chữa.

### Milestone C — 18 đời

- Data-driven level/hero/event config.
- Thu phục 15 bộ bằng ngoại giao hoặc chinh phạt.
- Sơn Tinh – Thủy Tinh và chiến dịch cuối.
- Meta progression, account/cloud save, leaderboard.

## 6. Nguyên tắc lịch sử – văn hóa

- UI phải phân biệt rõ **sử liệu**, **ngọc phả/truyền thuyết**, và **sáng tạo game**.
- Không khẳng định niên đại gây tranh luận như sự thật duy nhất.
- Trang phục, vũ khí và kiến trúc cần dựa trên tư liệu khảo cổ phù hợp; tránh trộn phong cách cung điện Đông Á thời muộn.
- Cần cố vấn lịch sử/khảo cổ trước production art và truyền thông thương mại.
