import { stories, type IconName } from "@/data/yag";
import { Icon, Cover, ErrorGuide, MetricCard, QuickStories, RankingItem, ReadingCard, UpdateStoryRow } from "@/components/ui";
import { AppShell } from "@/components/layout";
import { PasswordField } from "../auth/AuthScreens";

const settingSections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Hồ sơ cá nhân", icon: "user" },
  { id: "security", label: "Mật khẩu & bảo mật", icon: "lock" },
  { id: "reader", label: "Tùy chọn đọc", icon: "book" },
  { id: "notifications", label: "Thông báo", icon: "bell" },
];

const readerChapters = [
  "Khởi đầu dưới mưa",
  "Lời hẹn cũ",
  "Bức thư bị giấu",
  "Ánh đèn trong ga",
  "Lựa chọn cuối",
  "Ngày thành phố im lặng",
  "Mùa hoa trở lại",
  "Cánh cửa khóa",
  "Người đưa thư",
  "Đêm ở bến tàu",
  "Bản nhạc cũ",
  "Lời hẹn dưới mái ga",
];

const readerNotes = [
  "Lá thư bị trả lại là chi tiết then chốt của chương.",
  "Nhịp chương chậm, nên đọc ở nền giấy ấm để đỡ mỏi mắt.",
  "Phần premium bắt đầu sau cảnh sân ga phía bắc.",
];

export function HomeFeedScreen() {
  return (
    <AppShell activeId="s04">
      <section className="home-hero">
        <a className="home-featured" href="/story-detail">
          <div className="home-featured-copy">
            <span className="badge badge-crimson">Đang được đọc nhiều</span>
            <h2>Mưa Trên Thành Cũ</h2>
            <p>Một bí mật bị giấu trong những bức thư cũ kéo hai con người trở lại thành phố sau chiến tranh.</p>
            <div className="home-featured-stats"><span>72 chương</span><span>4.9 ★</span><span>1.2M lượt đọc</span></div>
            <span className="button button-primary" style={{ width: "fit-content" }}>Đọc tiếp</span>
          </div>
          <div className="home-featured-cover"><Cover index={0} /></div>
        </a>
        <aside className="panel panel-pad stack home-continue">
          <div className="home-section-head"><h2 className="section-title">Đọc tiếp</h2><a href="/library">Thư viện</a></div>
          {stories.slice(3, 6).map((story, index) => <ReadingCard story={story} index={index} key={story.title} />)}
        </aside>
      </section>
      <section className="action-strip" style={{ margin: "24px 0" }}>
        <div><strong>Gu đọc hôm nay</strong><div className="list-meta">YAG ưu tiên truyện lịch sử, trinh thám nhẹ và tác giả đăng đều trong tuần này.</div></div>
        <button className="button" type="button" data-toast="Đã làm mới gợi ý. Nếu truyện chưa đúng gu, hãy đọc hoặc ẩn vài truyện để YAG học lại sở thích.">Làm mới gợi ý</button>
      </section>
      <section className="home-layout">
        <main className="stack">
          <section className="panel panel-pad stack"><div className="home-section-head"><h2 className="section-title">Dành cho bạn</h2><a href="/discover">Xem thêm</a></div><QuickStories count={12} /></section>
          <section className="panel panel-pad stack"><div className="home-section-head"><h2 className="section-title">Mới cập nhật</h2><a href="/discover">Tất cả truyện mới</a></div><div className="update-list">{stories.slice(8, 14).map((story, index) => <UpdateStoryRow story={story} index={index + 8} key={story.title} />)}</div></section>
        </main>
        <aside className="stack">
          <section className="panel panel-pad stack"><div className="home-section-head"><h2 className="section-title">BXH hôm nay</h2><a href="/discover">Chi tiết</a></div><div className="ranking-list">{stories.slice(0, 6).map((story, index) => <RankingItem story={story} index={index} key={story.title} />)}</div></section>
          <section className="panel panel-pad stack"><h2 className="section-title">Thể loại nổi bật</h2><div className="genre-strip">{["Ngôn tình", "Trinh thám", "Khoa học viễn tưởng", "Huyền huyễn", "Chữa lành", "Cổ trang", "Phiêu lưu", "Kỳ ảo"].map((item, index) => <a className={`pill ${index === 0 ? "active" : ""}`} href="/discover" key={item}>{item}</a>)}</div></section>
        </aside>
      </section>
    </AppShell>
  );
}

