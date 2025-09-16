export function toCSV(rows){
  if(!rows?.length) return ''
  const headers = Object.keys(rows[0])
  const esc = v => `"${String(v ?? '').replaceAll('"','""')}"`
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n')
}
export function downloadText(filename, text){
  const blob = new Blob([text], {type:'text/csv;charset=utf-8;'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
