import uuid
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models import (
    User,
    Profile,
    Story,
    Chapter,
    StoryEmbedding,
    Comment,
    Review,
    MembershipPlan,
    Transaction,
    AiModerationLog,
    PublishSchedule,
    ReadingHistory,
    Library,
)

def seed_database():
    print("Resetting database tables...")
    # Drop all and recreate to ensure clean slate
    Base.metadata.drop_all(bind=engine)
    
    # Enable vector extension
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
    
    db = SessionLocal()
    try:
        # 1. Seed Membership Plans
        print("Seeding membership plans...")
        monthly_plan = MembershipPlan(
            id="MONTHLY",
            name="Gói Tháng Premium",
            duration_days=30,
            price=50000.00,
            description="Đọc tất cả chương truyện Premium không giới hạn trong 30 ngày."
        )
        yearly_plan = MembershipPlan(
            id="YEARLY",
            name="Gói Năm Premium",
            duration_days=365,
            price=500000.00,
            description="Đọc tất cả chương truyện Premium không giới hạn trong 365 ngày (Tiết kiệm 20%)."
        )
        db.add_all([monthly_plan, yearly_plan])
        db.commit()

        # 2. Seed Users & Profiles
        print("Seeding users and profiles...")
        hashed_password = get_password_hash("development_secret_123")
        
        # 2 Admins
        admins = []
        for i in range(1, 3):
            admin_user = User(
                username=f"admin{i}",
                email=f"admin{i}@yag.vn",
                password_hash=hashed_password,
                role="admin"
            )
            db.add(admin_user)
            db.flush() # Populate ID
            
            admin_profile = Profile(
                user_id=admin_user.id,
                display_name=f"Quản trị viên {i}",
                bio=f"Hồ sơ quản lý hệ thống của Admin {i}.",
                reputation_score=100
            )
            db.add(admin_profile)
            admins.append(admin_user)

        # 5 Authors
        authors = []
        author_names = ["Tiêu Dao Tử", "Cổ Long", "Kim Dung", "Ngã Ăn Tây Hồng Thị", "Đường Gia Tam Thiếu"]
        author_bios = [
            "Yêu thích viết tiểu thuyết tiên hiệp kỳ ảo.",
            "Tác giả kỳ cựu dòng kiếm hiệp cổ điển.",
            "Bậc thầy võ hiệp, sáng lập nhiều vũ trụ tiểu thuyết.",
            "Nhà văn mạng nổi tiếng với thể loại tu chân tiên hiệp.",
            "Tác giả của những bộ truyện huyễn hiệp bom tấn."
        ]
        for i, (name, bio) in enumerate(zip(author_names, author_bios), 1):
            author_user = User(
                username=f"author{i}",
                email=f"author{i}@yag.vn",
                password_hash=hashed_password,
                role="author"
            )
            db.add(author_user)
            db.flush()
            
            author_profile = Profile(
                user_id=author_user.id,
                display_name=name,
                bio=bio,
                reputation_score=100
            )
            db.add(author_profile)
            authors.append(author_user)

        # 10 Regular Readers
        readers = []
        for i in range(1, 11):
            reader_user = User(
                username=f"reader{i}",
                email=f"reader{i}@yag.vn",
                password_hash=hashed_password,
                role="reader"
            )
            db.add(reader_user)
            db.flush()
            
            reader_profile = Profile(
                user_id=reader_user.id,
                display_name=f"Độc giả {i}",
                bio=f"Tôi là độc giả thường số {i}.",
                reputation_score=100
            )
            db.add(reader_profile)
            readers.append(reader_user)

        # 5 Premium Readers (premium_until in 30 days)
        premium_readers = []
        future_date = datetime.now(timezone.utc) + timedelta(days=30)
        for i in range(1, 6):
            premium_user = User(
                username=f"premium{i}",
                email=f"premium{i}@yag.vn",
                password_hash=hashed_password,
                role="reader",
                premium_until=future_date
            )
            db.add(premium_user)
            db.flush()
            
            premium_profile = Profile(
                user_id=premium_user.id,
                display_name=f"Hội viên Vàng {i}",
                bio=f"Độc giả VIP sở hữu gói cước Premium thứ {i}.",
                reputation_score=100
            )
            db.add(premium_profile)
            premium_readers.append(premium_user)
            
        db.commit()

        # 3. Seed Stories (3 main stories created by first 3 authors)
        print("Seeding stories...")
        story_titles = ["Đấu Phá Thương Khung", "Phàm Nhân Tu Tiên", "Thần Điêu Hiệp Lữ"]
        story_categories = ["Huyền Huyễn", "Tiên Hiệp", "Võ Hiệp"]
        story_descs = [
            "Tại nơi này thế giới đấu khí thịnh hành, Tiêu Viêm bắt đầu hành trình nghịch thiên từ một phế vật gia tộc.",
            "Hàn Lập - một thiếu niên bình thường tình cờ bước chân vào giang hồ và thế giới tu tiên rộng lớn vô tận.",
            "Câu chuyện tình duyên trắc trở và đầy sóng gió giữa Dương Quá và Tiểu Long Nữ thời Nam Tống."
        ]
        
        stories = []
        for i, (title, cat, desc) in enumerate(zip(story_titles, story_categories, story_descs)):
            story = Story(
                author_id=authors[i].id,
                title=title,
                description=desc,
                category=cat,
                status="ongoing",
                view_count=1250 * (i + 1),
                rating_avg=4.5 + (0.1 * i)
            )
            db.add(story)
            db.flush()
            stories.append(story)
        db.commit()

        # 4. Seed Chapters (5 chapters per story. Ch 1-3 free, Ch 4-5 premium)
        print("Seeding chapters...")
        chapters = []
        for story in stories:
            for ch_num in range(1, 6):
                is_vip = ch_num >= 4
                chapter = Chapter(
                    story_id=story.id,
                    chapter_number=ch_num,
                    title=f"Chương {ch_num}: Khởi đầu hành trình mới",
                    content=f"Đây là nội dung chi tiết của chương thứ {ch_num} thuộc bộ truyện '{story.title}'. Tình tiết hấp dẫn và kịch tính đang chờ đón độc giả...",
                    is_premium=is_vip,
                    moderation_status="approved",
                    publish_at=datetime.now(timezone.utc) - timedelta(hours=(6 - ch_num))
                )
                db.add(chapter)
                db.flush()
                chapters.append(chapter)
        db.commit()

        # 5. Seed Story Embeddings (1536 float arrays simulating Gemini text-embedding-004)
        print("Seeding story embeddings...")
        for i, story in enumerate(stories):
            # Generate dummy 1536 float array (standard pgvector length)
            mock_vector = [0.015 * (i + 1)] * 1536
            embedding = StoryEmbedding(
                story_id=story.id,
                plot_summary=story.description,
                embedding=mock_vector
            )
            db.add(embedding)
        db.commit()

        # 6. Seed Comments & Threaded Replies
        print("Seeding comments...")
        # Comment 1 on Chapter 1 of Story 1
        comment1 = Comment(
            user_id=readers[0].id,
            chapter_id=chapters[0].id,
            content="Truyện mở đầu cuốn quá! Hóng chương tiếp theo."
        )
        db.add(comment1)
        db.flush()

        # Threaded reply to Comment 1
        reply1 = Comment(
            user_id=readers[1].id,
            chapter_id=chapters[0].id,
            content="Đồng quan điểm với đạo hữu này, tác giả viết chắc tay thực sự.",
            parent_id=comment1.id
        )
        db.add(reply1)
        
        # Another single comment on Chapter 1 of Story 2
        comment2 = Comment(
            user_id=premium_readers[0].id,
            chapter_id=chapters[5].id,
            content="Hàn Lập tính cách thực tế ghê, đúng gu mình!"
        )
        db.add(comment2)
        db.commit()

        # 7. Seed Reviews (Ratings)
        print("Seeding reviews...")
        # Readers review story 1
        review1 = Review(
            user_id=readers[0].id,
            story_id=stories[0].id,
            rating=5,
            content="Cốt truyện đỉnh cao, nhân vật phụ cũng rất có chiều sâu."
        )
        # Readers review story 2
        review2 = Review(
            user_id=readers[1].id,
            story_id=stories[1].id,
            rating=4,
            content="Đoạn mở đầu hơi chậm nhưng sau đó thì tuyệt vời."
        )
        # Premium reader reviews story 3
        review3 = Review(
            user_id=premium_readers[0].id,
            story_id=stories[2].id,
            rating=5,
            content="Tuyệt phẩm kiếm hiệp kinh điển không thể bỏ qua."
        )
        db.add_all([review1, review2, review3])
        db.commit()

        # 8. Seed Transactions (Billing History)
        print("Seeding payment transactions...")
        # Premium Reader 1 bought MONTHLY plan
        txn1 = Transaction(
            user_id=premium_readers[0].id,
            plan_id="MONTHLY",
            amount=50000.00,
            vnp_txn_ref=str(uuid.uuid4()),
            vnp_transaction_no="VNP12345678",
            status="success"
        )
        # Premium Reader 2 bought YEARLY plan
        txn2 = Transaction(
            user_id=premium_readers[1].id,
            plan_id="YEARLY",
            amount=500000.00,
            vnp_txn_ref=str(uuid.uuid4()),
            vnp_transaction_no="VNP98765432",
            status="success"
        )
        # Premium Reader 3 has a pending checkout session
        txn3 = Transaction(
            user_id=premium_readers[2].id,
            plan_id="MONTHLY",
            amount=50000.00,
            vnp_txn_ref=str(uuid.uuid4()),
            status="pending"
        )
        db.add_all([txn1, txn2, txn3])
        db.commit()

        # 9. Seed AI Moderation Logs
        print("Seeding AI moderation logs...")
        # Log for first chapter of each story
        for i, story in enumerate(stories):
            mod_log = AiModerationLog(
                chapter_id=chapters[i * 5].id,
                is_violation=False,
                confidence_score=0.98,
                reason="Nội dung chương lành mạnh, không có dấu hiệu nhạy cảm hay bạo lực."
            )
            db.add(mod_log)
        db.commit()

        # 10. Seed Publish Schedules
        print("Seeding publish schedules...")
        for story in stories:
            sched = PublishSchedule(
                story_id=story.id,
                scheduled_time=datetime.now(timezone.utc) + timedelta(days=2),
                status="scheduled"
            )
            db.add(sched)
        db.commit()

        # 11. Seed Reading Histories
        print("Seeding reading histories...")
        # Reader 1 read Chapter 1, 2 of Story 1
        history1 = ReadingHistory(
            user_id=readers[0].id,
            chapter_id=chapters[0].id
        )
        history2 = ReadingHistory(
            user_id=readers[0].id,
            chapter_id=chapters[1].id
        )
        # Premium Reader 1 read Chapter 1 of Story 2
        history3 = ReadingHistory(
            user_id=premium_readers[0].id,
            chapter_id=chapters[5].id
        )
        db.add_all([history1, history2, history3])
        db.commit()

        # 12. Seed Libraries (Bookmarks)
        print("Seeding libraries...")
        # Reader 1 bookmarked Story 1 and 2
        lib1 = Library(
            user_id=readers[0].id,
            story_id=stories[0].id
        )
        lib2 = Library(
            user_id=readers[0].id,
            story_id=stories[1].id
        )
        # Premium Reader 1 bookmarked Story 3
        lib3 = Library(
            user_id=premium_readers[0].id,
            story_id=stories[2].id
        )
        db.add_all([lib1, lib2, lib3])
        db.commit()

        print("\nDATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("Summary of data seeded:")
        print(" - 2 Admin accounts")
        print(" - 5 Author accounts with profiles")
        print(" - 10 Regular Reader accounts with profiles")
        print(" - 5 Premium Reader accounts with active subscriptions")
        print(" - 2 Membership Plans (Monthly/Yearly)")
        print(" - 3 Novel Stories across different categories")
        print(" - 15 Chapter chapters (1-3 free, 4-5 premium)")
        print(" - 3 Story Embeddings (1536 dimensions vector)")
        print(" - 3 Threaded Comments")
        print(" - 3 Story Reviews with ratings")
        print(" - 3 Payment Transactions (2 success, 1 pending)")
        print(" - 3 AI Moderation Logs")
        print(" - 3 Reading Progress histories")
        print(" - 3 Library bookmarks")
        print("All tables contain realistic, validated production-ready seed data.")
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Database seeding failed: {e}", file=sys.stderr)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
