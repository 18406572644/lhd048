import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Button,
  Tooltip,
  InputNumber,
  Modal,
  Form,
  Input,
  ColorPicker,
  Select,
  App as AntdApp,
  Tag,
  Dropdown,
  MenuProps,
  Empty,
} from 'antd';
import {
  CaretLeftOutlined,
  CaretRightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FileOutlined,
  PushpinOutlined,
  EditOutlined,
  PlusOutlined,
  EditFilled,
  DeleteOutlined,
  SearchOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  BookOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { PDFDocument, Bookmark, Annotation } from '../../shared/types';
import useAppStore from '../store';

const { TextArea } = Input;
const { Option } = Select;

interface PDFReaderProps {
  document: PDFDocument;
}

type SidebarTab = 'bookmarks' | 'annotations' | 'outline';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const ANNOTATION_TYPES: { value: Annotation['type']; label: string; icon: React.ReactNode }[] = [
  { value: 'highlight', label: '高亮', icon: <span style={{ background: '#ffff00', padding: '1px 6px', borderRadius: 2 }}>H</span> },
  { value: 'underline', label: '下划线', icon: <span style={{ textDecoration: 'underline' }}>U</span> },
  { value: 'strikeout', label: '删除线', icon: <span style={{ textDecoration: 'line-through' }}>S</span> },
  { value: 'text', label: '注释', icon: <MessageOutlined /> },
  { value: 'squiggly', label: '波浪线', icon: <span>〰️</span> },
];

const PRESET_COLORS = [
  '#ffff00', '#ff6b6b', '#51cf66', '#4dabf7', '#da77f2',
  '#ff922b', '#22b8cf', '#ffd43b', '#845ef7', '#1e3a5f',
];

const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  highlight: '高亮',
  underline: '下划线',
  strikeout: '删除线',
  text: '文本注释',
  squiggly: '波浪线',
};

