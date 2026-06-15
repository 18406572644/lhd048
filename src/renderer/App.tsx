import React, { useEffect, useState } from 'react';
import { App as AntdApp } from 'antd';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import ContentArea from './components/ContentArea';
import useAppStore from './store';

const App: React.FC = () => {
  const { message } = AntdApp.useApp();
  const loadAll = useAppStore(state => state.loadAll);
  const isLoading = useAppStore(state => state.isLoading);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await loadAll();
      } catch (e) {
        console.error('Failed to initialize:', e);
        message.error('初始化失败');
      } finally {
        setInitialized(true);
      }
    };

    init();
  }, []);

  if (!initialized) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAF8F5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #1e3a5f, #3468a3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(30, 58, 95, 0.3)',
          }}>
            P
          </div>
          <div style={{ fontSize: 16, color: '#6B6B6B', fontWeight: 500 }}>
            PDF Cabinet 正在加载...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <TitleBar />
      <div className="app-main">
        <Sidebar />
        <ContentArea />
      </div>
    </div>
  );
};

export default App;
