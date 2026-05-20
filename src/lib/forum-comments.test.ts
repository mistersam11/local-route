import assert from "node:assert/strict";
import {
  MAX_COMMENT_VISUAL_DEPTH,
  buildForumCommentTree,
  flattenForumCommentTree
} from "./forum-comments";

const user = {
  id: 1,
  username: "tester",
  profileImageUrl: null
};

function comment(id: number, parentCommentId: number | null = null) {
  return {
    id,
    parentCommentId,
    body: `Comment ${id}`,
    createdAt: new Date(Date.UTC(2026, 4, 20, 12, id)),
    user
  };
}

function test(name: string, run: () => void) {
  run();
  console.log(`ok - ${name}`);
}

test("builds nested reply trees from flat comments", () => {
  const tree = buildForumCommentTree([
    comment(1),
    comment(2, 1),
    comment(3, 2),
    comment(4),
    comment(5, 1)
  ]);

  assert.deepEqual(
    tree.map((node) => node.id),
    [1, 4]
  );
  assert.deepEqual(
    tree[0].replies.map((node) => node.id),
    [2, 5]
  );
  assert.deepEqual(
    tree[0].replies[0].replies.map((node) => node.id),
    [3]
  );
  assert.equal(tree[0].replyCount, 3);
  assert.equal(tree[0].replies[0].replyCount, 1);
});

test("flattens recursive rendering order with depth metadata", () => {
  const tree = buildForumCommentTree([
    comment(1),
    comment(2, 1),
    comment(3, 2),
    comment(4),
    comment(5, 1)
  ]);
  const rows = flattenForumCommentTree(tree);

  assert.deepEqual(
    rows.map((row) => [row.comment.id, row.depth]),
    [
      [1, 0],
      [2, 1],
      [3, 2],
      [5, 1],
      [4, 0]
    ]
  );
});

test("collapses comment branches and reports hidden reply counts", () => {
  const tree = buildForumCommentTree([
    comment(1),
    comment(2, 1),
    comment(3, 2),
    comment(4),
    comment(5, 1)
  ]);
  const collapsedRootRows = flattenForumCommentTree(tree, new Set([1]));
  const collapsedMiddleRows = flattenForumCommentTree(tree, new Set([2]));

  assert.deepEqual(
    collapsedRootRows.map((row) => row.comment.id),
    [1, 4]
  );
  assert.equal(collapsedRootRows[0].isCollapsed, true);
  assert.equal(collapsedRootRows[0].hiddenReplyCount, 3);

  assert.deepEqual(
    collapsedMiddleRows.map((row) => row.comment.id),
    [1, 2, 5, 4]
  );
  assert.equal(collapsedMiddleRows[1].isCollapsed, true);
  assert.equal(collapsedMiddleRows[1].hiddenReplyCount, 1);
});

test("keeps deep threads renderable with capped visual indentation", () => {
  const comments = Array.from({ length: 40 }, (_item, index) =>
    comment(index + 1, index === 0 ? null : index)
  );
  const tree = buildForumCommentTree(comments);
  const rows = flattenForumCommentTree(tree);
  const deepestRow = rows.at(-1);

  assert.equal(tree[0].replyCount, 39);
  assert.equal(rows.length, 40);
  assert.equal(deepestRow?.depth, 39);
  assert.equal(deepestRow?.visualDepth, MAX_COMMENT_VISUAL_DEPTH);
});
