export function bountyText(discussion) {
  const points = Number(discussion?.bountyPoints) || 0;
  if (points <= 0) return '';
  if (discussion.bountyStatus === 'awarded' || discussion.isResolved) {
    return `悬赏 ${points} 已发放`;
  }
  return `悬赏 ${points} 待采纳`;
}

export function bountyIsOpen(discussion) {
  const points = Number(discussion?.bountyPoints) || 0;
  return points > 0 && discussion?.bountyStatus !== 'awarded' && !discussion?.isResolved;
}
