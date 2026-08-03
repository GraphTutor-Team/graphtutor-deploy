import { useState, useEffect } from 'react';
import {
  getStudyRoomPresence,
  enterStudyRoom,
  leaveStudyRoom,
  studyRoomHeartbeat,
  updateStudyRoomStatus,
} from '../../api/v3/groups';
import { toast } from '../../utils/toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function GroupStudyRoomTab({ group, currentUserId, active }) {
  const [studyRoomPresence, setStudyRoomPresence] = useState([]);
  const [studyRoomLoading, setStudyRoomLoading] = useState(false);
  const [isInStudyRoom, setIsInStudyRoom] = useState(false);
  const [studyRoomGoal, setStudyRoomGoal] = useState('');
  const [studyRoomHeartbeatRef, setStudyRoomHeartbeatRef] = useState(null);

  const loadStudyRoomPresence = () => {
    if (group?._id) {
      getStudyRoomPresence(group._id).then(setStudyRoomPresence).catch(() => {});
    }
  };

  useEffect(() => {
    if (!active || !group?._id) return;
    setStudyRoomLoading(true);
    getStudyRoomPresence(group._id)
      .then((list) => {
        setStudyRoomPresence(list);
        const me = list.find((p) => p.userId === currentUserId);
        if (me) {
          setIsInStudyRoom(true);
          setStudyRoomGoal(me.todayGoal || '');
        }
      })
      .catch(() => setStudyRoomPresence([]))
      .finally(() => setStudyRoomLoading(false));
  }, [active, group?._id, currentUserId]);

  useEffect(() => {
    return () => {
      if (studyRoomHeartbeatRef) clearInterval(studyRoomHeartbeatRef);
    };
  }, [studyRoomHeartbeatRef]);

  const handleEnterStudyRoom = async () => {
    try {
      await enterStudyRoom(group._id, { todayGoal: studyRoomGoal.trim() || undefined });
      setIsInStudyRoom(true);
      toast.success('已进入自习室');
      loadStudyRoomPresence();
      const heartbeatInterval = setInterval(() => {
        studyRoomHeartbeat(group._id).catch(() => {});
        loadStudyRoomPresence();
      }, 2 * 60 * 1000);
      setStudyRoomHeartbeatRef(heartbeatInterval);
    } catch (err) {
      toast.error(err.message || '进入失败');
    }
  };

  const handleLeaveStudyRoom = async () => {
    try {
      if (studyRoomHeartbeatRef) {
        clearInterval(studyRoomHeartbeatRef);
        setStudyRoomHeartbeatRef(null);
      }
      await leaveStudyRoom(group._id);
      setIsInStudyRoom(false);
      toast.success('已离开自习室');
      setStudyRoomPresence((prev) => prev.filter((p) => p.userId !== currentUserId));
    } catch (err) {
      toast.error(err.message || '离开失败');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        与组内成员一起自习，互相监督。进入后每 2 分钟自动刷新在线状态，5 分钟无活动将自动视为离开。
      </p>
      {!isInStudyRoom ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">今日学习目标（选填）</label>
            <input
              type="text"
              value={studyRoomGoal}
              onChange={(e) => setStudyRoomGoal(e.target.value)}
              placeholder="例如：完成高数第十章练习"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            onClick={handleEnterStudyRoom}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            进入自习室
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={studyRoomGoal}
              onChange={(e) => setStudyRoomGoal(e.target.value)}
              placeholder="今日学习目标"
              className="flex-1 min-w-[160px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <button
              onClick={() => {
                updateStudyRoomStatus(group._id, { todayGoal: studyRoomGoal }).then(() => loadStudyRoomPresence()).catch(() => {});
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              更新今日目标
            </button>
            <button
              onClick={handleLeaveStudyRoom}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              离开自习室
            </button>
          </div>
        </div>
      )}
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">当前在线 ({studyRoomPresence.length})</h4>
        {studyRoomLoading ? (
          <div className="flex justify-center py-4"><LoadingSpinner /></div>
        ) : studyRoomPresence.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">暂无人在自习室</p>
        ) : (
          <ul className="space-y-2">
            {studyRoomPresence.map((p) => (
              <li
                key={p.userId}
                className={`flex items-center justify-between p-2 rounded-lg ${p.userId === currentUserId ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-50 dark:bg-slate-700/50'}`}
              >
                <span className="font-medium">{p.name}</span>
                {p.userId === currentUserId && <span className="text-xs text-emerald-600 dark:text-emerald-400">(我)</span>}
                {p.todayGoal && <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]" title={p.todayGoal}>{p.todayGoal}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
