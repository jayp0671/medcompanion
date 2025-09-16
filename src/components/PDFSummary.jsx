import jsPDF from 'jspdf'

export default function PDFSummary({ doses = [], symptoms = [] }) {
  function exportPDF() {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()

    const title = 'MedCompanion Summary (Last 30 Days)'
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    const titleW = pdf.getTextWidth(title)
    pdf.text(title, (pageW - titleW) / 2, 40)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Generated ${new Date().toLocaleString()}`, 40, 60)

    let y = 90
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Doses', 40, y)

    y += 18
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    if (!doses.length) {
      pdf.text('No dose logs', 40, y)
      y += 16
    } else {
      doses.slice(0, 200).forEach(d => {
        const line = `${(d.status || 'taken').toUpperCase()} • ${new Date(d.plannedISO).toLocaleString()} • medId ${d.medId}`
        y = writeWrapped(pdf, line, 40, y, pageW - 80)
        y += 6
        if (y > 760) { pdf.addPage(); y = 40 }
      })
    }

    y += 18
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Symptoms', 40, y)
    y += 18
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    if (!symptoms.length) {
      pdf.text('No symptom logs', 40, y)
    } else {
      symptoms.slice(0, 200).forEach(s => {
        const line = `${new Date(s.dateISO).toLocaleString()} • sev ${s.severity} • ${s.text ? s.text.slice(0, 140) : 'No text'}`
        y = writeWrapped(pdf, line, 40, y, pageW - 80)
        y += 6
        if (y > 760) { pdf.addPage(); y = 40 }
      })
    }

    pdf.save('medcompanion-summary.pdf')
  }

  // helper: wrap text within maxWidth
  function writeWrapped(pdf, text, x, y, maxWidth) {
    const lines = pdf.splitTextToSize(text, maxWidth)
    lines.forEach((ln) => { pdf.text(ln, x, y); y += 14 })
    return y
  }

  return (
    <div className="grid gap-3">
      <button
        className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 w-fit"
        onClick={exportPDF}
      >
        Export PDF Summary
      </button>
    </div>
  )
}
