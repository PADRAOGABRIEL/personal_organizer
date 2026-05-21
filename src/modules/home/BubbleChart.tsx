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

    // Clear previous
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

    // Glow filter per node
    nodes.forEach(node => {
      const filter = defs.append('filter').attr('id', `glow-${node.id}`)
      filter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'coloredBlur')
      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')
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
        d3.select(this.parentNode as Element)
          .select('.bubble-tooltip')
          .style('display', 'block')
        d3.select(this).transition().duration(150).attr('r', d.radius * 1.05)
      })
      .on('mouseout', function(_, d) {
        d3.select(this.parentNode as Element)
          .select('.bubble-tooltip')
          .style('display', 'none')
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

    // Force simulation
    if (simulationRef.current) simulationRef.current.stop()

    simulationRef.current = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('charge', d3.forceManyBody().strength(30))
      .force('collide', d3.forceCollide<BubbleNode>().radius(d => d.radius + 6).strength(0.9))
      .on('tick', () => {
        bubble.attr('transform', d => {
          // Clamp to SVG bounds
          d.x = Math.max(d.radius, Math.min(width - d.radius, d.x ?? width / 2))
          d.y = Math.max(d.radius, Math.min(height - d.radius, d.y ?? height / 2))
          return `translate(${d.x},${d.y})`
        })
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
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      aria-label="Project bubble chart"
    />
  )
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount))
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