const PDFReader: React.FC<PDFReaderProps> = ({ document: pdfData }) => {
  const { message, modal } = AntdApp.useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(pdfData.currentPage || 1);
  const [totalPages, setTotalPages] = useState(pdfData.totalPages || 0);
  const [zoom, setZoom] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('bookmarks');
  const [error, setError] = useState<string | null>(null);

  const [addBookmarkOpen, setAddBookmarkOpen] = useState(false);
  const [editBookmarkId, setEditBookmarkId] = useState<string | null>(null);
  const [bookmarkForm] = Form.useForm();

  const [addAnnotationOpen, setAddAnnotationOpen] = useState(false);
  const [editAnnotationId, setEditAnnotationId] = useState<string | null>(null);
  const [annotationForm] = Form.useForm();

  const bookmarks = useAppStore(state => state.bookmarks);
  const annotations = useAppStore(state => state.annotations);
  const tags = useAppStore(state => state.tags);

  const addBookmark = useAppStore(state => state.addBookmark);
  const updateBookmark = useAppStore(state => state.updateBookmark);
  const removeBookmark = useAppStore(state => state.removeBookmark);
  const addAnnotation = useAppStore(state => state.addAnnotation);
  const updateAnnotation = useAppStore(state => state.updateAnnotation);
  const removeAnnotation = useAppStore(state => state.removeAnnotation);
  const loadBookmarks = useAppStore(state => state.loadBookmarks);
  const loadAnnotations = useAppStore(state => state.loadAnnotations);

  const docBookmarks = useMemo(
    () => bookmarks.filter(b => b.pdfId === pdfData.id).sort((a, b) => a.pageNumber - b.pageNumber),
    [bookmarks, pdfData.id]
  );

  const docAnnotations = useMemo(
    () => annotations.filter(a => a.pdfId === pdfData.id).sort((a, b) => a.pageNumber - b.pageNumber),
    [annotations, pdfData.id]
  );

  useEffect(() => {
    loadBookmarks();
    loadAnnotations();
  }, [pdfData.id]);

  useEffect(() => {
    let cancelled = false;

    const initWorker = () => {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      } catch (e) {
        console.warn('Worker src setup warning:', e);
      }
    };

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        initWorker();

        const result = await window.electronAPI.pdf.getContent(pdfData.filePath);
        if (!result.success) {
          throw new Error(result.error || '无法读取 PDF 文件');
        }

        const data = new Uint8Array(result.data);
        
        const loadingTask = pdfjsLib.getDocument({
          data,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        loadingTask.onProgress = (progressData: any) => {
          if (progressData.total > 0) {
            setLoadingProgress(Math.round((progressData.loaded / progressData.total) * 100));
          }
        };

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        if (pdfData.currentPage && pdfData.currentPage <= pdf.numPages) {
          setCurrentPage(pdfData.currentPage);
        } else {
          setCurrentPage(1);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error('Failed to load PDF:', e);
        setError(e.message || '加载 PDF 失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfData.id, pdfData.filePath]);

  useEffect(() => {
    if (!pdfDoc) return;

    const pages = document.querySelectorAll('.pdf-page canvas');
    pages.forEach(p => p.remove());

    const canvasContainer = canvasContainerRef.current;
    if (!canvasContainer) return;

    let cancelled = false;
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-wrapper';

    const renderPages = async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) break;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: zoom });

          const pageDiv = document.createElement('div');
          pageDiv.className = 'pdf-page';
          pageDiv.dataset.pageNumber = String(i);
          pageDiv.style.marginBottom = i === pdfDoc.numPages ? '0' : '16px';
          pageDiv.style.width = `${viewport.width}px`;
          pageDiv.style.height = `${viewport.height}px`;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          const dpr = window.devicePixelRatio || 1;
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          context.scale(dpr, dpr);

          pageDiv.appendChild(canvas);
          wrapper.appendChild(pageDiv);

          page.render({
            canvasContext: context,
            viewport,
          }).promise.catch(e => console.error(`Page ${i} render error:`, e));
        } catch (e) {
          console.error(`Failed to render page ${i}:`, e);
        }
      }
    };

    if (canvasContainer.firstChild) {
      canvasContainer.removeChild(canvasContainer.firstChild);
    }
    canvasContainer.appendChild(wrapper);
    renderPages();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, zoom]);

  useEffect(() => {
    const saveProgress = setTimeout(() => {
      if (pdfDoc && currentPage > 0 && totalPages > 0) {
        const progress = currentPage / totalPages;
        window.electronAPI.progress.save(pdfData.id, currentPage, progress)
          .catch((e: any) => console.error('Save progress failed:', e));
      }
    }, 500);

    return () => clearTimeout(saveProgress);
  }, [currentPage, totalPages, pdfData.id, pdfDoc]);

  const goToPage = useCallback((pageNum: number) => {
    if (!pdfDoc || pageNum < 1 || pageNum > pdfDoc.numPages) return;
    setCurrentPage(pageNum);

    const pageEl = document.querySelector(`.pdf-page[data-page-number="${pageNum}"]`);
    if (pageEl && canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const pageTop = (pageEl as HTMLElement).offsetTop - 24;
      container.scrollTo({ top: pageTop, behavior: 'smooth' });
    }
  }, [pdfDoc]);

  const handleZoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[idx + 1]);
    }
  };

  const handleZoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) {
      setZoom(ZOOM_LEVELS[idx - 1]);
    }
  };

  const handleResetZoom = () => setZoom(1);

  const handleOpenAddBookmark = () => {
    setEditBookmarkId(null);
    bookmarkForm.resetFields();
    bookmarkForm.setFieldsValue({
      title: `第 ${currentPage} 页书签`,
      description: '',
      color: '#1e3a5f',
      tags: [],
      category: '自定义',
    });
    setAddBookmarkOpen(true);
  };

  const handleOpenEditBookmark = (bm: Bookmark) => {
    setEditBookmarkId(bm.id);
    bookmarkForm.setFieldsValue({
      title: bm.title,
      description: bm.description,
      color: bm.color,
      tags: bm.tags,
      category: bm.category,
    });
    setAddBookmarkOpen(true);
  };

  const handleBookmarkSubmit = async (values: any) => {
    try {
      const bookmarkData = {
        pdfId: pdfData.id,
        pageNumber: currentPage,
        title: values.title,
        description: values.description || '',
        color: values.color || '#1e3a5f',
        tags: values.tags || [],
        category: values.category || '自定义',
        position: { top: 0, left: 0, zoom },
      };

      if (editBookmarkId) {
        const result = await window.electronAPI.bookmark.update(editBookmarkId, bookmarkData);
        if (result.success) {
          updateBookmark(editBookmarkId, bookmarkData);
          message.success('书签已更新');
        } else {
          message.error(result.error || '更新失败');
          return;
        }
      } else {
        const result = await window.electronAPI.bookmark.create(bookmarkData);
        if (result.success) {
          addBookmark(result.data);
          message.success('书签已添加');
        } else {
          message.error(result.error || '添加失败');
          return;
        }
      }
      setAddBookmarkOpen(false);
    } catch (e: any) {
      message.error('操作失败：' + e.message);
    }
  };

  const handleDeleteBookmark = (bm: Bookmark) => {
    modal.confirm({
      title: '删除书签',
      content: `确定要删除书签「${bm.title}」吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await window.electronAPI.bookmark.delete(bm.id);
        if (result.success) {
          removeBookmark(bm.id);
          message.success('书签已删除');
        } else {
          message.error(result.error || '删除失败');
        }
      },
    });
  };

  const handleOpenAddAnnotation = () => {
    setEditAnnotationId(null);
    annotationForm.resetFields();
    annotationForm.setFieldsValue({
      type: 'highlight',
      content: '',
      color: '#ffff00',
    });
    setAddAnnotationOpen(true);
  };

  const handleOpenEditAnnotation = (ann: Annotation) => {
    setEditAnnotationId(ann.id);
    annotationForm.setFieldsValue({
      type: ann.type,
      content: ann.content,
      color: ann.color,
    });
    setAddAnnotationOpen(true);
  };

  const handleAnnotationSubmit = async (values: any) => {
    try {
      const annotationData = {
        pdfId: pdfData.id,
        pageNumber: currentPage,
        type: values.type,
        content: values.content || '',
        color: values.color || '#ffff00',
        rect: [],
        author: '我',
      };

      if (editAnnotationId) {
        const result = await window.electronAPI.annotation.update(editAnnotationId, annotationData);
        if (result.success) {
          updateAnnotation(editAnnotationId, annotationData);
          message.success('批注已更新');
        } else {
          message.error(result.error || '更新失败');
          return;
        }
      } else {
        const result = await window.electronAPI.annotation.create(annotationData);
        if (result.success) {
          addAnnotation(result.data);
          message.success('批注已添加');
        } else {
          message.error(result.error || '添加失败');
          return;
        }
      }
      setAddAnnotationOpen(false);
    } catch (e: any) {
      message.error('操作失败：' + e.message);
    }
  };

  const handleDeleteAnnotation = (ann: Annotation) => {
    modal.confirm({
      title: '删除批注',
      content: `确定要删除这条${ANNOTATION_TYPE_LABELS[ann.type]}批注吗？`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await window.electronAPI.annotation.delete(ann.id);
        if (result.success) {
          removeAnnotation(ann.id);
          message.success('批注已删除');
        } else {
          message.error(result.error || '删除失败');
        }
      },
    });
  };

  const getTypeLabel = (type: string) => ANNOTATION_TYPE_LABELS[type] || type;

  if (error) {
    return (
      <div className="pdf-reader-container">
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16,
          color: '#999',
          padding: 40,
        }}>
          <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          <div style={{ fontSize: 16, color: '#CCC' }}>{error}</div>
          <div style={{ fontSize: 13, color: '#888', textAlign: 'center', maxWidth: 400 }}>
            文件路径: {pdfData.filePath}
            <br />
            请确认文件是否存在且未被移动或删除。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-reader-container">
      <div className="reader-main">
        <div className="reader-toolbar">
          <div className="toolbar-left">
            <Tooltip title="上一页">
              <Button
                type="text"
                icon={<CaretLeftOutlined />}
                disabled={currentPage <= 1 || loading}
                onClick={() => goToPage(currentPage - 1)}
              />
            </Tooltip>
            <div className="page-nav">
              <InputNumber
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(v) => v && goToPage(v)}
                size="small"
                disabled={loading}
                style={{ width: 60 }}
              />
              <span style={{ color: '#999' }}>/</span>
              <span style={{ color: '#BBB' }}>{totalPages}</span>
            </div>
            <Tooltip title="下一页">
              <Button
                type="text"
                icon={<CaretRightOutlined />}
                disabled={currentPage >= totalPages || loading}
                onClick={() => goToPage(currentPage + 1)}
              />
            </Tooltip>

            <div style={{ width: 1, height: 20, background: '#555', margin: '0 8px' }} />

            <Tooltip title="缩小">
              <Button type="text" icon={<ZoomOutOutlined />} onClick={handleZoomOut} disabled={loading} />
            </Tooltip>
            <Tooltip title="重置缩放" placement="bottom">
              <span className="zoom-value" onClick={handleResetZoom} style={{ cursor: 'pointer', minWidth: 48 }}>
                {Math.round(zoom * 100)}%
              </span>
            </Tooltip>
            <Tooltip title="放大">
              <Button type="text" icon={<ZoomInOutlined />} onClick={handleZoomIn} disabled={loading} />
            </Tooltip>
          </div>

          <div style={{
            fontSize: 13,
            color: '#CCC',
            maxWidth: '40%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            padding: '0 20px',
          }}
            title={pdfData.fileName}
          >
            <FileOutlined style={{ marginRight: 6, color: '#e74c3c' }} />
            {pdfData.fileName}
          </div>

          <div className="toolbar-right">
            <Tooltip title="添加书签">
              <Button
                type="text"
                icon={<PushpinOutlined />}
                onClick={handleOpenAddBookmark}
                disabled={loading}
              />
            </Tooltip>
            <Tooltip title="添加批注">
              <Button
                type="text"
                icon={<EditFilled />}
                onClick={handleOpenAddAnnotation}
                disabled={loading}
              />
            </Tooltip>

            <div style={{ width: 1, height: 20, background: '#555', margin: '0 8px' }} />

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'export-word',
                    icon: <DownloadOutlined />,
                    label: '导出批注为 Word',
                    onClick: async () => {
                      if (docAnnotations.length === 0) {
                        message.warning('当前文档没有批注可导出');
                        return;
                      }
                      const saveResult = await window.electronAPI.export.saveDialog({
                        title: '导出为 Word',
                        defaultPath: `${pdfData.fileName.replace(/\.pdf$/i, '')}-批注.docx`,
                        filters: [{ name: 'Word 文档', extensions: ['docx'] }],
                      });
                      if (saveResult.success && saveResult.data) {
                        const result = await window.electronAPI.export.toWord(
                          docAnnotations,
                          saveResult.data
                        );
                        if (result.success) {
                          message.success('已导出 Word 文档');
                        } else {
                          message.error(result.error || '导出失败');
                        }
                      }
                    },
                  },
                  {
                    key: 'export-md',
                    icon: <DownloadOutlined />,
                    label: '导出批注为 Markdown',
                    onClick: async () => {
                      if (docAnnotations.length === 0) {
                        message.warning('当前文档没有批注可导出');
                        return;
                      }
                      const saveResult = await window.electronAPI.export.saveDialog({
                        title: '导出为 Markdown',
                        defaultPath: `${pdfData.fileName.replace(/\.pdf$/i, '')}-批注.md`,
                        filters: [{ name: 'Markdown 文件', extensions: ['md'] }],
                      });
                      if (saveResult.success && saveResult.data) {
                        const result = await window.electronAPI.export.toMarkdown(
                          docAnnotations,
                          saveResult.data
                        );
                        if (result.success) {
                          message.success('已导出 Markdown 文件');
                        } else {
                          message.error(result.error || '导出失败');
                        }
                      }
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Tooltip title="导出">
                <Button type="text" icon={<DownloadOutlined />} disabled={loading} />
              </Tooltip>
            </Dropdown>
          </div>
        </div>

        {loading ? (
          <div className="reader-loading">
            <div className="spinner" />
            <div>
              {loadingProgress > 0 ? `加载中... ${loadingProgress}%` : '正在加载 PDF...'}
            </div>
          </div>
        ) : (
          <div className="pdf-canvas-container" ref={canvasContainerRef} />
        )}
      </div>

      <div className="reader-sidebar">
        <div className="sidebar-tabs">
          {[
            { key: 'bookmarks' as SidebarTab, icon: <PushpinOutlined />, label: '书签', count: docBookmarks.length },
            { key: 'annotations' as SidebarTab, icon: <EditOutlined />, label: '批注', count: docAnnotations.length },
            { key: 'outline' as SidebarTab, icon: <BookOutlined />, label: '目录', count: 0 },
          ].map(tab => (
            <button
              key={tab.key}
              className={`sidebar-tab ${sidebarTab === tab.key ? 'active' : ''}`}
              onClick={() => setSidebarTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: sidebarTab === tab.key ? 'rgba(52, 104, 163, 0.3)' : 'rgba(255,255,255,0.08)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="sidebar-content">
          {sidebarTab === 'bookmarks' && (
            docBookmarks.length === 0 ? (
              <div className="empty-sidebar">
                <PushpinOutlined />
                <div>暂无书签</div>
                <div style={{ marginTop: 4 }}>阅读时点击工具栏图标添加</div>
              </div>
            ) : (
              <>
                {docBookmarks.map(bm => (
                  <div
                    key={bm.id}
                    className="bookmark-item"
                    onClick={() => goToPage(bm.pageNumber)}
                  >
                    <div className="bookmark-header">
                      <div className="bookmark-color" style={{ background: bm.color }} />
                      <div className="bookmark-title">{bm.title}</div>
                      <div className="bookmark-actions" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="编辑">
                          <button onClick={() => handleOpenEditBookmark(bm)}>
                            <EditOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="删除">
                          <button onClick={() => handleDeleteBookmark(bm)}>
                            <DeleteOutlined />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="bookmark-meta">
                      <span>第 {bm.pageNumber} 页</span>
                      <span>{bm.category}</span>
                    </div>
                    {bm.description && (
                      <div className="bookmark-desc">{bm.description}</div>
                    )}
                    {bm.tags.length > 0 && (
                      <div className="bookmark-tags">
                        {bm.tags.map((t, i) => (
                          <span key={i} className="tag-chip">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )
          )}

          {sidebarTab === 'annotations' && (
            docAnnotations.length === 0 ? (
              <div className="empty-sidebar">
                <EditOutlined />
                <div>暂无批注</div>
              </div>
            ) : (
              <>
                {docAnnotations.map(ann => (
                  <div
                    key={ann.id}
                    className="annotation-item"
                    style={{ borderLeftColor: ann.color }}
                    onClick={() => goToPage(ann.pageNumber)}
                  >
                    <div className="annotation-header">
                      <span className="annotation-type">
                        {ANNOTATION_TYPES.find(t => t.value === ann.type)?.icon}
                        <span style={{ marginLeft: 4 }}>{getTypeLabel(ann.type)}</span>
                        <span style={{ opacity: 0.6, marginLeft: 8 }}>· 第 {ann.pageNumber} 页</span>
                      </span>
                      <div className="annotation-actions" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="编辑">
                          <button onClick={() => handleOpenEditAnnotation(ann)}>
                            <EditOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="删除">
                          <button onClick={() => handleDeleteAnnotation(ann)}>
                            <DeleteOutlined />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    {ann.content && (
                      <div className="annotation-content">{ann.content}</div>
                    )}
                    <div className="annotation-meta">
                      <span>{ann.author}</span>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </>
            )
          )}

          {sidebarTab === 'outline' && (
            <div className="empty-sidebar">
              <BookOutlined />
              <div>文档目录</div>
              <div style={{ marginTop: 4 }}>自动提取 PDF 原生目录</div>
            </div>
          )}
        </div>

        {sidebarTab === 'bookmarks' && (
          <div className="sidebar-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAddBookmark}
              style={{ background: '#1e3a5f' }}
            >
              添加书签
            </Button>
          </div>
        )}

        {sidebarTab === 'annotations' && (
          <div className="sidebar-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAddAnnotation}
              style={{ background: '#1e3a5f' }}
            >
              添加批注
            </Button>
          </div>
        )}
      </div>

      <Modal
        title={editBookmarkId ? '编辑书签' : '添加书签'}
        open={addBookmarkOpen}
        onCancel={() => setAddBookmarkOpen(false)}
        onOk={() => bookmarkForm.submit()}
        okText={editBookmarkId ? '保存' : '添加'}
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form
          form={bookmarkForm}
          layout="vertical"
          onFinish={handleBookmarkSubmit}
          className="modal-content"
        >
          <Form.Item
            label={`页码：第 ${currentPage} 页`}
          >
            <div style={{
              padding: '8px 12px',
              background: '#FAF8F5',
              borderRadius: 6,
              color: '#666',
              fontSize: 13,
            }}>
              <FolderOpenOutlined style={{ marginRight: 6 }} />
              {pdfData.fileName}
            </div>
          </Form.Item>
          <Form.Item
            label="书签标题"
            name="title"
            rules={[{ required: true, message: '请输入书签标题' }]}
          >
            <Input placeholder="为这个页面起个名字..." maxLength={50} />
          </Form.Item>
          <Form.Item
            label="说明备注"
            name="description"
          >
            <TextArea
              placeholder="添加一些说明内容（可选）..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item label="分类" name="category">
              <Select placeholder="选择分类">
                <Option value="自定义">自定义</Option>
                <Option value="工作">工作</Option>
                <Option value="学习">学习</Option>
                <Option value="参考">参考资料</Option>
                <Option value="重要">重要</Option>
                <Option value="待办">待处理</Option>
                <Option value="导入">已导入</Option>
              </Select>
            </Form.Item>
            <Form.Item label="颜色" name="color">
              <ColorPicker
                format="hex"
                showText={(c: any) => c.toHexString()}
                presets={[
                  { label: '商务', colors: ['#1e3a5f', '#3468a3', '#2a4d7a', '#2c5f8a', '#1a3252'] },
                  { label: '多彩', colors: PRESET_COLORS },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item label="标签" name="tags">
            <Select
              mode="tags"
              placeholder="输入后回车添加标签"
              tokenSeparators={[',', ' ']}
              options={tags.map(t => ({ value: t.name, label: t.name, style: { color: t.color } }))}
              style={{ width: '100%' }}
              tagRender={(props: any) => (
                <Tag color={props.style?.color || '#1e3a5f'} style={{ marginRight: 3 }}>
                  {props.label}
                </Tag>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editAnnotationId ? '编辑批注' : '添加批注'}
        open={addAnnotationOpen}
        onCancel={() => setAddAnnotationOpen(false)}
        onOk={() => annotationForm.submit()}
        okText={editAnnotationId ? '保存' : '添加'}
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form
          form={annotationForm}
          layout="vertical"
          onFinish={handleAnnotationSubmit}
          className="modal-content"
        >
          <Form.Item
            label={`位置：第 ${currentPage} 页`}
          >
            <div style={{
              padding: '8px 12px',
              background: '#FAF8F5',
              borderRadius: 6,
              color: '#666',
              fontSize: 13,
            }}>
              文档: {pdfData.fileName}
            </div>
          </Form.Item>
          <Form.Item label="批注类型" name="type" rules={[{ required: true }]}>
            <Select>
              {ANNOTATION_TYPES.map(t => (
                <Option key={t.value} value={t.value}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.icon}
                    {t.label}
                  </span>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="批注颜色" name="color">
            <ColorPicker
              format="hex"
              showText={(c: any) => c.toHexString()}
              presets={[{ label: '常用', colors: PRESET_COLORS }]}
            />
          </Form.Item>
          <Form.Item label="批注内容" name="content">
            <TextArea
              placeholder="输入批注内容..."
              rows={4}
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PDFReader;
