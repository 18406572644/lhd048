import React, { useState, useMemo } from 'react';
import { Modal, Radio, App as AntdApp, Checkbox } from 'antd';
import {
  FileMarkdownOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import useAppStore from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ExportBookmarksModal: React.FC<Props> = ({ open, onClose }) => {
  const { message } = AntdApp.useApp();
  const bookmarks = useAppStore(state => state.bookmarks);
  const documents = useAppStore(state => state.documents);
  const [format, setFormat] = useState<'json' | 'md' | 'csv'>('md');
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const enrichedBookmarks = useMemo(() => {
    return bookmarks.map(bm => {
      const doc = documents.find(d => d.id === bm.pdfId);
      return {
        ...bm,
        pdfName: (doc as any)?.pdfName || doc?.fileName || '未知文档',
      };
    });
  }, [bookmarks, documents]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedBookmarkIds(checked ? bookmarks.map(b => b.id) : []);
  };

  const handleSelectBookmark = (id: string, checked: boolean) => {
    setSelectedBookmarkIds(prev => {
      if (checked) {
        const next = [...prev, id];
        setSelectAll(next.length === bookmarks.length);
        return next;
      } else {
        setSelectAll(false);
        return prev.filter(i => i !== id);
      }
    });
  };

  const handleExport = async () => {
    if (selectedBookmarkIds.length === 0) {
      message.warning('请选择要导出的书签');
      return;
    }

    const extMap = { json: '.json', md: '.md', csv: '.csv' };
    const nameMap = { json: 'JSON', md: 'Markdown', csv: 'CSV' };

    const saveResult = await window.electronAPI.export.saveDialog({
      title: `导出书签为 ${nameMap[format]}`,
      defaultPath: `书签导出-${new Date().toISOString().slice(0, 10)}${extMap[format]}`,
      filters: [{ name: nameMap[format], extensions: [format] }],
    });

    if (saveResult.success && saveResult.data) {
      const result = await window.electronAPI.bookmark.export(
        selectedBookmarkIds,
        format,
        saveResult.data
      );

      if (result.success) {
        message.success(`已导出 ${selectedBookmarkIds.length} 个书签`);
        onClose();
      } else {
        message.error(result.error || '导出失败');
      }
    }
  };

  return (
    <Modal
      title={<div style={{ fontSize: 16, fontWeight: 600 }}>批量导出书签</div>}
      open={open}
      onCancel={onClose}
      onOk={handleExport}
      okText="导出"
      cancelText="取消"
      width={640}
      okButtonProps={{ style: { background: '#1e3a5f' } }}
    >
      <div className="export-panel">
        <div className="export-section">
        <h4>导出格式</h4>
        <div className="format-grid">
          {[
            { value: 'md', icon: <FileMarkdownOutlined style={{ color: '#1e3a5f' }} />, name: 'Markdown', desc: '适合阅读和分享' },
            { value: 'json', icon: <FileTextOutlined style={{ color: '#3468a3' }} />, name: 'JSON', desc: '数据完整，可重新导入' },
            { value: 'csv', icon: <FileExcelOutlined style={{ color: '#52c41a' }} />, name: 'CSV', desc: '可用 Excel 打开' },
          ].map(item => (
            <div
              key={item.value}
              className={`format-card ${format === item.value ? 'selected' : ''}`}
              onClick={() => setFormat(item.value as any)}
            >
              <div className="format-icon" style={{ fontSize: 28 }}>
                {item.icon}
              </div>
              <div className="format-name">{item.name}</div>
              <div className="format-desc">{item.desc}</div>
            </div>
          ))}
        </div>
        </div>

        <div className="export-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ marginBottom: 0 }}>
              选择书签 <span style={{ color: '#999', fontWeight: 400, fontSize: 12 }}>({selectedBookmarkIds.length}/{bookmarks.length})</span>
            </h4>
            <Checkbox checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)}>
              全选
            </Checkbox>
          </div>
        </div>

        <div style={{
          maxHeight: 280,
          overflowY: 'auto',
          border: '1px solid #E5E1DB',
          borderRadius: 8,
          padding: 8,
          background: '#FAF8F5',
        }}>
          {bookmarks.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: '#999',
              fontSize: 13,
            }}>
              暂无可导出的书签
            </div>
          ) : (
            enrichedBookmarks.map((bm: any) => (
              <div
                key={bm.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: '#fff',
                  border: '1px solid #EDE8E0',
                  borderRadius: 6,
                  marginBottom: 4,
                  cursor: 'pointer',
                }}
                onClick={() => handleSelectBookmark(bm.id, !selectedBookmarkIds.includes(bm.id))}
              >
                <Checkbox
                  checked={selectedBookmarkIds.includes(bm.id)}
                  onChange={(e) => handleSelectBookmark(bm.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div
                  style={{
                    width: 4,
                    height: 18,
                    borderRadius: 2,
                    background: bm.color,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#2D2D2D',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {bm.title}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#999',
                    marginTop: 2,
                  }}>
                    {bm.pdfName} · 第 {bm.pageNumber} 页 · {bm.category}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExportBookmarksModal;
