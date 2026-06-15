import React from 'react';
import { Tooltip } from 'antd';
import {
  FilePdfOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import useAppStore from '../store';

const DocumentTabs: React.FC = () => {
  const documents = useAppStore(state => state.documents);
  const openDocumentIds = useAppStore(state => state.openDocumentIds);
  const activeDocumentId = useAppStore(state => state.activeDocumentId);
  const setActiveDocument = useAppStore(state => state.setActiveDocument);
  const closeDocument = useAppStore(state => state.closeDocument);

  const openDocs = openDocumentIds
    .map(id => documents.find(d => d.id === id))
    .filter(Boolean) as any[];

  return (
    <div className="content-tabs">
      {openDocs.map(doc => (
        <div
          key={doc.id}
          className={`tab-item ${activeDocumentId === doc.id ? 'active' : ''}`}
          onClick={() => setActiveDocument(doc.id)}
        >
          <FilePdfOutlined className="tab-icon" style={{ color: '#e74c3c' }} />
          <span className="tab-title" title={doc.fileName}>
            {doc.fileName.replace(/\.pdf$/i, '')}
          </span>
          <Tooltip title="关闭文档">
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeDocument(doc.id);
              }}
            >
              <CloseOutlined />
            </button>
          </Tooltip>
        </div>
      ))}
    </div>
  );
};

export default DocumentTabs;