export function DiscoverScreen() {
  return (
    <AppShell activeId="s05">
      <section className="panel panel-pad stack">
        <div className="grid grid-2"><div className="field"><label>Từ khóa</label><input className="input" defaultValue="tình yêu thời chiến có kết buồn" /></div><div className="field"><label>Kiểu tìm kiếm</label><div className="tabs"><button className="tab-button active" data-tab-trigger="basic">Từ khóa</button><button className="tab-button" data-tab-trigger="ai">AI ngữ nghĩa</button></div></div></div>
        <div className="pill-list">{["Ngôn tình", "Trinh thám", "Hoàn thành", "Trên 50 chương", "Rating 4.5+"].map((filter, index) => <button className={`pill ${index < 2 ? "active" : ""}`} type="button" key={filter}>{filter}</button>)}</div>
        <div className="action-strip"><div><strong>Tìm kiếm thông minh</strong><div className="list-meta">Kết hợp từ khóa, thể loại, trạng thái và lịch sử đọc gần đây.</div></div><button className="button button-primary" type="button" data-toast="Đã cập nhật kết quả. Nếu chưa đúng gu, hãy bỏ bớt tag hoặc bật AI ngữ nghĩa để mở rộng phạm vi tìm kiếm."><Icon name="search" />Tìm truyện</button></div>
      </section>
      <section className="layout-filter" style={{ marginTop: 24 }}>
        <aside className="panel panel-pad stack">
          <h2 className="section-title">Bộ lọc</h2>
          {["Thể loại", "Trạng thái", "Số chương", "Sắp xếp"].map((label) => <div className="field" key={label}><label>{label}</label><select className="select"><option>Tất cả</option><option>Phù hợp nhất</option><option>Mới cập nhật</option></select></div>)}
          <button className="button" type="button" data-toast="Bộ lọc đã được áp dụng. Nếu kết quả quá ít, hãy mở rộng số chương hoặc chọn Tất cả thể loại.">Áp dụng bộ lọc</button>
          <button className="button button-soft" type="button" data-toast="Đã đưa bộ lọc về mặc định.">Đặt lại</button>
        </aside>
        <main className="stack"><div className="panel panel-pad"><div className="home-section-head"><h2 className="section-title">24 truyện phù hợp</h2><span className="badge badge-blue">AI ngữ nghĩa</span></div></div><ErrorGuide title="Không thấy truyện phù hợp?" items={["Thử bỏ một tag đang quá hẹp như số chương hoặc trạng thái.", "Viết mô tả cảm xúc thay vì chỉ nhập tên thể loại.", "Nếu vẫn ít kết quả, chuyển sang sắp xếp theo lượt đọc cao."]} /><QuickStories count={12} /><button className="button" type="button" data-toast="Đã tải thêm 12 truyện.">Tải thêm truyện</button></main>
      </section>
    </AppShell>
  );
}

