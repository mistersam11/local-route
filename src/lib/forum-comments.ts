export const MAX_COMMENT_VISUAL_DEPTH = 7;

export type ForumCommentAuthor = {
  id: number;
  username: string;
  profileImageUrl: string | null;
};

export type ForumCommentTreeSource = {
  id: number;
  parentCommentId: number | null;
  body: string;
  createdAt: Date | string;
  user: ForumCommentAuthor;
};

export type ForumCommentTreeNode<T extends ForumCommentTreeSource> = T & {
  replies: Array<ForumCommentTreeNode<T>>;
  replyCount: number;
};

export type ForumCommentRenderRow<T extends ForumCommentTreeSource> = {
  comment: ForumCommentTreeNode<T>;
  depth: number;
  hiddenReplyCount: number;
  isCollapsed: boolean;
  visualDepth: number;
};

function createdAtTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

function countReplies<T extends ForumCommentTreeSource>(
  node: ForumCommentTreeNode<T>
) {
  node.replyCount = node.replies.reduce(
    (count, reply) => count + 1 + countReplies(reply),
    0
  );

  return node.replyCount;
}

export function visualCommentDepth(depth: number) {
  return Math.min(Math.max(depth, 0), MAX_COMMENT_VISUAL_DEPTH);
}

export function buildForumCommentTree<T extends ForumCommentTreeSource>(
  comments: readonly T[]
) {
  const orderedComments = [...comments].sort(
    (first, second) =>
      createdAtTime(first.createdAt) - createdAtTime(second.createdAt) ||
      first.id - second.id
  );
  const nodes = new Map<number, ForumCommentTreeNode<T>>();

  for (const comment of orderedComments) {
    nodes.set(comment.id, {
      ...comment,
      replies: [],
      replyCount: 0
    });
  }

  const roots: Array<ForumCommentTreeNode<T>> = [];

  for (const comment of orderedComments) {
    const node = nodes.get(comment.id);
    if (!node) continue;

    const parent =
      comment.parentCommentId && comment.parentCommentId !== comment.id
        ? nodes.get(comment.parentCommentId)
        : null;

    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const root of roots) {
    countReplies(root);
  }

  return roots;
}

export function flattenForumCommentTree<T extends ForumCommentTreeSource>(
  comments: readonly ForumCommentTreeNode<T>[],
  collapsedCommentIds: ReadonlySet<number> = new Set(),
  depth = 0
): Array<ForumCommentRenderRow<T>> {
  return comments.flatMap((comment) => {
    const isCollapsed = collapsedCommentIds.has(comment.id);
    const row: ForumCommentRenderRow<T> = {
      comment,
      depth,
      hiddenReplyCount: isCollapsed ? comment.replyCount : 0,
      isCollapsed,
      visualDepth: visualCommentDepth(depth)
    };

    if (isCollapsed) {
      return [row];
    }

    return [
      row,
      ...flattenForumCommentTree(comment.replies, collapsedCommentIds, depth + 1)
    ];
  });
}
