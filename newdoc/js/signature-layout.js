export function signatureLayout(values = {}) {
  const clamp = (value, minimum, maximum, fallback) => {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, Math.round(number))) : fallback;
  };
  return {
    width: clamp(values.signature_width_mm, 15, 70, 40),
    align: ['left', 'center', 'right'].includes(values.signature_align) ? values.signature_align : 'right',
    gap: clamp(values.signature_gap_mm, 0, 30, 14),
    x: clamp(values.signature_image_x_mm, -20, 20, 0),
    y: clamp(values.signature_image_y_mm, -10, 10, 0),
  };
}