export function StoryDetailScreen() {
  const chapters = ["Khởi đầu dưới mưa", "Lời hẹn cũ", "Bức thư bị giấu", "Ánh đèn trong ga", "Lựa chọn cuối", "Ngày thành phố im lặng", "Mùa hoa trở lại", "Cánh cửa khóa", "Người đưa thư", "Đêm ở bến tàu", "Bản nhạc cũ", "Lời hẹn dưới mái ga"];
  return (
    <AppShell activeId="s06">
      <section className="layout-2">
        <aside className="panel panel-pad stack"><Cover index={1} /><span className="badge badge-crimson">Đang hot</span><div className="compact-stack"><strong>Linh An</strong><span className="story-meta">72 chương · 1.2M lượt đọc · 4.9 ★</span></div><div className="pill-list"><span className="pill">Ngôn tình</span><span className="pill">Lịch sử</span><span className="pill">Tâm lý</span></div><button className="button" data-toast="Đã lưu Mưa Trên Thành Cũ vào thư viện."><Icon name="book" />Lưu thư viện</button></aside>
        <main className="stack">
          <div className="panel panel-pad stack"><div><h2 className="page-title" style={{ fontSize: 32 }}>Mưa Trên Thành Cũ</h2><p>Giữa thành phố cũ sau chiến tranh, một người viết thư thuê và một nữ phóng viên cùng lần theo bí mật của những bức thư không người nhận.</p></div><div className="metric-grid"><MetricCard label="Lượt đọc" value="1.2M" /><MetricCard label="Đánh giá" value="4.9" /><MetricCard label="Theo dõi" value="48K" /><MetricCard label="Cập nhật" value="T6" /></div><div className="inline-actions"><a className="button button-primary" href="/reader-mode"><Icon name="book" />Đọc tiếp chương 12</a><a className="button" href="/reader-mode">Đọc từ đầu</a><button className="button" type="button" data-toast="Đã báo lỗi nội dung cho đội vận hành." data-toast-type="warning">Báo lỗi chương</button></div></div>
          <div className="panel panel-pad"><div className="tabs"><button className="tab-button active" data-tab-trigger="chapters">Danh sách chương</button><button className="tab-button" data-tab-trigger="comments">Bình luận</button></div><div className="tab-panel active" data-tab-panel="chapters" style={{ marginTop: 16 }}><div className="list">{chapters.map((name, index) => <div className="list-item" key={name}><div><h3 className="list-title">Chương {index + 1}: {name}</h3><div className="list-meta">{index > 8 ? "Premium" : "Miễn phí"} · {1200 + index * 260} chữ · cập nhật {index + 1} ngày trước</div></div><a className={`button ${index > 8 ? "button-soft" : ""}`} href={index > 8 ? "/membership" : "/reader-mode"}>{index > 8 ? <><Icon name="lock" />Mở khóa</> : "Đọc"}</a></div>)}</div></div><div className="tab-panel" data-tab-panel="comments" style={{ marginTop: 16 }}><div className="list"><div className="list-item"><div><h3 className="list-title">Minh Nguyệt</h3><div className="list-meta">Cảm xúc chương 6 rất tốt, nhịp chậm nhưng cuốn.</div></div><span className="badge badge-green">12 like</span></div><div className="field"><label>Viết bình luận</label><textarea className="textarea" defaultValue="Mình thích cách tác giả xây dựng ký ức của nhân vật chính." /></div><button className="button button-primary" data-toast="Bình luận đã được gửi.">Gửi bình luận</button></div></div></div>
        </main>
      </section>
    </AppShell>
  );
}

