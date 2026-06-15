import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { AppStoreProvider } from './store';
import './styles/global.less';

const theme = {
  token: {
    colorPrimary: '#1e3a5f',
    colorInfo: '#1e3a5f',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Roboto, sans-serif',
    colorBgBase: '#FAF8F5',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBorder: '#E5E1DB',
    colorTextBase: '#2D2D2D',
    colorTextSecondary: '#6B6B6B',
    colorTextTertiary: '#999999',
  },
  components: {
    Layout: {
      headerBg: '#FAF8F5',
      bodyBg: '#FAF8F5',
      siderBg: '#F5F2ED',
    },
    Menu: {
      darkItemBg: '#F5F2ED',
      darkSubMenuItemBg: '#EDEAE4',
      darkItemColor: '#2D2D2D',
      darkItemSelectedBg: '#1e3a5f',
      darkItemSelectedColor: '#FFFFFF',
      darkItemHoverColor: '#1e3a5f',
      darkItemHoverBg: '#E8E3DC',
      itemBg: 'transparent',
      itemColor: '#2D2D2D',
      itemSelectedBg: '#1e3a5f',
      itemSelectedColor: '#FFFFFF',
      itemHoverColor: '#1e3a5f',
      itemHoverBg: '#E8E3DC',
    },
    Button: {
      colorPrimary: '#1e3a5f',
      colorPrimaryHover: '#2a4d7a',
      colorPrimaryActive: '#1a3252',
      borderRadius: 4,
      controlHeight: 36,
    },
    Card: {
      colorBorderSecondary: '#E5E1DB',
      borderRadius: 6,
    },
    Input: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 4,
      controlHeight: 36,
    },
    Tabs: {
      itemSelectedColor: '#1e3a5f',
      inkBarColor: '#1e3a5f',
      itemHoverColor: '#2a4d7a',
    },
    Modal: {
      titleFontSize: 16,
      headerBg: '#FAF8F5',
    },
    Tree: {
      directoryNodeSelectedBg: '#1e3a5f',
      directoryNodeSelectedColor: '#FFFFFF',
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntdApp>
        <AppStoreProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </AppStoreProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
