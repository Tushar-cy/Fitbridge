import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { uploadToCloudinary } from '../config/cloudinary';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { parsePagination, buildMeta } from '../utils/pagination';

export async function createPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) { sendError(res, 'Unauthorized: Missing user ID', 401); return; }

    let mediaUrls: string[] = req.body.media_urls ?? [];
    const mediaType: string = req.body.media_type ?? 'text';
    const content: string = req.body.content ?? '';

    if (!content && mediaUrls.length === 0 && !req.file) {
      sendError(res, 'Post must contain either text or media', 400); return;
    }

    console.log(`[FeedController.createPost] User ${userId} creating ${mediaType} post.`);

    if (req.file) {
      const resourceType = mediaType === 'video' ? 'video' : 'image';
      console.log(`[FeedController.createPost] Uploading ${resourceType} to Cloudinary...`);
      const url = await uploadToCloudinary(req.file.path, `fitbridge/feed/${userId}`, resourceType);
      mediaUrls = [url];
    }

    const { data: post, error } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        author_id: userId,
        content: content,
        media_urls: mediaUrls,
        media_type: mediaType,
        moderation_status: 'approved',   // Auto-approve for MVP demo
      })
      .select('*, author:profiles(full_name, avatar_url, role)')
      .single();

    if (error) {
      console.error('[FeedController.createPost] Supabase Error:', error);
      throw error;
    }

    console.log(`[FeedController.createPost] Post ${post.id} successfully created by ${userId}`);
    sendCreated(res, post, 'Post submitted — pending moderation');
  } catch (err) { 
    console.error('[FeedController.createPost] Unexpected Error:', err);
    next(err); 
  }
}

export async function getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req);
    const now = new Date().toISOString();

    const { data: posts, count, error } = await supabaseAdmin
      .from('feed_posts')
      .select('*, author:profiles(full_name, avatar_url, role)', { count: 'exact' })
      .eq('moderation_status', 'approved')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;
    sendSuccess(res, posts, 'Feed fetched', 200, buildMeta(count ?? 0, page, limit));
  } catch (err) { next(err); }
}

export async function getPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: post, error } = await supabaseAdmin
      .from('feed_posts')
      .select('*, author:profiles(full_name, avatar_url, role)')
      .eq('id', req.params.id)
      .single();
    if (error || !post) { sendError(res, 'Post not found', 404); return; }
    sendSuccess(res, post);
  } catch (err) { next(err); }
}

export async function toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const postId = req.params.id;
    if (!userId) { sendError(res, 'User ID is missing', 401); return; }
    if (!postId) { sendError(res, 'Post ID is required', 400); return; }

    console.log(`[FeedController.toggleLike] User ${userId} toggling like on Post ${postId}`);

    const { data: existing } = await supabaseAdmin
      .from('post_likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();

    if (existing) {
      await supabaseAdmin.from('post_likes').delete().eq('id', existing.id);
      await supabaseAdmin.rpc('decrement_likes', { post_id: postId });
      console.log(`[FeedController.toggleLike] Unliked post ${postId}`);
      sendSuccess(res, { liked: false });
    } else {
      await supabaseAdmin.from('post_likes').insert({ post_id: postId, user_id: userId });
      await supabaseAdmin.rpc('increment_likes', { post_id: postId });
      console.log(`[FeedController.toggleLike] Liked post ${postId}`);
      sendSuccess(res, { liked: true });
    }
  } catch (err) { next(err); }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const postId = req.params.id;
    const content = req.body.text;
    
    if (!userId) { sendError(res, 'User ID is missing', 401); return; }
    if (!postId) { sendError(res, 'Post ID is required', 400); return; }
    if (!content) { sendError(res, 'Comment text is required', 400); return; }

    console.log(`[FeedController.addComment] User ${userId} adding comment to Post ${postId}`);

    const { data: comment, error } = await supabaseAdmin
      .from('post_comments')
      .insert({ post_id: postId, author_id: userId, content: content })
      .select('*, author:profiles(full_name, avatar_url)')
      .single();
      
    if (error) {
      console.error('[FeedController.addComment] DB Error:', error);
      throw error;
    }
    
    console.log(`[FeedController.addComment] Comment ${comment.id} created successfully`);
    sendCreated(res, comment, 'Comment added');
  } catch (err) { next(err); }
}

export async function deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: post } = await supabaseAdmin
      .from('feed_posts').select('author_id').eq('id', req.params.id).single();
    if (!post) { sendError(res, 'Post not found', 404); return; }

    const isOwner = post.author_id === req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) { sendError(res, 'Not authorised', 403); return; }

    await supabaseAdmin.from('feed_posts').delete().eq('id', req.params.id);
    sendSuccess(res, null, 'Post deleted');
  } catch (err) { next(err); }
}