export function ReaderScreen() {
  return (
    <>
    <input className="reader-toggle-input" id="readerThemeSwitch" type="checkbox" aria-label="Bật nền tối" />
    <input className="reader-toggle-input" id="readerWidthSwitch" type="checkbox" aria-label="Mở rộng vùng đọc" />
    <div className="reader-page reader-immersive">
      <div className="reader-progressbar" aria-hidden="true"><span style={{ width: "68%" }} /></div>
      <header className="reader-topbar">
        <div className="inline-actions">
          <a className="button" href="/story-detail"><Icon name="arrow" /><span className="hide-mobile">Trang truyện</span></a>
          <div>
            <strong>Mưa Trên Thành Cũ</strong>
            <div className="story-meta">Chương 12/72 · Lời hẹn dưới mái ga · 7 phút đọc</div>
          </div>
        </div>
        <div className="reader-topbar-center" aria-label="Tiến độ đọc">
          <span>68%</span>
          <div className="progress"><span style={{ width: "68%" }} /></div>
        </div>
        <div className="inline-actions">
          <button className="button" type="button" data-toast="Đã đánh dấu chương và lưu vị trí đọc."><Icon name="book" /><span className="hide-mobile">Đánh dấu</span></button>
          <a className="button button-soft" href="/membership"><Icon name="lock" /><span className="hide-mobile">Premium</span></a>
        </div>
      </header>

      <main className="reader-layout">
        <aside className="reader-side-panel reader-chapter-panel" aria-label="Mục lục chương">
          <div className="reader-panel-head">
            <span className="badge badge-crimson">Đang đọc</span>
            <strong>Mục lục</strong>
          </div>
          <div className="reader-chapter-list">
            {readerChapters.map((chapter, index) => (
              <a className={`reader-chapter-link ${index === 11 ? "active" : ""}`} href={index === 11 ? "#reader-current" : "/reader-mode"} key={chapter}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{chapter}</strong>
                {index > 8 ? <Icon name="lock" /> : null}
              </a>
            ))}
          </div>
          <div className="reader-side-stat">
            <span>Tiến độ truyện</span>
            <strong>12/72 chương</strong>
            <div className="progress"><span style={{ width: "17%" }} /></div>
          </div>
        </aside>

        <article className="reader-content reader-paper" id="reader-current">
          <div className="reader-chapter-kicker">Mưa Trên Thành Cũ · Linh An</div>
          <h1>Chương 12: Lời hẹn dưới mái ga</h1>
          <div className="reader-meta-strip">
            <span><Icon name="book" />1.284 từ</span>
            <span><Icon name="bell" />Cập nhật hôm nay</span>
            <span><Icon name="shield" />Chống sao chép bật</span>
          </div>
          <p>Mưa rơi trên mái tôn thành những nhịp gõ đều, giống tiếng đồng hồ cũ trong căn phòng thư ký mà An từng làm việc.</p>
          <p>Không ai đến đúng hẹn. Nhưng trong những ngày thành phố vừa học cách thở lại, việc một lời hẹn còn tồn tại đã là một điều đủ để người ta tiếp tục đi qua đêm dài.</p>
          <blockquote>Có những cuộc gặp không cần người kia xuất hiện, chỉ cần lời hẹn còn nằm nguyên trên trang giấy.</blockquote>
          <p>An mở bức thư. Chữ viết quen thuộc hiện ra, nghiêng nhẹ về phía phải. Cô đọc chậm từng dòng, như thể chỉ cần đọc nhanh hơn một nhịp thì quá khứ sẽ kịp rơi khỏi tay.</p>
          <p>Ở cuối sân ga, ánh đèn vàng đổ xuống nền gạch ướt. Một người nhân viên đi ngang, kéo theo chiếc xe hành lý cũ, tiếng bánh xe nghiến qua khe gạch nghe như một câu trả lời bị bỏ quên.</p>
          <div className="locked-preview">
            <p>Cô nghe tiếng còi tàu vang lên ở sân ga phía bắc, và trong khoảnh khắc ấy, mọi câu hỏi của mười năm trước cùng quay lại.</p>
            <p>Người đàn ông đặt chiếc vali xuống, quay người về phía cô.</p>
          </div>
          <div className="reader-unlock-panel">
            <div>
              <span className="badge badge-amber"><Icon name="lock" />Premium</span>
              <h2>Phần còn lại thuộc chương premium</h2>
              <p>Nâng cấp Membership để đọc tiếp, lưu tiến độ giữa các thiết bị và không bị gián đoạn khi chuyển chương.</p>
            </div>
            <a className="button button-primary" href="/membership"><Icon name="lock" />Mở khóa chương</a>
          </div>
        </article>

        <aside className="reader-side-panel reader-tools-panel" aria-label="Công cụ đọc">
          <div className="tabs">
            <button className="tab-button active" type="button" data-tab-trigger="reader-display">Hiển thị</button>
            <button className="tab-button" type="button" data-tab-trigger="reader-notes">Ghi chú</button>
          </div>
          <div className="tab-panel active stack" data-tab-panel="reader-display">
            <div className="field">
              <label>Cỡ chữ</label>
              <input className="range" type="range" min="16" max="24" defaultValue="18" aria-label="Cỡ chữ" data-reader-range />
            </div>
            <div className="grid grid-2 reader-compact-grid">
              <label className="button" htmlFor="readerThemeSwitch" data-reader-theme-toggle data-toast="Đã đổi chế độ nền đọc.">Nền tối</label>
              <label className="button" htmlFor="readerWidthSwitch" data-reader-width-toggle data-toast="Đã chuyển độ rộng vùng đọc.">Rộng hơn</label>
            </div>
            <div className="notice"><Icon name="eye" />Gợi ý: giữ dòng chữ khoảng 70 ký tự để đọc lâu không mỏi mắt.</div>
          </div>
          <div className="tab-panel stack" data-tab-panel="reader-notes">
            <div className="reader-note-list">
              {readerNotes.map((note) => <div className="reader-note" key={note}>{note}</div>)}
            </div>
            <button className="button" type="button" data-toast="Đã thêm ghi chú mẫu tại đoạn hiện tại."><Icon name="edit" />Thêm ghi chú</button>
            <button className="button button-soft" type="button" data-toast="Đã báo lỗi chương cho đội vận hành." data-toast-type="warning">Báo lỗi chương</button>
          </div>
        </aside>
      </main>
      <div role="navigation" className="reader-toolbar" aria-label="Thanh chuyển chương">
        <a className="button" href="/story-detail">Trước</a>
        <span className="reader-toolbar-status">Chương 12 · 68%</span>
        <button className="button" type="button" data-modal-open="membershipModal"><Icon name="lock" />Mở khóa</button>
        <a className="button button-primary" href="/reader-mode">Sau</a>
      </div>
      <MembershipModal />
    </div>
    </>
  );
}

