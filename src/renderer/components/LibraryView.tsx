import React, { useState, useEffect, useMemo } from 'react';
import { Button, Tooltip, Dropdown, MenuProps, App as AntdApp, Select, Input } from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  PushpinOutlined,
  EditOutlined,
  StarOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExportOutlined,
  SearchOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import useAppStore from '../store';
import ImportModal from './ImportModal';
import ExportAnnotationsModal from './ExportAnnotationsModal';

const { Option } = Select;

const LibraryView: React.FC = () => {
  const { message, modal } = AntdApp.useApp();

  const documents = useAppStore(state => state.documents);
  const bookmarks = useAppStore(state => state.bookmarks);
  const annotations = useAppStore(state => state.annotations);
  const folders = useAppStore(state => state.folders);
  const tags = useAppStore(state => state.tags);
  const selectedFolderId = useAppStore(state => state.selectedFolderId);
  const searchKeyword = useAppStore(state => state.searchKeyword);

  const openDocument = useAppStore(state => state.openDocument);
  const removeDocument = useAppStore(state => state.removeDocument);
  const loadDocuments = useAppStore(state => state.loadDocuments);
  const updateDocument = useAppStore(state => state.updateDocument);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportAnnotationsOpen, setExportAnnotationsOpen] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'size' | 'progress'>('time');
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    loadDocuments(selectedFolderId);
  }, [selectedFolderId]);

  const totalPages = documents.reduce((sum, d) => sum + d.totalPages, 0);
  const readPages = documents.reduce((sum, d) => sum + Math.floor(d.totalPages * (d.readProgress || 0)), 0);

  const filteredDocuments = useMemo(() => {
    let docs = [...documents];
    const keyword = (searchKeyword || localSearch).trim().toLowerCase();

    if (keyword) {
      const matchedBookmarkPdfIds = new Set(
        bookmarks
          .filter(b =>
            b.title.toLowerCase().includes(keyword) ||
            b.description?.toLowerCase().includes(keyword)
          )
          .map(b => b.pdfId)
      );
      const matchedAnnotationPdfIds = new Set(
        annotations
          .filter(a => a.content?.toLowerCase().includes(keyword))
          .map(a => a.pdfId)
      );

      docs = docs.filter(d =>
        d.fileName.toLowerCase().includes(keyword) ||
        d.tags.some(t => t.toLowerCase().includes(keyword)) ||
        matchedBookmarkPdfIds.has(d.id) ||
        matchedAnnotationPdfIds.has(d.id)
      );
    }

    switch (sortBy) {
      case 'name':
        docs.sort((a, b) => a.fileName.localeCompare(b.fileName));
        break;
      case 'size':
        docs.sort((a, b) => b.fileSize - a.fileSize);
        break;
      case 'progress':
        docs.sort((a, b) => (b.readProgress || 0) - (a.readProgress || 0));
        break;
      default:
        docs.sort((a, b) => b.importTime - a.importTime);
    }

    return docs;
  }, [documents, searchKeyword, localSearch, sortBy, bookmarks, annotations]);

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return '默认文件柜';
    const folder = folders.find(f => f.id === folderId);
    return folder?.name || '默认文件柜';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      return `今天 ${hours}:${mins}`;
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    }
  };

  const handleDelete = (doc: any) => {
    modal.confirm({
      title: '确认移除文档',
      content: (
        <div>
          <p>确定要从库中移除「{doc.fileName}」吗？</p>
          <p style={{ color: '#999', fontSize: 12, marginBottom: 0 }}>
            此操作不会删除本地原文件，仅移除库中的记录、书签和批注。
          </p>
        </div>
      ),
      okText: '移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await window.electronAPI.pdf.delete(doc.id);
        if (result.success) {
          removeDocument(doc.id);
          message.success('文档已移除');
        } else {
          message.error(result.error || '移除失败');
        }
      },
    });
  };

  const handleMoveToFolder = async (docId: string, folderId: string) => {
    const result = await window.electronAPI.pdf.update(docId, { folderId });
    if (result.success) {
      updateDocument(docId, { folderId });
      if (selectedFolderId && selectedFolderId !== folderId) {
        loadDocuments(selectedFolderId);
      }
      message.success('已移动文件柜');
    }
  };

  const getDocMenuItems = (doc: any): MenuProps['items'] => [
    {
      key: 'open',
      icon: <EyeOutlined />,
      label: '打开阅读',
      onClick: () => openDocument(doc.id),
    },
    { type: 'divider' as const },
    {
      key: 'move',
      icon: <FolderOpenOutlined />,
      label: '移动到',
      children: folders.map(f => ({
        key: f.id,
        label: f.name,
        onClick: () => handleMoveToFolder(doc.id, f.id),
      })),
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '从库中移除',
      danger: true,
      onClick: () => handleDelete(doc),
    },
  ];

  return (
    <div className="library-view">
      <div className="library-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0 }}>
            {searchKeyword ? `搜索: "${searchKeyword}"` : getFolderName(selectedFolderId)}
          </h2>
          <span style={{ color: '#999', fontSize: 13 }}>
            共 {filteredDocuments.length} 个文档
          </span>
        </div>
        <div className="library-actions">
          {searchKeyword || localSearch ? (
            <Input
              allowClear
              placeholder="搜索文档内容..."
              prefix={<SearchOutlined />}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              style={{ width: 220 }}
            />
          ) : null}
          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 130 }}
          >
            <Option value="time">按导入时间</Option>
            <Option value="name">按名称</Option>
            <Option value="size">按大小</Option>
            <Option value="progress">按阅读进度</Option>
          </Select>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={() => setExportAnnotationsOpen(true)}
            disabled={documents.length === 0}
          >
            导出批注
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
          >
            导入 PDF
          </Button>
        </div>
      </div>

      <div className="library-stats">
        <div className="stat-card">
          <div className="stat-icon navy">
            <FilePdfOutlined />
          </div>
          <div className="stat-info">
            <div className="stat-value">{documents.length}</div>
            <div className="stat-label">文档总数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <FileTextOutlined />
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalPages}</div>
            <div className="stat-label">总页数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <PushpinOutlined />
          </div>
          <div className="stat-info">
            <div className="stat-value">{bookmarks.length}</div>
            <div className="stat-label">书签</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <StarOutlined />
          </div>
          <div className="stat-info">
            <div className="stat-value">{Math.round((readPages / Math.max(totalPages, 1)) * 100)}%</div>
            <div className="stat-label">整体进度</div>
          </div>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FilePdfOutlined style={{ fontSize: 40, color: '#C8C4BD' }} />
          </div>
          <h3>
            {searchKeyword || localSearch ? '没有找到匹配的文档' : '还没有文档'}
          </h3>
          <p>
            {searchKeyword || localSearch
              ? '试试其他关键词，或清除搜索条件'
              : '点击「导入 PDF」按钮，将您的文档添加到文件柜中'
            }
          </p>
          {!(searchKeyword || localSearch) && (
            <Button
              type="primary"
              size="large"
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              立即导入
            </Button>
          )}
        </div>
      ) : (
        <div className="document-grid">
          {filteredDocuments.map(doc => {
            const docBookmarks = bookmarks.filter(b => b.pdfId === doc.id);
            const docAnnotations = annotations.filter(a => a.pdfId === doc.id);
            return (
              <div
                key={doc.id}
                className="document-card"
                onClick={() => openDocument(doc.id)}
              >
                <div className="card-thumbnail">
                  <div className="pdf-icon">
                    <div className="pdf-badge">PDF</div>
                    <div className="pdf-lines">
                      <div className="line" />
                      <div className="line" />
                      <div className="line" />
                    </div>
                  </div>
                  <div className="progress-overlay">
                    <div
                      className="progress-bar"
                      style={{ width: `${Math.round((doc.readProgress || 0) * 100)}%` }}
                    />
                  </div>
                  <div className="card-overlay">
                    <Tooltip title="打开阅读">
                      <button onClick={(e) => { e.stopPropagation(); openDocument(doc.id); }}>
                        <EyeOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title="更多操作">
                      <button onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          trigger={['click']}
                          menu={{ items: getDocMenuItems(doc) }}
                          placement="bottomRight"
                        >
                          <MoreOutlined />
                        </Dropdown>
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-title" title={doc.fileName}>
                    {doc.fileName}
                  </div>
                  <div className="card-meta">
                    <span className="meta-pages">
                      <FileTextOutlined style={{ fontSize: 10 }} />
                      {doc.totalPages} 页
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {docBookmarks.length > 0 && (
                        <span>
                          <PushpinOutlined style={{ fontSize: 10 }} /> {docBookmarks.length}
                        </span>
                      )}
                      {docAnnotations.length > 0 && (
                        <span>
                          <EditOutlined style={{ fontSize: 10 }} /> {docAnnotations.length}
                        </span>
                      )}
                    </span>
                    <span className="meta-progress">
                      {Math.round((doc.readProgress || 0) * 100)}%
                    </span>
                  </div>
                  <div style={{
                    marginTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 11,
                    color: '#999',
                  }}>
                    <span>{formatSize(doc.fileSize)}</span>
                    <span>{formatDate(doc.importTime)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        folderId={selectedFolderId}
      />

      <ExportAnnotationsModal
        open={exportAnnotationsOpen}
        onClose={() => setExportAnnotationsOpen(false)}
      />
    </div>
  );
};

export default LibraryView;
