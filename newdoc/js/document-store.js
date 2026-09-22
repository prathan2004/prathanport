export function missingLayoutColumn(error) {
  return error && (error.code === '42703' || error.code === 'PGRST204');
}

export async function saveDocumentRecord(db, { id, core, layout, supportsLayoutColumns, supportsImageColumns }) {
  const write = async () => {
    const values = { ...core };
    if (supportsLayoutColumns) Object.assign(values, {
      signature_width_mm: layout.width,
      signature_align: layout.align,
      signature_gap_mm: layout.gap,
    });
    if (supportsImageColumns) Object.assign(values, {
      signature_image_x_mm: layout.x,
      signature_image_y_mm: layout.y,
    });
    const query = id ? db.from('documents').update(values).eq('id', id) : db.from('documents').insert(values);
    return query.select('id').single();
  };

  let { data, error } = await write();
  if (error && (missingLayoutColumn(error) || error.code === '23514') && (supportsLayoutColumns || supportsImageColumns)) {
    supportsLayoutColumns = false;
    supportsImageColumns = false;
    ({ data, error } = await write());
  }
  if (error) throw error;
  return { id: data.id, supportsLayoutColumns, supportsImageColumns };
}