export function ForumScreen() {
  return (
    <AppShell activeId="s08">
      <section className="layout-right"><main className="stack"><div className="panel panel-pad"><div className="inline-actions" style={{ justifyContent: "space-between" }}><div className="tabs"><button className="tab-button active">Tất cả</button><button className="tab-button">Theo truyện</button><button className="tab-button">Cộng đồng</button></div><button className="button button-primary" type="button" data-modal-open="threadModal"><Icon name="edit" />Tạo chủ đề</button></div></div><div className="list">{["Dự đoán thân phận người gửi thư ở chương 12", "Góc tìm truyện có bối cảnh chiến tranh nhẹ nhàng", "Bạn thích lịch cập nhật truyện như thế nào?", "Mưa Trên Thành Cũ vừa có chương mới"].map((title, index) => <a className="list-item" href="#thread" key={title}><div><h3 className="list-title">{title}</h3><div className="list-meta">bởi {["Minh Nguyệt", "Phương Linh", "Hải Đăng", "YAG"][index]} · {24 - index * 3} trả lời · cập nhật {index + 1} phút trước</div></div><span className={`badge ${index === 3 ? "badge-blue" : "badge-crimson"}`}>{index === 3 ? "Mới" : "Sôi nổi"}</span></a>)}</div></main><aside className="panel panel-pad stack" id="thread"><h2 className="section-title">Thảo luận nổi bật</h2><div className="notice"><Icon name="bell" />12 người đang tham gia cuộc thảo luận này.</div><div className="field"><label>Trả lời</label><textarea className="textarea" defaultValue="Mình có một giả thuyết khác..." /></div><div className="inline-actions"><button className="button" data-toast="Đã bật định dạng chữ đậm cho đoạn đang chọn.">B</button><button className="button" data-toast="Đã chèn khung trích dẫn.">Trích dẫn</button><button className="button button-primary" data-toast="Trả lời đã được gửi.">Gửi</button></div></aside></section><ThreadModal />
    </AppShell>
  );
}

export function MembershipScreen() {
  const plans = [
    { name: "Tháng", code: "monthly", price: "39Kđ", description: "Linh hoạt cho độc giả mới" },
    { name: "Quý", code: "quarterly", price: "79Kđ", description: "Lựa chọn tiết kiệm nhất" },
    { name: "Năm", code: "yearly", price: "199Kđ", description: "Dành cho người đọc thường xuyên" },
  ];
  return (
    <AppShell activeId="s09">
      <div className="notice success" style={{ marginBottom: 24 }}><Icon name="check" />Gói hiện tại: Miễn phí · Bạn vẫn có thể đọc toàn bộ chương miễn phí và lưu truyện vào thư viện.</div>
      <div className="action-strip" style={{ marginBottom: 24 }}><div><strong>Thanh toán an toàn qua cổng trung gian</strong><div className="list-meta">YAG không lưu số thẻ hoặc tài khoản ngân hàng của người dùng.</div></div><button className="button" data-toast="Bạn có thể hủy gia hạn trong Cài đặt Membership.">Cách hủy gia hạn</button></div>
      <section className="grid grid-3">{plans.map((plan, index) => <article className="panel panel-pad stack" style={index === 1 ? { borderColor: "var(--crimson)" } : undefined} key={plan.code}><span className={`badge ${index === 1 ? "badge-crimson" : "badge-blue"}`}>{index === 1 ? "Phổ biến nhất" : plan.name}</span><h2 className="page-title" style={{ fontSize: 24 }}>{plan.name}</h2><div className="metric-value">{plan.price}</div><p className="section-subtitle">{plan.description}</p><div className="list">{["Mở khóa chương premium", "Không quảng cáo khi đọc", "Tìm kiếm AI nâng cao", "Lưu tiến độ đọc"].map((item) => <div className="list-item" key={item}><span>{item}</span><Icon name="check" /></div>)}</div><a className={`button ${index === 1 ? "button-primary" : ""}`} href="/payment-result" data-billing-plan={plan.code}>Đăng ký ngay</a></article>)}</section>
    </AppShell>
  );
}

