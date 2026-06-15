import React, { useState, useEffect } from 'react';
import { Modal, Steps, App as AntdApp, Checkbox, Button } from 'antd';
import {
  UploadOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import useAppStore from '../store';

const { Step } = Steps;

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  folderId: string | null;
}

interface ImportFile {
  path: string;
  name: string;
  size: number;
  status: 'pending' | 'importing' | 'done' | 'error';
}

const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, folderId }) => {
  const { message } = AntdApp.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [extractBookmarks, setExtractBookmarks] = useState(true);
  const [extractAnnotations, setExtractAnnotations] = useState(true);

  const addDocument = useAppStore(state => state.addDocument);
  const addBookmark = useAppStore(state => state.addBookmark);
  const addAnnotation = useAppStore(state => state.addAnnotation);
  const loadDocuments = useAppStore(state => state.loadDocuments);
  const loadBookmarks = useAppStore(state => state.loadBookmarks);
  const loadAnnotations = useAppStore(state => state.loadAnnotations);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setFiles([]);
      setImporting(false);
    }
  }, [open]);

  const handleSelectFiles = async () => {
    try {
      const result = await window.electronAPI.pdf.selectFiles();
      if (result.success && result.data && result.data.length > 0) {
        const newFiles: ImportFile[] = result.data.map((filePath: string) => {
          const parts = filePath.split(/[\\/]/);
          const name = parts[parts.length - 1];
          return {
            path: filePath,
            name,
            size: 0,
            status: 'pending',
          };
        });
        setFiles(prev => {
          const existing = new Set(prev.map(f => f.path));
          const unique = newFiles.filter(f => !existing.has(f.path));
          return [...prev, ...unique];
        });
        if (files.length === 0 && newFiles.length > 0) {
          setCurrentStep(1);
        }
      }
    } catch (e: any) {
      message.error('选择文件失败');
    }
  };

  const handleImport = async () => {
    if (files.length === 0) {
      message.warning('请先选择要导入的文件');
      return;
    }

    setImporting(true);
    try {
      const targetFolderId = folderId || 'default-folder';
      const result = await window.electronAPI.pdf.import(
        files.map(f => f.path),
        targetFolderId
      );

      if (result.success) {
        const { documents, bookmarks, annotations } = result.data;
        
        documents.forEach((doc: any) => addDocument(doc));

        setFiles(prev => prev.map(f => ({ ...f, status: 'done' as const })));
        
        if (documents.length > 0) {
          message.success(
            `成功导入 ${documents.length} 个文档` +
            (bookmarks.length > 0 ? `，提取 ${bookmarks.length} 个书签` : '') +
            (annotations.length > 0 ? `，提取 ${annotations.length} 条批注` : '')
          );
        } else {
          message.info('文档已在库中，未重复导入');
        }

        await Promise.all([
          loadDocuments(targetFolderId),
          loadBookmarks(),
          loadAnnotations(),
        ]);

        setTimeout(() => {
          setCurrentStep(2);
        }, 500);
      } else {
        message.error(result.error || '导入失败');
      }
    } catch (e: any) {
      console.error('Import error:', e);
      message.error('导入失败：' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    onClose();
  };

  const handleFinish = () => {
    onClose();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal
      title={
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          <UploadOutlined style={{ color: '#1e3a5f', marginRight: 8 }} />
          批量导入 PDF 文档
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={640}
      maskClosable={!importing}
      closable={!importing}
      footer={
        currentStep === 2 ? [
          <Button
            key="finish"
            type="primary"
            onClick={handleFinish}
            style={{ background: '#1e3a5f' }}
          >
            完成
          </Button>
        ] : [
          <Button
            key="cancel"
            onClick={handleClose}
            disabled={importing}
          >
            取消
          </Button>,
          <Button
            key="next"
            type="primary"
            onClick={currentStep === 0 ? handleSelectFiles : handleImport}
            loading={importing}
            disabled={currentStep === 1 && files.length === 0}
            style={{ background: currentStep === 1 ? '#1e3a5f' : undefined }}
          >
            {currentStep === 0 ? '选择文件' : (importing ? '导入中...' : '开始导入')}
          </Button>,
        ]
      }
    >
      <div className="import-modal">
        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '选择', icon: currentStep >= 0 ? <UploadOutlined /> : undefined },
            { title: '确认', icon: currentStep >= 1 ? <FilePdfOutlined /> : undefined },
            { title: '完成', icon: currentStep >= 2 ? <CheckCircleOutlined /> : undefined },
          ]}
        />

        <div className="step-container">
          {currentStep === 0 && (
            <div style={{
              border: '2px dashed #D4CFc8',
              borderRadius: 12,
              padding: '48px 24px',
              textAlign: 'center',
              background: '#FAF8F5',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onClick={handleSelectFiles}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1e3a5f';
                e.currentTarget.style.background = '#F5F2ED';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D4CFc8';
                e.currentTarget.style.background = '#FAF8F5';
              }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(30, 58, 95, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <UploadOutlined style={{ fontSize: 28, color: '#1e3a5f' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
                点击选择 PDF 文件
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>
                支持多选，或拖拽文件到此处
              </div>
            </div>
          )}

          {currentStep >= 1 && (
            <>
              {files.length > 0 ? (
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-icon">PDF</div>
                      <div className="file-info">
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{formatSize(file.size)}</div>
                      </div>
                      <div className="file-status">
                        {file.status === 'done' ? '已导入' : '待导入'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: 13,
                  border: '1px dashed #E5E1DB',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
                  onClick={handleSelectFiles}
                >
                  暂无文件，点击选择
                </div>
              )}

              {currentStep === 1 && files.length > 0 && (
                <div style={{ marginTop: 20, padding: 16, background: '#FAF8F5', borderRadius: 8 }}>
                  <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 13 }}>
                    提取选项
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Checkbox
                      checked={extractBookmarks}
                      onChange={(e) => setExtractBookmarks(e.target.checked)}
                    >
                      自动提取 PDF 原有书签
                    </Checkbox>
                    <Checkbox
                      checked={extractAnnotations}
                      onChange={(e) => setExtractAnnotations(e.target.checked)}
                    >
                      自动提取 PDF 批注（高亮、下划线、注释等）
                    </Checkbox>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <div style={{
              padding: '32px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(82, 196, 26, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                导入完成
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                文档已添加到文件柜，可以开始阅读和管理了
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImportModal;
