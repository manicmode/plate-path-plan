import React, { useRef, useState } from 'react';

export default function DebugCamPhoto() {
  const inputRef = useRef<HTMLInputElement|null>(null);
  const [imgURL, setImgURL] = useState<string>('');
  const log = (...a:any[]) => console.warn('[DEBUG][cam-photo]', ...a);

  const openPicker = () => {
    let input = inputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImgURL(url);
    log('file selected', { name: f.name, size: f.size, type: f.type });
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>/debug/cam-photo</h1>
      <button onClick={openPicker} style={{padding:'10px 14px', borderRadius:8}}>Open Camera / Photo</button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // @ts-ignore
        capture="environment"
        onChange={onChange}
        style={{ display: 'none' }}
      />
      {imgURL && <img src={imgURL} alt="preview" style={{ display:'block', width:'100%', maxWidth: 480, marginTop:12, borderRadius:8 }} />}
      <p style={{opacity:.6}}>No getUserMedia here. If a red pill appears, it's OS/UI, not live capture.</p>
    </div>
  );
}