export function PaymentScreen() {
  return (
    <AppShell activeId="s10">
      <section className="layout-right"><main className="panel panel-pad stack"><div className="tabs"><button className="tab-button active" type="button" data-tab-trigger="paid">Thành công</button><button className="tab-button" type="button" data-tab-trigger="failed">Thất bại</button></div><div className="tab-panel active" data-tab-panel="paid"><div className="empty-state" style={{ borderStyle: "solid" }}><span className="badge badge-green"><Icon name="check" />Thanh toán thành công</span><h2 className="page-title" style={{ fontSize: 24 }}>Gói Quý đã được kích hoạt</h2><p>Mã giao dịch VNP-260518-7842 · Hết hạn ngày 18/08/2026.</p><div className="inline-actions"><a className="button button-primary" href="/reader-mode">Bắt đầu đọc</a><a className="button" href="/library">Về thư viện</a></div></div></div><div className="tab-panel" data-tab-panel="failed"><div className="empty-state" style={{ borderStyle: "solid" }}><span className="badge badge-red"><Icon name="close" />Thanh toán thất bại</span><h2 className="page-title" style={{ fontSize: 24 }}>Ngân hàng chưa xác nhận giao dịch</h2><ErrorGuide title="Cách xử lý" items={["Kiểm tra số dư và hạn mức thanh toán online của thẻ.", "Thử lại sau 2 phút hoặc chọn phương thức thanh toán khác.", "Nếu tài khoản đã bị trừ tiền, gửi mã giao dịch cho hỗ trợ để đối soát."]} /></div></div></main><aside className="panel panel-pad stack"><h2 className="section-title">Thông tin giao dịch</h2><div className="list"><div className="list-item"><span>Phương thức</span><strong>VNPAY</strong></div><div className="list-item"><span>Gói</span><strong>Quý</strong></div><div className="list-item"><span>Số tiền</span><strong>79.000đ</strong></div><div className="list-item"><span>Trạng thái</span><span className="badge badge-green">Đã thanh toán</span></div></div><div className="notice warning"><Icon name="bell" />Nếu ngân hàng đã trừ tiền nhưng gói chưa kích hoạt, hãy gửi mã giao dịch cho hỗ trợ.</div></aside></section>
    </AppShell>
  );
}

export function LibraryScreen() {
  return (
    <AppShell activeId="s11">
      <section className="metric-grid" style={{ marginBottom: 24 }}><MetricCard label="Đang theo dõi" value="18" /><MetricCard label="Đang đọc" value="7" /><MetricCard label="Hoàn thành" value="12" /><MetricCard label="Tuần này" value="9h" /></section>
      <section className="panel panel-pad stack"><div className="inline-actions" style={{ justifyContent: "space-between" }}><div className="tabs"><button className="tab-button active" data-tab-trigger="following">Đang theo dõi</button><button className="tab-button" data-tab-trigger="completed">Đã hoàn thành</button><button className="tab-button" data-tab-trigger="history">Lịch sử đọc</button></div><button className="button" data-toast="Thư viện đã được làm mới.">Làm mới</button></div><div className="tab-panel active" data-tab-panel="following"><QuickStories count={8} /></div><div className="tab-panel" data-tab-panel="completed"><QuickStories count={6} /></div><div className="tab-panel" data-tab-panel="history"><div className="list">{stories.slice(2, 8).map((story, index) => <ReadingCard story={story} index={index} key={story.title} />)}</div></div></section>
    </AppShell>
  );
}

