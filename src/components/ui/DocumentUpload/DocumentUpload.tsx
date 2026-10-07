import React, { useRef, useState } from 'react';
import './DocumentUpload.css';

/** API bodies are capped at 1 MB, so documents are stored as compact data URLs. */
const MAX_BYTES = 600 * 1024;
const MAX_EDGE = 1600;

export interface UploadedDocument { dataUrl: string; name: string; kind: 'pdf' | 'image'; size: number }

const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result as string);
  r.onerror = () => reject(new Error('Unable to read the file'));
  r.readAsDataURL(blob);
});

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to process this image');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_BYTES) return readAsDataUrl(blob);
  }
  throw new Error('This image is too large even after compression. Please use a smaller photo.');
}

/** Opens a stored document. Browsers block navigating to data: URLs, so convert to a blob first. */
export function openDocument(url: string) {
  if (!url.startsWith('data:')) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
  try {
    const [head, body] = url.split(',');
    const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream';
    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    window.open(URL.createObjectURL(new Blob([bytes], { type: mime })), '_blank', 'noopener');
  } catch { /* malformed data URL */ }
}

interface Props {
  label: string;
  hint?: string;
  value: UploadedDocument | null;
  onChange: (doc: UploadedDocument | null) => void;
  onError?: (message: string) => void;
}

export const DocumentUpload: React.FC<Props> = ({ label, hint, value, onChange, onError }) => {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fail = (m: string) => { setError(m); onError?.(m); };

  const pick = async (file?: File) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = /^image\/(png|jpe?g|webp)$/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!isPdf && !isImage) { fail('Unsupported file. Please upload a PDF, PNG or JPG.'); return; }
    setBusy(true); setError('');
    try {
      let dataUrl: string;
      if (isPdf) {
        if (file.size > MAX_BYTES) { fail(`PDFs must be under ${Math.round(MAX_BYTES / 1024)} KB. Upload a photo of the document instead, or compress the PDF.`); return; }
        dataUrl = await readAsDataUrl(file);
      } else {
        dataUrl = await compressImage(file);
      }
      onChange({ dataUrl, name: file.name, kind: isPdf ? 'pdf' : 'image', size: Math.round((dataUrl.length * 3) / 4) });
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Unable to upload this file');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="docup">
      <span className="docup__label">{label}</span>
      <input ref={input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {!value ? (
        <div
          className={`docup__zone ${dragging ? 'is-drag' : ''} ${busy ? 'is-busy' : ''}`}
          role="button" tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void pick(e.dataTransfer.files?.[0]); }}
        >
          <b aria-hidden="true">{busy ? '…' : '↥'}</b>
          <p><strong>{busy ? 'Processing…' : 'Click to upload'}</strong>{busy ? '' : ' or drag and drop'}</p>
          <small>PDF, PNG or JPG. Photos are compressed automatically.</small>
        </div>
      ) : (
        <div className="docup__file">
          <span className="docup__thumb">{value.kind === 'image' ? <img src={value.dataUrl} alt="Document preview" /> : '📄'}</span>
          <span className="docup__meta"><b>{value.name}</b><small>{(value.size / 1024).toFixed(0)} KB · {value.kind.toUpperCase()}</small></span>
          <button type="button" onClick={() => openDocument(value.dataUrl)}>Preview</button>
          <button type="button" onClick={() => input.current?.click()}>Change</button>
          <button type="button" className="docup__remove" aria-label="Remove document" onClick={() => onChange(null)}>✕</button>
        </div>
      )}
      {error && <p className="docup__error" role="alert">{error}</p>}
      {hint && <small className="docup__hint">{hint}</small>}
    </div>
  );
};
