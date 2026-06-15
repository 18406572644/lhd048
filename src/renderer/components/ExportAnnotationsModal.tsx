import React, { useState } from 'react';
import { Modal, App as AntdApp, Checkbox } from 'antd';
import {
  FileWordOutlined,
  FileMarkdownOutlined,
} from '@ant-design/icons';
import useAppStore from '../store';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ExportAnnotationsModal: React.FC<Props> = ({ open, onClose }) => {
  const { message } = AntdApp.useApp();
  const annotations = useAppStore(state => state.annotations);
  const documents = useAppStore(state => state.documents);
  const [format, setFormat] = useState<'word' | 'md'>('word');
  const [selectAll, setSelectAll] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => documents.map(d => d.id));

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedDocIds(checked ? documents.map(d => d.id) : []);
  };

  const handleSelectDoc = (docId: string, checked: boolean) => {
    setSelectedDocIds(prev => {
      if (checked) {
        const next = [...prev, docId];
        setSelectAll(next.length === documents.length);
        return next;
      } else {
        setSelectAll(false);
        return prev.filter(i => i !== docId);
      }
    });
  };

  const handleExport = async () => {
    if (selectedDocIds.length === 0) {
      message.warning('请选择要导出批注的文档');
      return;
    }

    const relatedAnnotations = annotations.filter(a => selectedDocIds.includes(a.pdfId));
    if (relatedAnnotations.length === 0) {
      message.warning('所选文档没有批注');
      return;
    }

    const enriched = relatedAnnotations.map(a => {
      const doc = documents.find(d => d.id === a.pdfId);
      return { ...a, pdfName: doc?.fileName };
    });

    if (format === 'word') {
      const saveResult = await window.electronAPI.export.saveDialog({
        title: '导出批注为 Word',
        defaultPath: `批注导出-${new Date().toISOString().slice(0, 10)}.docx`,
        filters: [{ name: 'Word 文档', extensions: ['docx'] }],
      });
      if (!saveResult.success) return;
      
      if (saveResult.data) {
        const result = await window.electronAPI.export.toWord(enriched, saveResult.data);
        if (result.success) {
          message.success(`已导出 ${relatedAnnotations.length} 条批注`);
          onClose();
        } else {
          message.error(result.error || '导出失败');
        }
      }
    } else {
      const saveResult = await window.electronAPI.export.saveDialog({
        title: '导出批注为 Markdown',
        defaultPath: `批注导出-${new Date().toISOString().slice(0, 10)}.md`,
        filters: [{ name: 'Markdown 文件', extensions: ['md'] }],
      });
      if (!saveResult.success) return;

      if (saveResult.data) {
        const result = await window.electronAPI.export.toMarkdown(enriched, saveResult.data);
        if (result.success) {
          message.success(`已导出 ${relatedAnnotations.length} 条批注`);
          onClose();
        } else {
          message.error(result.error || '导出失败');
        }
      }
    }
  };

  const docAnnotationsCount = (docId: string) =>
    annotations.filter(a => a.pdfId === docId).length;

  return (
    <Modal
      title={<div style={{ fontSize: 16, fontWeight: 600 }}>导出批注</div>}
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
              { value: 'word', icon: <FileWordOutlined style={{ color: '#2a5699', fontSize: 32 }} />, name: 'Word 文档', desc: '.docx 格式，排版美观' },
              { value: 'md', icon: <FileMarkdownOutlined style={{ color: '#1e3a5f', fontSize: 32 }} />, name: 'Markdown', desc: '.md 格式，轻量通用' },
            ].map(item => (
              <div
                key={item.value}
                className={`format-card ${format === item.value ? 'selected' : ''}`}
                onClick={() => setFormat(item.value as any)}
              >
                <div className="format-icon">{item.icon}</div>
                <div className="format-name">{item.name}</div>
                <div className="format-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="export-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h4 style={{ marginBottom: 0 }}>
              选择文档 <span style={{ color: '#999', fontWeight: 400, fontSize: 12 }}>
                ({annotations.filter(a => selectedDocIds.includes(a.pdfId)).length} 条批注)
              </span>
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
          {documents.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              color: '#999',
              fontSize: 13,
            }}>
              暂无文档
            </div>
          ) : (
            documents.map(doc => {
              const count = docAnnotationsCount(doc.id);
              const disabled = count === 0;
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: '#fff',
                    border: '1px solid #EDE8E0',
                    borderRadius: 6,
                    marginBottom: 4,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                  }}
                  onClick={() => !disabled && handleSelectDoc(doc.id, !selectedDocIds.includes(doc.id))}
                >
                  <Checkbox
                    checked={selectedDocIds.includes(doc.id)}
                    onChange={(e) => !disabled && handleSelectDoc(doc.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                  />
                  <div style={{
                    width: 32,
                    height: 36,
                    background: '#fef0f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontWeight: 700,
                    color: '#e74c3c',
                    flexShrink: 0,
                  }}>
                    PDF
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#2D2D2D',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {doc.fileName}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: '#999',
                      marginTop: 2,
                    }}>
                      {doc.totalPages} 页
                    </div>
                  </div>
                  <div style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 10,
                    background: disabled ? '#f5f5f5' : 'rgba(30, 58, 95, 0.08)',
                    color: disabled ? '#bbb' : '#1e3a5f',
                    fontWeight: 500,
                  }}>
                    {count} 条批注
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ExportAnnotationsModal;
