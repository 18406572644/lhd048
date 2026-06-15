import React, { useState, useEffect } from 'react';
import { Input, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import useAppStore from '../store';

const { Search } = Input;

const MinimizeIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="5.5" width="9" height="1" fill="currentColor" />
  </svg>
);

const MaximizeIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
);

const RestoreIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3H7V1H1V7H3V3Z" fill="currentColor" opacity="0.3" />
    <rect x="4" y="4" width="7" height="7" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setSearchKeyword = useAppStore(state => state.setSearchKeyword);
  const searchKeyword = useAppStore(state => state.searchKeyword);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await window.electronAPI?.window?.isMaximized();
        setIsMaximized(!!maximized);
      } catch (e) {}
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.window?.minimize();
  };

  const handleMaximize = async () => {
    try {
      const result = await window.electronAPI?.window?.maximize();
      setIsMaximized(!!result);
    } catch (e) {}
  };

  const handleClose = () => {
    window.electronAPI?.window?.close();
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  return (
    <div className="app-titlebar">
      <div className="titlebar-left">
        <div className="app-logo">P</div>
        <span className="app-title">PDF Cabinet</span>
      </div>

      <div className="titlebar-center">
        <div className="global-search">
          <Search
            placeholder="搜索文档、书签、批注..."
            allowClear
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={handleSearch}
            prefix={<SearchOutlined style={{ color: '#999' }} />}
            style={{ borderRadius: 6 }}
          />
        </div>
      </div>

      <div className="titlebar-right">
        <div className="window-controls">
          <Tooltip title="最小化" placement="bottom">
            <button onClick={handleMinimize}>
              <MinimizeIcon />
            </button>
          </Tooltip>
          <Tooltip title={isMaximized ? '还原' : '最大化'} placement="bottom">
            <button onClick={handleMaximize}>
              {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
          </Tooltip>
          <Tooltip title="关闭" placement="bottom">
            <button className="close-btn" onClick={handleClose}>
              <CloseIcon />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
