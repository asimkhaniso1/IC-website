/**
 * Serialize an inline <svg> element and rasterize it to a PNG data URL.
 * Artwork images are stored as data URLs already, so there is no
 * cross-origin canvas taint to worry about.
 */
export async function svgToPngDataUrl(svg: SVGSVGElement, pxPerMm = 4): Promise<string> {
  const viewBox = svg.viewBox.baseVal;
  const widthMm = viewBox && viewBox.width > 0 ? viewBox.width : svg.clientWidth || 300;
  const heightMm = viewBox && viewBox.height > 0 ? viewBox.height : svg.clientHeight || 150;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(widthMm));
  clone.setAttribute('height', String(heightMm));
  clone.removeAttribute('class');
  clone.removeAttribute('style');

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to rasterize fabric preview SVG.'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(widthMm * pxPerMm));
    canvas.height = Math.max(1, Math.round(heightMm * pxPerMm));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
