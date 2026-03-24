/**
 * GraphTutor V3.0 - 专注学习计时器
 * 
 * 功能：番茄钟学习计时器，帮助用户专注学习
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from '../utils/toast';

const DEFAULT_DURATION = 25 * 60; // 25分钟（秒）
const SHORT_BREAK = 5 * 60; // 5分钟
const LONG_BREAK = 15 * 60; // 15分钟

export default function StudyTimer() {
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [customDuration, setCustomDuration] = useState(25); // 分钟
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    clearInterval(intervalRef.current);

    if (!isBreak) {
      // 学习时间结束，进入休息
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      // 每4个番茄钟后长休息
      const breakDuration = newSessionCount % 4 === 0 ? LONG_BREAK : SHORT_BREAK;
      setIsBreak(true);
      setTimeLeft(breakDuration);
      
      toast.success(`学习完成！休息 ${breakDuration / 60} 分钟`);
      
      // 播放提示音（如果浏览器支持）
      playNotificationSound();
    } else {
      // 休息结束，开始新的学习
      setIsBreak(false);
      setTimeLeft(DEFAULT_DURATION);
      toast.success('休息结束，开始新的学习！');
      playNotificationSound();
    }
  };

  const playNotificationSound = () => {
    // 使用Web Audio API播放提示音
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.log('无法播放提示音:', err);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? (sessionCount % 4 === 0 ? LONG_BREAK : SHORT_BREAK) : DEFAULT_DURATION);
  };

  const setCustomTimer = () => {
    if (customDuration < 1 || customDuration > 120) {
      toast.error('时长必须在1-120分钟之间');
      return;
    }
    setIsRunning(false);
    setTimeLeft(customDuration * 60);
    setIsBreak(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = ((DEFAULT_DURATION - timeLeft) / DEFAULT_DURATION) * 100;

  return (
    <div className="card p-6 bg-white dark:bg-slate-800 border dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {isBreak ? '⏸️ 休息时间' : '🍅 专注学习'}
        </h3>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          已完成 {sessionCount} 个番茄钟
        </span>
      </div>

      {/* 计时器显示 */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - (isBreak ? (timeLeft / (sessionCount % 4 === 0 ? LONG_BREAK : SHORT_BREAK)) : (timeLeft / DEFAULT_DURATION)))}`}
              className={`transition-all duration-1000 ${
                isBreak ? 'text-green-500' : 'text-blue-500'
              }`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {isBreak ? '休息中' : '学习中'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            开始
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            暂停
          </button>
        )}
        <button
          onClick={resetTimer}
          className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          重置
        </button>
      </div>

      {/* 自定义时长 */}
      <div className="border-t dark:border-slate-700 pt-4 mt-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="120"
            value={customDuration}
            onChange={(e) => setCustomDuration(parseInt(e.target.value) || 25)}
            className="w-20 px-2 py-1 border dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            disabled={isRunning}
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">分钟</span>
          <button
            onClick={setCustomTimer}
            disabled={isRunning}
            className="px-4 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            设置
          </button>
        </div>
      </div>
    </div>
  );
}

