/** Raster mesh displacement preserves the dot ribbon's pointer response without
 * inserting or updating 50,000 SVG elements. Work occurs only around the pointer. */
export function initArtwork() {
  document.querySelectorAll<HTMLImageElement>('[data-dot-artwork]').forEach((image) => {
    const section = image.closest('section');
    if (!section) return;
    let canvas: HTMLCanvasElement | undefined,
      context: CanvasRenderingContext2D | null = null;
    let x = -1000,
      y = -1000,
      strength = 0,
      target = 0,
      frame = 0;
    const radius = 100;
    const draw = () => {
      frame = 0;
      if (!canvas || !context || !image.complete) return;
      const width = image.clientWidth,
        height = image.clientHeight;
      if (!width || !height) return;
      if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
      }
      strength += (target - strength) * 0.35;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, width, height);
      if (strength > 0.01) {
        // Repaint only a clipped region, displacing tiny texture tiles radially.
        context.save();
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.clip();
        context.clearRect(x - radius, y - radius, radius * 2, radius * 2);
        const tile = 12;
        const sx = image.naturalWidth / width,
          sy = image.naturalHeight / height;
        for (
          let py = Math.max(0, Math.floor((y - radius) / tile) * tile);
          py < Math.min(height, y + radius);
          py += tile
        ) {
          for (
            let px = Math.max(0, Math.floor((x - radius) / tile) * tile);
            px < Math.min(width, x + radius);
            px += tile
          ) {
            const dx = px + tile / 2 - x,
              dy = py + tile / 2 - y,
              d = Math.hypot(dx, dy) || 1,
              push = Math.max(0, 1 - d / radius) * 4 * strength;
            const tw = Math.min(tile, width - px),
              th = Math.min(tile, height - py);
            context.drawImage(
              image,
              px * sx,
              py * sy,
              tw * sx,
              th * sy,
              px + (dx / d) * push,
              py + (dy / d) * push,
              tw + 0.5,
              th + 0.5,
            );
          }
        }
        context.restore();
      }
      if (Math.abs(target - strength) > 0.01) frame = requestAnimationFrame(draw);
      else if (target === 0) {
        canvas.hidden = true;
        image.style.visibility = '';
      }
    };
    section.addEventListener(
      'pointermove',
      (e) => {
        if (
          e.pointerType !== 'mouse' ||
          matchMedia('(prefers-reduced-motion: reduce)').matches ||
          !image.complete
        )
          return;
        const rect = image.getBoundingClientRect();
        if (
          e.clientX < rect.left - radius ||
          e.clientX > rect.right + radius ||
          e.clientY < rect.top - radius ||
          e.clientY > rect.bottom + radius
        )
          return;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.dataset.dotCanvas = '';
          canvas.setAttribute('aria-hidden', 'true');
          const parent = image.parentElement!;
          parent.style.position = 'relative';
          parent.append(canvas);
          context = canvas.getContext('2d');
        }
        x = ((e.clientX - rect.left) * image.clientWidth) / rect.width;
        y = ((e.clientY - rect.top) * image.clientHeight) / rect.height;
        target = 1;
        canvas.hidden = false;
        image.style.visibility = 'hidden';
        if (!frame) frame = requestAnimationFrame(draw);
      },
      { passive: true },
    );
    section.addEventListener(
      'pointerleave',
      () => {
        target = 0;
        if (canvas && !frame) frame = requestAnimationFrame(draw);
      },
      { passive: true },
    );
  });
}
