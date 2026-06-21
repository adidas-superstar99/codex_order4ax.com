import { Download, FileText, Lock, PlusCircle, Save, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  createCloudNote,
  deleteCloudFile,
  deleteCloudNote,
  downloadCloudFile,
  fetchCloudState,
  fetchPublicCloudNotes,
  updateCloudNote,
  uploadCloudFile
} from "../api";
import type { CloudFile, CloudNote } from "../types";

type EditingNote = {
  id?: string;
  title: string;
  content: string;
};

const emptyEditingNote: EditingNote = { title: "", content: "" };

export function CloudPage() {
  const [password, setPassword] = useState(() => window.localStorage.getItem("adminPassword") ?? "1234");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlockFormOpen, setIsUnlockFormOpen] = useState(false);
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(2 * 1024 * 1024);
  const [message, setMessage] = useState("");
  const [editingNote, setEditingNote] = useState<EditingNote>(emptyEditingNote);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  useEffect(() => {
    void loadPublicNotes();
  }, []);

  const maxFileSizeLabel = useMemo(() => formatBytes(maxFileSizeBytes), [maxFileSizeBytes]);

  async function loadPublicNotes() {
    try {
      const publicNotes = await fetchPublicCloudNotes();
      setNotes(publicNotes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "메모 목록을 불러오지 못했습니다.");
    }
  }

  async function loadAdminCloud(adminPassword = password) {
    setMessage("");
    const cloudState = await fetchCloudState(adminPassword);
    setNotes(cloudState.notes);
    setFiles(cloudState.files);
    setMaxFileSizeBytes(cloudState.limits.maxFileSizeBytes);
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault();
    try {
      window.localStorage.setItem("adminPassword", password);
      await loadAdminCloud(password);
      setIsUnlocked(true);
      setIsUnlockFormOpen(false);
      setMessage("관리자 모드로 들어왔습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 모드로 들어오지 못했습니다.");
      setIsUnlocked(false);
    }
  }

  function closeUnlockForm() {
    setIsUnlockFormOpen(false);
    setMessage("");
  }

  function exitAdminMode() {
    setIsUnlocked(false);
    setIsUnlockFormOpen(false);
    setIsEditorOpen(false);
    setEditingNote(emptyEditingNote);
    setFiles([]);
    setMessage("관리자 모드를 종료했습니다.");
    void loadPublicNotes();
  }

  function startNewNote() {
    setEditingNote(emptyEditingNote);
    setIsEditorOpen(true);
    setMessage("새 메모를 작성할 수 있습니다.");
  }

  function startEditNote(note: CloudNote) {
    if (!isUnlocked) return;
    setEditingNote({ id: note.id, title: note.title, content: note.content });
    setIsEditorOpen(true);
    setMessage(`"${note.title}" 메모를 수정하는 중입니다.`);
  }

  function closeEditor() {
    setEditingNote(emptyEditingNote);
    setIsEditorOpen(false);
  }

  async function handleSaveNote(event: FormEvent) {
    event.preventDefault();
    setIsSavingNote(true);
    try {
      const payload = {
        title: editingNote.title,
        content: editingNote.content
      };
      const savedNote = editingNote.id
        ? await updateCloudNote(password, editingNote.id, payload)
        : await createCloudNote(password, payload);
      await loadAdminCloud();
      setEditingNote({ id: savedNote.id, title: savedNote.title, content: savedNote.content });
      setIsEditorOpen(false);
      setMessage(editingNote.id ? "메모를 수정했습니다." : "메모를 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "메모 저장에 실패했습니다.");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    const confirmed = window.confirm("이 메모를 삭제할까요?");
    if (!confirmed) return;

    try {
      await deleteCloudNote(password, noteId);
      await loadAdminCloud();
      if (editingNote.id === noteId) {
        closeEditor();
      }
      setMessage("메모를 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "메모 삭제에 실패했습니다.");
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxFileSizeBytes) {
      setMessage(`파일 용량이 너무 큽니다. 업로드 한도는 ${maxFileSizeLabel}입니다.`);
      event.target.value = "";
      return;
    }

    setIsUploadingFile(true);
    try {
      const contentBase64 = await fileToBase64(file);
      await uploadCloudFile(password, {
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBase64
      });
      await loadAdminCloud();
      setMessage(`${file.name} 파일을 업로드했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일 업로드에 실패했습니다.");
    } finally {
      setIsUploadingFile(false);
      event.target.value = "";
    }
  }

  async function handleDownloadFile(file: CloudFile) {
    try {
      const blob = await downloadCloudFile(password, file);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(`${file.originalName} 파일을 다운로드했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일 다운로드에 실패했습니다.");
    }
  }

  async function handleDeleteFile(fileId: string) {
    const confirmed = window.confirm("이 파일을 삭제할까요?");
    if (!confirmed) return;

    try {
      await deleteCloudFile(password, fileId);
      await loadAdminCloud();
      setMessage("파일을 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일 삭제에 실패했습니다.");
    }
  }

  return (
    <main className="app-shell premium-shell">
      <section className="order-header">
        <div>
          <p className="eyebrow">비공개 공간</p>
          <h1>클라우드</h1>
          <p>처음에는 메모 목록만 보이고, 관리자 모드에서 메모와 파일을 관리할 수 있습니다.</p>
        </div>
        <div className="cloud-header-actions">
          {isUnlocked ? (
            <button className="secondary-button" type="button" onClick={exitAdminMode}>
              관리자 종료
            </button>
          ) : (
            <button className="secondary-button" type="button" onClick={() => setIsUnlockFormOpen(true)}>
              <Lock size={16} />
              관리자 모드
            </button>
          )}
          <a className="admin-link" href="/">주문 목록</a>
        </div>
      </section>

      {message ? <p className="status-message">{message}</p> : null}

      {isUnlockFormOpen && !isUnlocked ? (
        <section className="dashboard-section">
          <form className="cloud-note-editor" onSubmit={handleUnlock}>
            <div className="section-heading-row compact">
              <div>
                <p className="section-kicker">관리자 모드</p>
                <h3>비밀번호를 입력해 관리하기</h3>
              </div>
              <button className="secondary-button" type="button" onClick={closeUnlockForm}>
                <X size={16} />
                닫기
              </button>
            </div>
            <label className="field">
              <span>관리자 비밀번호</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="primary-button" type="submit">
              <Lock size={16} />
              관리자 모드 입장
            </button>
          </form>
        </section>
      ) : null}

      <section className={isUnlocked ? "cloud-grid" : "dashboard-grid"}>
        <div className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">메모</p>
              <h2>메모 리스트</h2>
            </div>
            {isUnlocked ? (
              <button className="secondary-button" type="button" onClick={startNewNote}>
                <PlusCircle size={16} />
                새 메모
              </button>
            ) : null}
          </div>

          {isEditorOpen && isUnlocked ? (
            <form className="cloud-note-editor" onSubmit={handleSaveNote}>
              <div className="section-heading-row compact">
                <div>
                  <p className="section-kicker">{editingNote.id ? "메모 수정" : "새 메모"}</p>
                  <h3>{editingNote.id ? "선택한 메모 수정하기" : "새 메모 작성하기"}</h3>
                </div>
                <button className="secondary-button" type="button" onClick={closeEditor}>
                  닫기
                </button>
              </div>
              <label className="field">
                <span>제목</span>
                <input
                  value={editingNote.title}
                  onChange={(event) => setEditingNote((current) => ({ ...current, title: event.target.value }))}
                  placeholder="짧게 제목을 적어주세요"
                />
              </label>
              <label className="field">
                <span>내용</span>
                <textarea
                  rows={12}
                  value={editingNote.content}
                  onChange={(event) => setEditingNote((current) => ({ ...current, content: event.target.value }))}
                  placeholder="개인 메모를 적어주세요"
                />
              </label>
              <button className="primary-button" type="submit" disabled={isSavingNote}>
                <Save size={16} />
                {editingNote.id ? "메모 수정" : "메모 저장"}
              </button>
            </form>
          ) : null}

          <div className="cloud-note-list">
            {notes.length ? (
              notes.map((note) => (
                <article className="cloud-item-card" key={note.id}>
                  {isUnlocked ? (
                    <button className="cloud-note-card" type="button" onClick={() => startEditNote(note)}>
                      <strong>{note.title}</strong>
                      <span className="cloud-note-meta">생성일 {new Date(note.createdAt).toLocaleString("ko-KR")}</span>
                      <span className="cloud-note-meta">수정일 {new Date(note.updatedAt).toLocaleString("ko-KR")}</span>
                      <p className="cloud-note-body">{note.content}</p>
                    </button>
                  ) : (
                    <div className="cloud-note-card">
                      <strong>{note.title}</strong>
                      <span className="cloud-note-meta">생성일 {new Date(note.createdAt).toLocaleString("ko-KR")}</span>
                      <span className="cloud-note-meta">수정일 {new Date(note.updatedAt).toLocaleString("ko-KR")}</span>
                      <p className="cloud-note-body">{note.content}</p>
                    </div>
                  )}
                  {isUnlocked ? (
                    <button className="secondary-button danger-button" type="button" onClick={() => handleDeleteNote(note.id)}>
                      <Trash2 size={15} />
                      삭제
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="empty-state">아직 저장된 메모가 없습니다.</div>
            )}
          </div>
        </div>

        {isUnlocked ? (
          <div className="dashboard-section">
            <div className="section-heading-row">
              <div>
                <p className="section-kicker">파일</p>
                <h2>작은 파일 보관함</h2>
              </div>
              <label className="secondary-button cloud-upload-button">
                <Upload size={16} />
                {isUploadingFile ? "업로드 중..." : "파일 업로드"}
                <input type="file" hidden onChange={handleFileChange} />
              </label>
            </div>

            <p className="cloud-limit-text">파일 1개당 업로드 한도: {maxFileSizeLabel}</p>

            <div className="cloud-file-list">
              {files.length ? (
                files.map((file) => (
                  <article className="cloud-item-card" key={file.id}>
                    <div className="cloud-file-card">
                      <div className="cloud-file-main">
                        <FileText size={18} />
                        <div>
                          <strong>{file.originalName}</strong>
                          <span>{file.mimeType || "application/octet-stream"}</span>
                        </div>
                      </div>
                      <div className="cloud-file-meta">
                        <span>{formatBytes(file.sizeBytes)}</span>
                        <span>{new Date(file.createdAt).toLocaleString("ko-KR")}</span>
                      </div>
                    </div>
                    <div className="cloud-file-actions">
                      <button className="secondary-button" type="button" onClick={() => handleDownloadFile(file)}>
                        <Download size={15} />
                        다운로드
                      </button>
                      <button className="secondary-button danger-button" type="button" onClick={() => handleDeleteFile(file.id)}>
                        <Trash2 size={15} />
                        삭제
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">아직 저장된 파일이 없습니다.</div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
