import React, { useEffect, useRef } from 'react'
import { Chart, Tooltip, Legend, LinearScale, CategoryScale } from 'chart.js'
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix'

Chart.register(Tooltip, Legend, LinearScale, CategoryScale, MatrixController, MatrixElement)

function colorForValue(v, maxVal) {
  const t = maxVal <= 0 ? 0 : v / maxVal
  const r = Math.floor(255 * t)
  const g = Math.floor(255 * (1 - t))
  return `rgba(${r},${g},120,0.85)`
}

export default function ConfusionMatrix({ matrix, labels, title }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null) // <-- conserva l'istanza Chart

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !Array.isArray(labels) || !Array.isArray(matrix)) return
    if (!labels.length || !matrix.length || matrix.length !== labels.length) return

    // Distruggi eventuale chart esistente (StrictMode doppio-mount ecc.)
    if (chartRef.current) {
      try { chartRef.current.destroy() } catch {}
      chartRef.current = null
    }

    // Rimanda la creazione di un frame per assicurare che chartArea sia pronto
    const id = requestAnimationFrame(() => {
      const ctx = canvas.getContext('2d')
      const flat = matrix.flat()
      const maxVal = flat.length ? Math.max(...flat) : 0

      // Proteggi l'accesso a chartArea al primo layout
      const widthFn = (c) => {
        const w = c?.chart?.chartArea?.width
        const n = labels.length || 1
        return Math.max(10, ((w ?? 300) / n) - 2)
      }
      const heightFn = (c) => {
        const h = c?.chart?.chartArea?.height
        const n = labels.length || 1
        return Math.max(10, ((h ?? 300) / n) - 2)
      }

      const data = []
      for (let i = 0; i < labels.length; i++) {
        for (let j = 0; j < labels.length; j++) {
          const v = matrix[i]?.[j] ?? 0
          data.push({ x: j, y: i, v })
        }
      }

      const config = {
        type: 'matrix',
        data: {
          datasets: [{
            label: title || 'Confusion Matrix',
            data,
            width: widthFn,
            height: heightFn,
            backgroundColor: (ctx) => colorForValue(ctx.raw.v, maxVal),
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.6)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const { raw } = items[0]
                  const px = labels[raw.x] ?? raw.x
                  const py = labels[raw.y] ?? raw.y
                  return `Pred: ${px} | Reale: ${py}`
                },
                label: (item) => `Count: ${item.raw.v}`
              }
            }
          },
          scales: {
            x: {
              type: 'category',
              labels,
              position: 'top',
              title: { display: true, text: 'Predetto' },
              grid: { display: false }
            },
            y: {
              type: 'category',
              labels,
              title: { display: true, text: 'Reale' },
              reverse: true,
              grid: { display: false }
            }
          }
        }
      }

      // Se esiste un chart attaccato a questo canvas, distruggilo (extra-sicurezza)
      const existing = Chart.getChart(canvas)
      if (existing) existing.destroy()

      chartRef.current = new Chart(ctx, config)
    })

    // cleanup
    return () => {
      cancelAnimationFrame(id)
      if (chartRef.current) {
        try { chartRef.current.destroy() } catch {}
        chartRef.current = null
      }
    }
  }, [matrix, labels, title])

  return (
    <div className="cm-wrapper">
      <canvas ref={canvasRef} />
    </div>
  )
}