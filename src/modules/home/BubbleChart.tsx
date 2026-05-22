import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { useNavigate } from 'react-router-dom'
import type { ProjectWithTaskCount } from '../../types'

const MIN_RADIUS = 40
const MAX_RADIUS = 120

export function computeRadius(openCount: number, maxCount: number): number {
  if (maxCount === 0) return MIN_RADIUS
  const t = openCount / maxCount
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS)
}

interface BubbleNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  color: string
  radius: number
  open_task_count: number
  total_task_count: number
}

interface BubbleChartProps {
  projects: ProjectWithTaskCount[]
  onEdit?: (id: string) => void
}

export function BubbleChart({ projects, onEdit }: BubbleChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<BubbleNode, undefined> | null>(null)
  const navigate = useNavigate()

  const draw = useCallback(() => {
    const svg = svgRef.current
    if (!svg) return

    const width = svg.clientWidth
    const height = svg.clientHeight
    const maxCount = Math.max(...projects.map(p => p.open_task_count), 1)

    const nodes: BubbleNode[] = projects.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      radius: computeRadius(p.open_task_count, maxCount),
      open_task_count: p.open_task_count,
      total_task_count: p.total_task_count,
      x: width / 2 + (Math.random() - 0.5) * 10,
      y: height / 2 + (Math.random() - 0.5) * 10,
    }))

    d3.select(svg).selectAll('*').remove()

    const svgSel = d3.select(svg)

    // Defs for gradients
    const defs = svgSel.append('defs')
    nodes.forEach(node => {
      const grad = defs.append('radialGradient')
        .attr('id', `grad-${node.id}`)
        .attr('cx', '35%').attr('cy', '35%')
      grad.append('stop').attr('offset', '0%').attr('stop-color', lighten(node.color, 0.3))
      grad.append('stop').attr('offset', '100%').attr('stop-color', node.color)
    })

    // Glow filters
    nodes.forEach(node => {
      const filter = defs.append('filter').attr('id', `glow-${node.id}`)
      filter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'coloredBlur')
      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    })

    const g = svgSel.append('g')

    const bubble = g.selectAll('.bubble')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'bubble')
      .style('cursor', 'pointer')
      .on('click', (_, d) => navigate(`/tasks?project=${d.id}`))
      .on('contextmenu', (event: MouseEvent, d) => {
        event.preventDefault()
        if (onEdit) onEdit(d.id)
      })

    // Glow circle (behind)
    bubble.append('circle')
      .attr('r', d => d.radius + 8)
      .attr('fill', d => d.color)
      .attr('opacity', 0.15)

    // Main circle
    bubble.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => `url(#grad-${d.id})`)
      .on('mouseover', function(_, d) {
        d3.select(this).transition().duration(150).attr('r', d.radius * 1.05)
      })
      .on('mouseout', function(_, d) {
        d3.select(this).transition().duration(150).attr('r', d.radius)
      })

    // Progress arc
    bubble.each(function(d) {
      const el = d3.select(this)
      if (d.total_task_count === 0) return
      const pct = 1 - d.open_task_count / d.total_task_count
      const arc = d3.arc()
        .innerRadius(d.radius - 5)
        .outerRadius(d.radius - 2)
      el.append('path')
        .attr('d', arc({ startAngle: 0, endAngle: pct * 2 * Math.PI, innerRadius: d.radius - 5, outerRadius: d.radius - 2 }) as string)
        .attr('fill', 'rgba(255,255,255,0.4)')
        .attr('transform', 'rotate(-90)')
    })

    // Label: name
    bubble.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', 'white')
      .attr('font-size', d => Math.min(14, d.radius / 3.5))
      .attr('font-weight', '600')
      .style('pointer-events', 'none')

    // Label: task count
    bubble.append('text')
      .text(d => `${d.open_task_count} task${d.open_task_count !== 1 ? 's' : ''}`)
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('fill', 'rgba(255,255,255,0.65)')
      .attr('font-size', d => Math.min(11, d.radius / 4.5))
      .style('pointer-events', 'none')

    if (simulationRef.current) simulationRef.current.stop()

    simulationRef.current = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('charge', d3.forceManyBody().strength(30))
      .force('collide', d3.forceCollide<BubbleNode>().radius(d => d.radius + 6).strength(0.9))
      .on('tick', () => {
        bubble.attr('transform', d => `translate(${d.x ?? width / 2},${d.y ?? height / 2})`)
      })
      .on('end', () => {
        // Compute bounding box including glow halo (radius + 8)
        const pad = 28
        const xs = nodes.flatMap(d => [(d.x ?? 0) - d.radius - 8, (d.x ?? 0) + d.radius + 8])
        const ys = nodes.flatMap(d => [(d.y ?? 0) - d.radius - 8, (d.y ?? 0) + d.radius + 8])
        const bx0 = Math.min(...xs), bx1 = Math.max(...xs)
        const by0 = Math.min(...ys), by1 = Math.max(...ys)
        const bw = bx1 - bx0
        const bh = by1 - by0
        if (bw <= 0 || bh <= 0) return

        // Scale to fill the viewport; allow modest upscale for few small bubbles
        const scale = Math.min(
          (width  - pad * 2) / bw,
          (height - pad * 2) / bh,
          1.6
        )
        const tx = (width  - bw * scale) / 2 - bx0 * scale
        const ty = (height - bh * scale) / 2 - by0 * scale

        g.transition().duration(450).ease(d3.easeCubicOut)
          .attr('transform', `translate(${tx},${ty}) scale(${scale})`)
      })
  }, [projects, navigate, onEdit])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(draw)
    if (svgRef.current) observer.observe(svgRef.current)
    return () => {
      observer.disconnect()
      simulationRef.current?.stop()
    }
  }, [draw])

  return (
    <div className="absolute inset-0">
      <svg
        ref={svgRef}
        className="w-full h-full"
        aria-label="Project bubble chart"
      />
    </div>
  )
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount))
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
