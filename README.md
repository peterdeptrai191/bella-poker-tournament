# Bella Poker · Private tournaments

Ứng dụng web responsive cho tournament poker một bàn, 2–9 người, mang nhận diện Bella. Chỉ tạo/tham gia phòng và thi đấu giải; không cash game, tiền thật, nạp/rút, rebuy hoặc re-entry.

## Chạy cục bộ

Yêu cầu Node.js 22 trở lên. Không cần cài dependency.

```sh
node --env-file-if-exists=.env.local server.mjs
```

Mở `http://localhost:3000`. Dùng hai trình duyệt hoặc các cửa sổ riêng tư khác nhau để tạo hai phiên người chơi. Trong cùng trình duyệt, phiên được lưu theo phòng để có thể quay lại bàn. Các thiết bị khác có thể dùng IP LAN của máy chủ nếu mạng cho phép.

Không có Redis: trạng thái được chia sẻ trong **một tiến trình Node cục bộ**, mất khi khởi động lại. Trên Vercel, app chủ động từ chối tạo/chơi phòng nếu chưa cấu hình Redis; không sử dụng RAM serverless để giả lập multiplayer.

## Triển khai GitHub → Vercel

1. Push repository này lên GitHub, tên đề xuất `bella-poker-tournament`.
2. Trong Vercel, Import Git Repository; chọn framework **Other**; root là thư mục repo; không có build command; output directory `public`. `vercel.json` đã cấu hình API Node.
3. Tạo database Redis bền vững qua Vercel Marketplace / Upstash. Cấu hình **server environment variables** cho production và preview:

   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

   Vercel Marketplace có thể tự tạo `KV_REST_API_URL` và `KV_REST_API_TOKEN` thay vì tên trên; app hỗ trợ cả hai. Không đưa token vào client, Git, log hay biến có prefix public. `.env.example` chỉ chứa tên biến. Database và Function được đặt cùng khu vực Singapore.
4. Deploy hoặc redeploy sau khi thêm biến. Kiểm tra `/api?code=health` trả `onlineReady: true`, `storage: redis`.
5. Mở URL production trên hai thiết bị: tạo phòng, join bằng link/mã, cả hai sẵn sàng, chủ phòng bắt đầu. Xác nhận bài riêng chỉ hiện cho đúng người và bảng xếp hạng đồng bộ.

Git dùng nhánh `main`. Vercel tự deploy các lần push tiếp theo sau khi liên kết repo. Tài khoản GitHub/Vercel và cấu hình database phải thuộc người vận hành; mã nguồn không chứa credential.

## Luồng sử dụng

Tên hiển thị → tạo phòng (stack / thời gian level) → chia sẻ mã 6 ký tự hoặc link → mọi người sẵn sàng → chủ phòng bắt đầu. Người chơi được xếp ghế ngẫu nhiên. Chỉ có góc nhìn FPP; giữ vào bài để hé, thả để úp. Phòng tự đếm người tham gia, không cần chọn số ghế. Chủ phòng bắt đầu với số người thực tế khi mọi người sẵn sàng (2–9 người). Xem vị trí trong bảng xếp hạng ngay tại bàn hoặc mục riêng.

## Chơi với bot

Trong form tạo phòng, chọn **Chơi với bot** để có sẵn một Bella Bot. Hoặc tạo phòng thường, rồi chủ phòng bấm **Thêm bot** trong phòng chờ. Có thể chơi một người với bot hoặc trộn bạn bè và bot; tổng số ghế vẫn tối đa 9. Chủ phòng có thể xóa bot trước khi giải bắt đầu. Bot tự sẵn sàng; người thật bấm Sẵn sàng rồi chủ phòng Bắt đầu giải.

Bot là chiến lược luyện tập dựa trên độ mạnh bài, pot odds và mức cược, không phải solver tối ưu. Bot chỉ nhận snapshot công khai cho người chơi đó (hai lá riêng của bot và bài chung), không nhận deck hoặc bài kín của đối thủ. Quyết định check/call/fold/raise của bot đi qua cùng bộ kiểm tra luật như người thật. Mỗi lượt bot chờ khoảng 1,2–2 giây, được xử lý bởi request/poll trên server. Giữ trang giải mở để bot và timer tiếp tục chạy. Bot có nhãn BOT và tham gia bảng xếp hạng cùng người thật.

