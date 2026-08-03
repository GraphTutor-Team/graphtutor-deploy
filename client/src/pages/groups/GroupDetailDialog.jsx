import { useState } from 'react';
import GroupMembersTab from './GroupMembersTab';
import GroupBanksTab from './GroupBanksTab';
import GroupLeaderboardTab from './GroupLeaderboardTab';
import GroupPracticeTab from './GroupPracticeTab';
import GroupStudyRoomTab from './GroupStudyRoomTab';
import GroupSharedQuestionsTab from './GroupSharedQuestionsTab';
import GroupWrongSummaryTab from './GroupWrongSummaryTab';
import GroupAssignmentsTab from './GroupAssignmentsTab';
import GroupSettingsTab from './GroupSettingsTab';
import { getActiveMembers, getLinkedBanks, getGroupDetailTabs } from './groupDetailTabs';

export default function GroupDetailDialog({
  group,
  banks,
  onClose,
  onUpdate,
  isOwner,
  isTeacher,
  currentUserId,
}) {
  const [activeTab, setActiveTab] = useState('members');

  const activeMembers = getActiveMembers(group);
  const linkedBanks = getLinkedBanks(group, banks);
  const tabs = getGroupDetailTabs({
    activeMembersCount: activeMembers.length,
    linkedBanksCount: linkedBanks.length,
    isTeacher,
  });

  const tabButtonClass = (tabId) =>
    `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
      activeTab === tabId
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate pr-4">
            {group.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={tabButtonClass(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'members' && (
            <GroupMembersTab
              group={group}
              currentUserId={currentUserId}
              isTeacher={isTeacher}
              onUpdate={onUpdate}
            />
          )}
          {activeTab === 'banks' && (
            <GroupBanksTab
              group={group}
              banks={banks}
              isTeacher={isTeacher}
              onUpdate={onUpdate}
            />
          )}
          {activeTab === 'leaderboard' && (
            <GroupLeaderboardTab
              group={group}
              currentUserId={currentUserId}
              active={activeTab === 'leaderboard'}
            />
          )}
          {activeTab === 'practice' && (
            <GroupPracticeTab
              group={group}
              banks={banks}
              isTeacher={isTeacher}
              active={activeTab === 'practice'}
              onClose={onClose}
            />
          )}
          {activeTab === 'studyRoom' && (
            <GroupStudyRoomTab
              group={group}
              currentUserId={currentUserId}
              active={activeTab === 'studyRoom'}
            />
          )}
          {activeTab === 'sharedQuestions' && (
            <GroupSharedQuestionsTab
              group={group}
              currentUserId={currentUserId}
              isTeacher={isTeacher}
              active={activeTab === 'sharedQuestions'}
              onClose={onClose}
            />
          )}
          {activeTab === 'wrong' && isTeacher && (
            <GroupWrongSummaryTab
              group={group}
              active={activeTab === 'wrong'}
              onClose={onClose}
            />
          )}
          {activeTab === 'assignments' && (
            <GroupAssignmentsTab
              group={group}
              banks={banks}
              isTeacher={isTeacher}
              active={activeTab === 'assignments'}
              onClose={onClose}
            />
          )}
          {activeTab === 'settings' && (
            <GroupSettingsTab
              group={group}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onClose={onClose}
              onUpdate={onUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
