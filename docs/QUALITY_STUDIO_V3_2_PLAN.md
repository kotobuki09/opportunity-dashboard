# Quality Studio V3.2 — kế hoạch triển khai & nghiệm thu

**Ngày:** 09/10/2026 · **Ứng dụng:** Opportunity Scout (GitHub Pages) · **Nhánh triển khai:** `feat/editorial-quality-studio-20261009`

## Mục tiêu

Biến **Kiểm tra dữ liệu** từ trang liệt kê cảnh báo thành không gian quản trị thực tế: tìm các bản ghi cần xử lý, kiểm chứng nguồn và bằng chứng theo từng trường, soạn đề xuất sửa có thể review, và nhận biết URL nguồn bị lỗi mà không đánh đồng lỗi HTTP với chương trình đã đóng.

## Phạm vi & thiết kế

| Ưu tiên | Hạng mục | Thiết kế / chức năng | Nghiệm thu |
|---|---|---|---|
| P0 | Bố cục và phân cấp | Canvas trung tính, cobalt đồng bộ favicon; KPI thao tác được; thanh coverage; hàng đợi + inspector hai cột trên desktop, một cột mobile | Không tràn ngang; light/dark/reduced-motion; vẫn truy cập keyboard |
| P0 | Kiểm định thực chứng | Phân biệt `verified_at` (con người), `review_evidence` (theo trường) và HTTP reachability (máy) | Không tự cấp xác minh; thể hiện rõ nguồn/ghi chú/tình trạng |
| P0 | Source health hiện hành | Scheduler vẫn tạo audit artifacts, sau đó công bố JSON đã làm sạch vào `public/source-health.json` và yêu cầu Pages build qua dispatch | Snapshot chứa URL/HTTP code/state, không chứa token, redirect body, thông tin người dùng; stale báo rõ |
| P1 | Hàng đợi xử lý | Lọc nhóm issue, tìm kiếm, xếp ưu tiên deadline/metadata, trạng thái truy cập, CSV xuất theo filter | Không thay đổi sẵn 78 bản ghi hoặc trạng thái cá nhân |
| P1 | Biên tập theo PR | Form sửa 5 trường an toàn, dẫn nguồn, checkbox xác nhận đã đọc, tải/copy JSON diff, link GitHub web editor | Không sửa source trực tiếp; không tự tạo PR; không gửi notes/status/credentials |
| P1 | QA/CI | Validate schema, unit & security audit, lint, build, Chromium desktop/mobile, deploy, live health check | Chỉ merge nếu toàn bộ gate xanh |

## Quy tắc thiết kế dữ liệu

- 78 chương trình hiện có là dataset độc lập với nguồn crawler và ghi chú cá nhân của từng trình duyệt.
- Một record đủ metadata **không** được coi là có eligibility đã duyệt.
- Một URL trả HTTP 200 **không** chứng minh đang nhận đơn.
- Một URL trả 403/429 thường có thể là chặn bot; giữ dấu hiệu “restricted”, không tự bỏ chương trình.
- Cửa sổ `rolling` hợp lệ không bắt buộc deadline giả.
- Evidence mới là optional và chỉ được dùng khi một người thực sự đã kiểm tra tài liệu nguồn; `verified_at` vẫn phải có xác minh riêng.

## Quy trình xuất bản và rollback

1. Review PR, đảm bảo `data/seen.json` không đổi, các ID không đổi.
2. CI validate/schema/Node unit tests, lint, build, Playwright. Nếu đỏ, sửa trước khi merge.
3. Merge squash sau CI xanh; GitHub Pages phát hành và job *Live GitHub Pages availability* phải xanh.
4. Job *Official sources and discovery review* trên main kiểm tra 78 nguồn và sau đó công bố snapshot; commit bot chỉ thay đổi `public/source-health.json`, dispatch deployment riêng.
5. Nếu bot thiếu quyền repo, giữ trạng thái scanner “unavailable”, tách lỗi này khỏi chất lượng hồ sơ; sửa cấu hình `contents:write/actions:write` hoặc tạm tắt publish job.
6. Revert commit merge nếu mất ổn định UI. Không xóa localStorage vì chứa ghi chú cá nhân.

## Những gì không thuộc V3.2

- Backend và account sync đa người dùng.
- Tự động tạo PR có quyền ghi từ trang GitHub Pages ẩn danh.
- Tự động xác nhận `verified_at` hoặc tư cách nộp dựa vào AI, OCR hay HTTP code.
- Tự động chỉnh `data/seen.json` từ bot định kỳ.