## Phạm vi luật tournament

- No-limit Texas Hold’em, freezeout một bàn; không late registration, ante, tiền thưởng hoặc chức năng tiền thật.
- Mỗi người có stack bằng nhau. Blind schedule SB: 25, 50, 75, 100, 150, 200, 300, 400, 600, 800, 1.000, 1.500; BB = 2 × SB. Level mới áp dụng ở đầu ván sau. Button/BB và trường hợp heads-up xử lý riêng; ván sau dùng dead-button theo vị trí BB.
- Dealer chia bài và burn card trên máy chủ. Deck xáo bằng `crypto.randomInt`, không dùng `Math.random` cho bài.
- Check / call / fold / raise-to / all-in. Minimum raise theo full raise gần nhất; short all-in không tự mở lại raise; tổng short raises có thể mở lại khi đạt full raise.
- Main pot / side pots / hoàn cược không được theo. So 5 lá tốt nhất từ 7 lá, wheel A–5, hòa pot và chia chip lẻ từ trái button.
- Sau khi showdown hoàn tất, công khai hai lá của tất cả người được chia bài trong ván (người thật và bot, kể cả đã fold), và hiển thị bảng bài từng người. Trong khi ván còn diễn ra, hoặc ván kết thúc vì mọi đối thủ fold mà không showdown, chỉ chủ bài nhận hole cards. Ván mới lại giữ kín bài riêng.
- Timeout 25 giây: check nếu được phép, nếu không fold. Mất kết nối không dừng giải hoặc miễn blinds. Quay lại bằng token lưu trong trình duyệt.
- Hết chip bị loại. Loại cùng ván so stack đầu ván; bằng stack thì đồng hạng. Người cuối còn chip xếp #1. BXH hiện tại theo stack; chip đã cược nằm trong pot cho đến khi quyết toán.
- Đây là luật tự động cho ứng dụng online, không tái tạo các quyết định của tournament director, quy trình live misdeal, chip race, multiple tables hoặc cân bàn.

Tham khảo luật chính thức: [Poker TDA](https://www.pokertda.com/view-poker-tda-rules/). Phần mô tả trên được viết riêng cho app, không sao chép bộ luật TDA.

## Đồng bộ và lưu trữ

Client poll máy chủ mỗi 1,5 giây. Server trả snapshot đã lọc bài riêng, kiểm tra token, lượt, hand ID, quyền chủ phòng và request ID chống thao tác lặp. Toàn bộ room state được cập nhật bằng Redis Lua compare-and-swap và retry để tránh mất cập nhật khi nhiều người hành động/join đồng thời. Phòng hết hạn sau 7 ngày không ghi cập nhật. Không sử dụng WebSocket hoặc tiến trình thường trú trên Vercel.

Timer được xử lý trên server khi có request: khi còn người xem, poll duy trì tiến trình. Nếu tất cả đóng trang, không có cron chạy nền; giải xử lý timeout tiếp theo khi có người quay lại. Đây là lựa chọn triển khai cho bản một bàn hiện tại.

## Kiểm thử

```sh
node --test test/*.test.js
node --check public/app.js
```

Test bao gồm xếp hạng bài, side pots, raise, heads-up, privacy, timeout, bảo toàn chip, mô phỏng giải, nhiều client, quyền chủ phòng, chống hành động lặp và sức chứa phòng khi join đồng thời. Các test tự động chạy với store cục bộ; Redis/Vercel cần smoke test sau khi có tài khoản và biến môi trường.

## Cấu trúc

`public/`: giao diện và tài nguyên. `lib/poker.js`: luật và bộ đánh giá bài. `lib/store.js`: Redis REST / store cục bộ. `lib/service.js`: tạo phòng, phiên và command handler. `api/index.js`: Vercel Function. `server.mjs`: server phát triển cục bộ. `test/`: kiểm thử Node native.

Asset Bella và cảnh bàn được cung cấp/tạo trong quá trình thiết kế của dự án. Không có thông tin tài khoản hoặc khóa dịch vụ trong repository.
