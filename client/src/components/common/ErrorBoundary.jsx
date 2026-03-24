/**
 * GraphTutor V3.0 - 错误边界组件
 * 
 * 功能：捕获子组件错误，显示友好的错误界面
 */

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false } = this.props;

      if (fallback) {
        return fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-2">
                出现了一些问题
              </h3>
              <p className="text-red-700 mb-4">
                页面加载时发生了错误，请刷新页面重试。
              </p>
              {showDetails && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-red-600 mb-2">
                    错误详情
                  </summary>
                  <pre className="text-xs bg-red-100 p-3 rounded overflow-auto max-h-48">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  重试
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                >
                  刷新页面
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

