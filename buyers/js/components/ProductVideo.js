function createProductVideo(product) {
  const container = document.getElementById('product-video-section');
  if (!container || !product.product_video_url) return;

  container.innerHTML = `
    <div style="border-radius:12px;overflow:hidden;background:#000;position:relative;aspect-ratio:16/9">
      <video controls style="width:100%;height:100%;object-fit:contain" poster="${product.main_image_url||''}">
        <source src="${product.product_video_url}" type="video/mp4">
        <source src="${product.product_video_url}" type="video/webm">
        Your browser does not support video.
      </video>
    </div>
  `;
}
