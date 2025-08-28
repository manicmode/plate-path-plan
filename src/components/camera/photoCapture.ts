export function openPhotoCapture(accept='image/*', capture='environment') {
  return new Promise<File>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    (input as any).capture = capture;
    input.onchange = () => {
      const f = input.files?.[0];
      f ? resolve(f) : reject(new Error('no_file'));
    };
    input.click();
  });
}