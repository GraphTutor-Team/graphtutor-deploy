/** 群组详情 Tab 配置与辅助函数 */

export function getActiveMembers(group) {
  return group?.members?.filter((m) => m.status === 'active') || [];
}

export function getLinkedBanks(group, banks) {
  return (banks || []).filter((bank) =>
    group?.bankIds?.some((id) => id._id === bank._id || id === bank._id)
  );
}

export function getGroupDetailTabs({ activeMembersCount, linkedBanksCount, isTeacher }) {
  const tabs = [
    { id: 'members', label: `成员 (${activeMembersCount})` },
    { id: 'banks', label: `关联题库 (${linkedBanksCount})` },
    { id: 'leaderboard', label: '排行榜' },
    { id: 'practice', label: '共同练习' },
    { id: 'studyRoom', label: '自习室' },
    { id: 'sharedQuestions', label: '小组题库' },
    { id: 'wrong', label: '错题集锦', visible: isTeacher },
    { id: 'assignments', label: '作业' },
    { id: 'settings', label: '设置' },
  ];
  return tabs.filter((tab) => tab.visible !== false);
}
