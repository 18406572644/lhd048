import React, { useState } from 'react';
import { Button, Dropdown, Modal, Form, Input, ColorPicker, App as AntdApp, Menu } from 'antd';
import {
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  UploadOutlined,
  SettingOutlined,
  FilePdfOutlined,
  StarOutlined,
  TagsOutlined,
  ImportOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import useAppStore from '../store';
import ImportModal from './ImportModal';
import ExportBookmarksModal from './ExportBookmarksModal';

const Sidebar: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();

  const folders = useAppStore(state => state.folders);
  const documents = useAppStore(state => state.documents);
  const bookmarks = useAppStore(state => state.bookmarks);
  const tags = useAppStore(state => state.tags);
  const selectedFolderId = useAppStore(state => state.selectedFolderId);
  const setSelectedFolderId = useAppStore(state => state.setSelectedFolderId);
  const addFolder = useAppStore(state => state.addFolder);
  const removeFolder = useAppStore(state => state.removeFolder);
  const updateFolder = useAppStore(state => state.updateFolder);
  const loadFolders = useAppStore(state => state.loadFolders);
  const loadDocuments = useAppStore(state => state.loadDocuments);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [importBookmarksModal, setImportBookmarksModal] = useState(false);

  const totalDocs = documents.length;
  const totalBookmarks = bookmarks.length;
  const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);

  const getFolderDocCount = (folderId: string) => {
    return documents.filter(d => d.folderId === folderId).length;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    form.resetFields();
    form.setFieldsValue({ color: '#1e3a5f' });
    setFolderModalOpen(true);
  };

  const handleEditFolder = (folder: any) => {
    setEditingFolder(folder);
    form.setFieldsValue({
      name: folder.name,
      color: folder.color,
    });
    setFolderModalOpen(true);
  };

  const handleDeleteFolder = async (folder: any) => {
    if (folder.id === 'default-folder') {
      message.warning('默认文件柜无法删除');
      return;
    }
    Modal.confirm({
      title: '确认删除文件柜',
      content: `确定要删除「${folder.name}」吗？文件柜中的文档不会被删除，会移至默认文件柜。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const result = await window.electronAPI.folder.delete(folder.id);
        if (result.success) {
          removeFolder(folder.id);
          message.success('文件柜已删除');
        } else {
          message.error(result.error || '删除失败');
        }
      },
    });
  };

  const handleFolderSubmit = async (values: any) => {
    try {
      const folderData = {
        name: values.name,
        color: values.color || '#1e3a5f',
        parentId: null,
      };

      if (editingFolder) {
        const result = await window.electronAPI.folder.update(editingFolder.id, folderData);
        if (result.success) {
          updateFolder(editingFolder.id, folderData);
          message.success('文件柜已更新');
        } else {
          message.error(result.error || '更新失败');
          return;
        }
      } else {
        const result = await window.electronAPI.folder.create(folderData);
        if (result.success) {
          addFolder(result.data);
          message.success('文件柜已创建');
        } else {
          message.error(result.error || '创建失败');
          return;
        }
      }
      setFolderModalOpen(false);
    } catch (e: any) {
      message.error('操作失败：' + e.message);
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    loadDocuments(folderId);
  };

  const handleImportBookmarks = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const result = await window.electronAPI.bookmark.import(
          file.path,
          selectedFolderId
        );
        if (result.success) {
          message.success(`成功导入 ${result.data.importedCount} 个书签`);
          useAppStore.getState().loadBookmarks();
        } else {
          message.error(result.error || '导入失败');
        }
      };
      input.click();
    } catch (e: any) {
      message.error('导入失败');
    }
  };

  const folderMenuItems: MenuProps['items'] = [
    {
      key: 'all',
      icon: <FilePdfOutlined />,
      label: (
        <div className={`folder-item ${selectedFolderId === null ? 'active' : ''}`}>
          <span className="folder-name">全部文档</span>
          <span className="folder-count">{totalDocs}</span>
        </div>
      ),
      onClick: () => handleSelectFolder(null),
    },
    { type: 'divider' as const, style: { margin: '4px 8px' } },
    {
      key: 'favorites',
      icon: <StarOutlined />,
      label: (
        <div className={`folder-item ${selectedFolderId === 'favorites' ? 'active' : ''}`}>
          <span className="folder-name">星标书签</span>
          <span className="folder-count">{totalBookmarks}</span>
        </div>
      ),
      onClick: () => handleSelectFolder('favorites' as any),
    },
    { type: 'divider' as const, style: { margin: '4px 8px' } },
    ...folders.map(folder => ({
      key: folder.id,
      icon: <FolderOutlined style={{ color: folder.color }} />,
      label: (
        <div className={`folder-item ${selectedFolderId === folder.id ? 'active' : ''}`}>
          <span
            className="folder-icon"
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: folder.color,
              display: 'inline-block',
            }}
          />
          <span className="folder-name">{folder.name}</span>
          <span className="folder-count">{getFolderDocCount(folder.id)}</span>
          <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'edit',
                    icon: <EditOutlined />,
                    label: '重命名',
                    onClick: () => handleEditFolder(folder),
                  },
                  { type: 'divider' as const },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: '删除',
                    danger: true,
                    disabled: folder.id === 'default-folder',
                    onClick: () => handleDeleteFolder(folder),
                  },
                ],
              }}
            >
              <button onClick={(e) => e.preventDefault()}>
                <MoreOutlined />
              </button>
            </Dropdown>
          </div>
        </div>
      ),
      onClick: () => handleSelectFolder(folder.id),
    })),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="import-btn" onClick={() => setImportModalOpen(true)}>
          <UploadOutlined />
          导入 PDF
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <span>文件柜</span>
          <div className="section-actions">
            <button title="新建文件柜" onClick={handleCreateFolder}>
              <PlusOutlined />
            </button>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedFolderId || 'all']}
          items={folderMenuItems}
          style={{
            background: 'transparent',
            borderInlineEnd: 'none',
            fontSize: 13,
          }}
          inlineIndent={12}
        />

        <div style={{ marginTop: 20 }}>
          <div className="section-title">
            <span>快捷操作</span>
          </div>
          <div style={{ padding: '4px 8px' }}>
            <Button
              type="text"
              block
              icon={<ImportOutlined />}
              onClick={handleImportBookmarks}
              style={{
                justifyContent: 'flex-start',
                padding: '8px 12px',
                height: 'auto',
                color: '#6B6B6B',
                fontSize: 13,
              }}
            >
              导入书签
            </Button>
            <Button
              type="text"
              block
              icon={<ExportOutlined />}
              onClick={() => setExportModalOpen(true)}
              style={{
                justifyContent: 'flex-start',
                padding: '8px 12px',
                height: 'auto',
                color: '#6B6B6B',
                fontSize: 13,
              }}
            >
              导出书签
            </Button>
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="section-title">
              <span>标签</span>
            </div>
            <div className="tag-list">
              {tags.map(tag => (
                <span
                  key={tag.id}
                  className="tag-item"
                >
                  <span className="tag-dot" style={{ background: tag.color }} />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="storage-info">
          <span>{formatSize(totalSize)}</span> · {totalDocs} 文档
        </div>
        <button className="settings-btn" title="设置">
          <SettingOutlined />
        </button>
      </div>

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        folderId={selectedFolderId}
      />

      <ExportBookmarksModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      <Modal
        title={editingFolder ? '编辑文件柜' : '新建文件柜'}
        open={folderModalOpen}
        onCancel={() => setFolderModalOpen(false)}
        onOk={() => form.submit()}
        okText={editingFolder ? '保存' : '创建'}
        cancelText="取消"
        width={420}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFolderSubmit}
          className="modal-content"
        >
          <Form.Item
            label="文件柜名称"
            name="name"
            rules={[{ required: true, message: '请输入文件柜名称' }]}
          >
            <Input placeholder="例如：工作文档、学习资料..." maxLength={30} />
          </Form.Item>
          <Form.Item label="标识颜色" name="color">
            <ColorPicker
              format="hex"
              showText={() => form.getFieldValue('color')}
              presets={[
                {
                  label: '商务色',
                  colors: ['#1e3a5f', '#3468a3', '#2a4d7a', '#2c5f8a', '#1a3252'],
                },
                {
                  label: '多彩色',
                  colors: ['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#13c2c2', '#722ed1'],
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </aside>
  );
};

export default Sidebar;
