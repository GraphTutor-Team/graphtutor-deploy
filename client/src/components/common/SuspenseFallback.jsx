/**
 * GraphTutor V3.0 - Suspense回退组件
 * 
 * 功能：用于React.lazy的加载回退
 */

import Loading from './Loading.jsx';

export default function SuspenseFallback({ text = '加载中...' }) {
  return <Loading text={text} fullScreen={false} />;
}

