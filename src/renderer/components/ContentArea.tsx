import React from 'react';
import useAppStore from '../store';
import LibraryView from './LibraryView';
import PDFReader from './PDFReader';
import DocumentTabs from './DocumentTabs';

const ContentArea: React.FC = () => {
  const openDocumentIds = useAppStore(state => state.openDocumentIds);
  const activeDocumentId = useAppStore(state => state.activeDocumentId);
  const documents = useAppStore(state => state.documents);
  const searchKeyword = useAppStore(state => state.searchKeyword);

  const hasOpenDocuments = openDocumentIds.length > 0 && activeDocumentId;
  const activeDocument = documents.find(d => d.id === activeDocumentId);

  return (
    <div className="content-area">
      {hasOpenDocuments && (
        <DocumentTabs />
      )}
      <div className="content-body">
        {hasOpenDocuments && activeDocument ? (
          <PDFReader key={activeDocumentId} document={activeDocument} />
        ) : (
          <LibraryView />
        )}
      </div>
    </div>
  );
};

export default ContentArea;
