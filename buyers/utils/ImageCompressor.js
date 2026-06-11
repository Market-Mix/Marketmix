// utils/imageCompressor.js
async function compressImage(file, maxWidthPx = 800, qualityJpeg = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidthPx / img.width, maxWidthPx / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg', qualityJpeg);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}