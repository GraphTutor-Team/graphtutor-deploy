/**
 * GraphTutor V3.0 - 共同学习内容组件
 * 
 * 作用：显示共同学习的题目和知识点
 */

export default function FriendCommonContentSection({ commonContent }) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          共同练习的题目 ({commonContent.totalCommonQuestions || 0})
        </h3>
        {commonContent.commonQuestions && commonContent.commonQuestions.length > 0 ? (
          <div className="space-y-2">
            {commonContent.commonQuestions.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 dark:bg-slate-700 rounded border dark:border-slate-600"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {item.question?.title || '未知题目'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  练习次数: {item.practiceCount}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">暂无共同练习的题目</p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          共同学习的知识点 ({commonContent.totalCommonNodes || 0})
        </h3>
        {commonContent.commonKnowledgeNodes && commonContent.commonKnowledgeNodes.length > 0 ? (
          <div className="space-y-2">
            {commonContent.commonKnowledgeNodes.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 dark:bg-slate-700 rounded border dark:border-slate-600"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {item.node?.name || '未知知识点'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  练习次数: {item.practiceCount}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">暂无共同学习的知识点</p>
        )}
      </div>
    </div>
  );
}