export function ProfileScreen() {
  return (
    <AppShell activeId="s12">
      <section className="panel panel-pad stack">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="inline-actions">
            <div className="brand-logo" style={{ background: "var(--crimson)", color: "#fff" }}>MN</div>
            <div>
              <h2 className="page-title" style={{ fontSize: 24, fontFamily: "var(--font-inter), 'Inter', sans-serif", fontWeight: 700 }}>Minh Nguyệt</h2>
              <p className="section-subtitle" style={{ margin: "4px 0 0" }}>Độc giả · TP.HCM · Thích truyện trinh thám nhẹ và lịch sử</p>
            </div>
          </div>
          <a className="button button-primary" href="/account-settings">Chỉnh sửa hồ sơ</a>
        </div>
        <p>Không gian hồ sơ cá nhân dùng để theo dõi tiến độ đọc, truyện đang lưu và hoạt động cộng đồng gần đây.</p>
        <div className="metric-grid">
          <MetricCard label="Đang theo dõi" value="18" />
          <MetricCard label="Đã đọc" value="42" />
          <MetricCard label="Bình luận" value="126" />
          <MetricCard label="Membership" value="Free" />
        </div>
      </section>
      <section className="panel panel-pad stack" style={{ marginTop: 24 }}>
        <div className="tabs">
          <button className="tab-button active" data-tab-trigger="reading">Đang đọc</button>
          <button className="tab-button" data-tab-trigger="activity">Hoạt động</button>
        </div>
        <div className="tab-panel active" data-tab-panel="reading"><QuickStories count={6} /></div>
        <div className="tab-panel" data-tab-panel="activity">
          <div className="list">
            <div className="list-item"><span>Đã lưu Mưa Trên Thành Cũ vào thư viện</span><span className="badge badge-blue">Thư viện</span></div>
            <div className="list-item"><span>Vừa trả lời một chủ đề trong diễn đàn</span><span className="badge badge-green">Cộng đồng</span></div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

export function SettingsScreen() {
  return (
    <AppShell activeId="s13">
      <section className="layout-filter">
        <aside className="panel panel-pad settings-nav-panel">
          <div className="sidebar-section">
            <div className="sidebar-label">Cài đặt</div>
            {settingSections.map((item, index) => (
              <a className={`sidebar-link ${index === 0 ? "active" : ""}`} href={`#setting-${item.id}`} key={item.id}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </aside>
        <main className="stack">
          <section className="panel panel-pad stack" id="setting-profile">
            <div>
              <h2 className="section-title">Hồ sơ cá nhân</h2>
              <p className="section-subtitle">Các thông tin hiển thị công khai và dùng cho liên hệ tài khoản.</p>
            </div>
            <div className="grid grid-2">
              <div className="field"><label>Tên hiển thị</label><input className="input" defaultValue="Minh Nguyệt" /></div>
              <div className="field"><label>Email</label><input className="input" type="email" defaultValue="reader@yag.vn" /></div>
              <div className="field"><label>Bút danh</label><input className="input" defaultValue="Nguyệt đọc truyện" /></div>
              <div className="field"><label>Thành phố</label><input className="input" defaultValue="TP.HCM" /></div>
            </div>
            <div className="field"><label>Giới thiệu ngắn</label><textarea className="textarea" defaultValue="Thích truyện có nhịp chậm, ký ức sâu và nhân vật trưởng thành rõ ràng." /></div>
            <button className="button button-primary" type="button" data-toast="Đã lưu hồ sơ cá nhân.">Lưu hồ sơ</button>
          </section>

          <section className="panel panel-pad stack" id="setting-security">
            <div>
              <h2 className="section-title">Mật khẩu & bảo mật</h2>
              <p className="section-subtitle">Cập nhật mật khẩu để tăng cường bảo vệ an toàn cho tài khoản cá nhân.</p>
            </div>
            <div className="grid grid-3">
              <PasswordField id="currentPassword" label="Mật khẩu hiện tại" value="Current2026!" />
              <PasswordField id="newPassword" label="Mật khẩu mới" value="NewSecure2026!" />
              <PasswordField id="confirmNewPassword" label="Xác nhận" value="NewSecure2026!" />
            </div>
            <div className="notice"><Icon name="shield" />Mật khẩu của bạn luôn được mã hóa đa lớp và tuyệt đối bảo mật trên hệ thống YAG.</div>
            <ErrorGuide title="Không đổi được mật khẩu?" items={["Mật khẩu hiện tại phải đúng với tài khoản đang đăng nhập.", "Mật khẩu mới cần tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.", "Hai ô mật khẩu mới phải trùng nhau."]} />
            <button className="button" type="button" data-toast="Đã gửi yêu cầu cập nhật mật khẩu.">Cập nhật mật khẩu</button>
          </section>

          <section className="panel panel-pad stack" id="setting-reader">
            <div>
              <h2 className="section-title">Tùy chọn đọc</h2>
              <p className="section-subtitle">Những thiết lập ảnh hưởng trực tiếp tới trải nghiệm đọc truyện.</p>
            </div>
            <div className="grid grid-2">
              <div className="field"><label>Chủ đề đọc mặc định</label><select className="select" defaultValue="warm"><option value="warm">Nền giấy ấm</option><option value="light">Sáng</option><option value="dark">Tối</option></select></div>
              <div className="field"><label>Cỡ chữ mặc định</label><select className="select" defaultValue="18"><option value="16">16px</option><option value="18">18px</option><option value="20">20px</option></select></div>
              <label className="checkbox-row"><input type="checkbox" defaultChecked /> Lưu tiến độ đọc giữa các thiết bị</label>
              <label className="checkbox-row"><input type="checkbox" defaultChecked /> Ẩn nội dung premium chưa mở khóa trong danh sách chương</label>
            </div>
          </section>

          <section className="panel panel-pad stack" id="setting-notifications">
            <div>
              <h2 className="section-title">Thông báo</h2>
              <p className="section-subtitle">Chỉ giữ lại các lựa chọn thông báo đúng với tài khoản người dùng.</p>
            </div>
            <div className="grid grid-2">
              <label className="checkbox-row"><input type="checkbox" defaultChecked /> Truyện theo dõi có chương mới</label>
              <label className="checkbox-row"><input type="checkbox" defaultChecked /> Cảnh báo bảo mật và đăng nhập mới</label>
              <label className="checkbox-row"><input type="checkbox" defaultChecked /> Phản hồi mới trong diễn đàn</label>
              <label className="checkbox-row"><input type="checkbox" /> Email khuyến mãi Membership</label>
            </div>
            <button className="button button-soft" type="button" data-toast="Đã lưu thiết lập thông báo.">Lưu thông báo</button>
          </section>
        </main>
      </section>
    </AppShell>
  );
}

export function NotificationsScreen() {
  return (
    <AppShell activeId="s14">
      <section className="panel panel-pad stack">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="tabs">
            <button className="tab-button active">Tất cả</button>
            <button className="tab-button">Hệ thống</button>
            <button className="tab-button">Cộng đồng</button>
          </div>
          <button className="button" data-toast="Đã đánh dấu tất cả là đã đọc.">Đánh dấu đã đọc</button>
        </div>
        <div className="list">
          {[
            ["Truyện theo dõi có chương mới", "Mưa Trên Thành Cũ vừa cập nhật chương 12.", "Chương mới", "/story-detail"],
            ["Membership sắp hết hạn", "Bạn đang dùng gói Free; có thể nâng cấp để đọc chương premium.", "Tài khoản", "/membership"],
            ["Có 3 trả lời mới trong chủ đề của bạn", "Độc giả đang thảo luận về chương mới nhất.", "Cộng đồng", "/forum"],
          ].map((item, index) => (
            <a className="list-item" href={item[3]} key={item[0]}>
              <div><h3 className="list-title">{item[0]}</h3><div className="list-meta">{item[1]}</div></div>
              <span className={`badge ${index === 0 ? "badge-green" : index === 1 ? "badge-amber" : "badge-blue"}`}>{item[2]}</span>
            </a>
          ))}
        </div>
        <ErrorGuide title="Không nhận được thông báo?" items={["Kiểm tra quyền thông báo của trình duyệt.", "Vào Cài đặt để bật lại email hoặc thông báo cộng đồng."]} />
      </section>
    </AppShell>
  );
}

function MembershipModal() {
  return <div className="modal-backdrop" data-modal="membershipModal"><div className="modal-card stack"><h2 className="section-title">Mở khóa chương premium</h2><p>Gói Membership giúp đọc tiếp chương khóa, không lưu thông tin thẻ trên hệ thống YAG.</p><div className="inline-actions"><a className="button button-primary" href="/membership">Xem gói</a><button className="button" data-modal-close>Đóng</button></div></div></div>;
}

function ThreadModal() {
  return <div className="modal-backdrop" data-modal="threadModal"><div className="modal-card stack"><h2 className="section-title">Tạo chủ đề mới</h2><div className="field"><label>Tiêu đề</label><input className="input" defaultValue="Góc bàn luận chương mới của Mưa Trên Thành Cũ" /></div><div className="field"><label>Nội dung</label><textarea className="textarea" defaultValue="Mình muốn thảo luận về chi tiết lá thư bị trả lại ở cuối chương." /></div><ErrorGuide title="Nếu không đăng được chủ đề" items={["Tiêu đề cần ít nhất 10 ký tự và không trùng chủ đề vừa đăng.", "Nội dung không được chứa thông tin cá nhân hoặc từ ngữ công kích."]} /><div className="inline-actions"><button className="button button-primary" data-toast="Chủ đề đã được đăng.">Đăng chủ đề</button><button className="button" data-modal-close>Đóng</button></div></div></div>;
}
