from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List

from app.api import deps
from app.models import User, Profile
from app.models.forum import ForumPost, ForumReply, ForumPostLike
from app.schemas.forum import (
    ForumPostCreate,
    ForumPostResponse,
    ForumReplyCreate,
    ForumReplyResponse,
)

router = APIRouter()


@router.get("/posts", response_model=List[ForumPostResponse])
def get_forum_posts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Lấy danh sách bài viết diễn đàn cùng bình luận và trạng thái thích."""
    posts = (
        db.query(ForumPost)
        .options(
            joinedload(ForumPost.user),
            joinedload(ForumPost.replies).joinedload(ForumReply.user),
            joinedload(ForumPost.likes),
        )
        .order_by(ForumPost.created_at.desc())
        .all()
    )

    response_data = []
    for p in posts:
        # Check if current user liked this post
        liked = any(l.user_id == current_user.id for l in p.likes)

        # Get author profile info
        author_profile = db.query(Profile).filter(Profile.user_id == p.user_id).first()
        author_name = author_profile.display_name if author_profile else p.user.username
        author_avatar = author_profile.avatar_url if author_profile else None
        is_verified = p.user.role in ["admin", "author"]

        # Map replies
        reply_list = []
        for r in p.replies:
            r_profile = db.query(Profile).filter(Profile.user_id == r.user_id).first()
            r_name = r_profile.display_name if r_profile else r.user.username
            r_avatar = r_profile.avatar_url if r_profile else None
            r_verified = r.user.role in ["admin", "author"]

            reply_list.append(
                ForumReplyResponse(
                    id=r.id,
                    post_id=r.post_id,
                    user_id=r.user_id,
                    username=r.user.username,
                    display_name=r_name,
                    avatar_url=r_avatar,
                    is_verified=r_verified,
                    content=r.content,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
            )

        response_data.append(
            ForumPostResponse(
                id=p.id,
                user_id=p.user_id,
                authorName=author_name,
                authorAvatar=author_avatar,
                isVerified=is_verified,
                content=p.content,
                likes=p.likes_count,
                liked=liked,
                replies=reply_list,
                createdAt=p.created_at,
                updatedAt=p.updated_at,
            )
        )

    return response_data


@router.post("/posts", response_model=ForumPostResponse, status_code=status.HTTP_201_CREATED)
def create_forum_post(
    post_in: ForumPostCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Tạo bài viết mới trên diễn đàn."""
    new_post = ForumPost(
        user_id=current_user.id,
        content=post_in.content,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    author_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    author_name = author_profile.display_name if author_profile else current_user.username
    author_avatar = author_profile.avatar_url if author_profile else None
    is_verified = current_user.role in ["admin", "author"]

    return ForumPostResponse(
        id=new_post.id,
        user_id=new_post.user_id,
        authorName=author_name,
        authorAvatar=author_avatar,
        isVerified=is_verified,
        content=new_post.content,
        likes=0,
        liked=False,
        replies=[],
        createdAt=new_post.created_at,
        updatedAt=new_post.updated_at,
    )


@router.post("/posts/{post_id}/like")
def toggle_like_forum_post(
    post_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Thích hoặc bỏ thích một bài đăng."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    existing_like = (
        db.query(ForumPostLike)
        .filter(
            ForumPostLike.post_id == post_id,
            ForumPostLike.user_id == current_user.id,
        )
        .first()
    )

    if existing_like:
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        new_like = ForumPostLike(
            post_id=post_id,
            user_id=current_user.id,
        )
        db.add(new_like)
        post.likes_count += 1
        liked = True

    db.commit()
    return {"liked": liked, "likes": post.likes_count}


@router.post("/posts/{post_id}/replies", response_model=ForumReplyResponse, status_code=status.HTTP_201_CREATED)
def reply_to_forum_post(
    post_id: UUID,
    reply_in: ForumReplyCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """Bình luận/Trả lời một bài đăng."""
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    new_reply = ForumReply(
        post_id=post_id,
        user_id=current_user.id,
        content=reply_in.content,
    )
    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)

    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    display_name = profile.display_name if profile else current_user.username
    avatar_url = profile.avatar_url if profile else None
    is_verified = current_user.role in ["admin", "author"]

    return ForumReplyResponse(
        id=new_reply.id,
        post_id=new_reply.post_id,
        user_id=new_reply.user_id,
        username=current_user.username,
        display_name=display_name,
        avatar_url=avatar_url,
        is_verified=is_verified,
        content=new_reply.content,
        created_at=new_reply.created_at,
        updated_at=new_reply.updated_at,
    )
