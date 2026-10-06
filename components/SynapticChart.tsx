import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { LogItem } from '../types';

interface SynapticChartProps {
  historyItems: LogItem[];
}

type ChartType = 'stacked-bar' | 'multi-line' | 'stacked-area';

export const SynapticChart: React.FC<SynapticChartProps> = ({ historyItems }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartType, setChartType] = useState<ChartType>('stacked-bar');
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 });
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    title: string;
    items: { label: string; value: number; color: string }[];
  }>({
    show: false,
    x: 0,
    y: 0,
    title: '',
    items: [],
  });

  // Track size of container for fully responsive D3 drawing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Keep height relative to width but bound it
      const computedHeight = Math.max(220, Math.min(320, window.innerHeight * 0.3));
      setDimensions({ width: Math.max(280, width), height: computedHeight });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Standard logType color mapper
  const logTypes: string[] = [
    'JSON to Image',
    'Compose Image',
    'Pose Variant Image',
    'Reference Creation',
    'Image to JSON',
    'Text to JSON',
    'Other'
  ];

  const getColor = (type: string): string => {
    switch (type) {
      case 'JSON to Image': return '#6366f1'; // Indigo
      case 'Compose Image': return '#a855f7'; // Purple
      case 'Pose Variant Image': return '#ec4899'; // Pink
      case 'Reference Creation': return '#06b6d4'; // Cyan
      case 'Image to JSON': return '#10b981'; // Emerald
      case 'Text to JSON': return '#f59e0b'; // Amber
      default: return '#64748b'; // Slate for Other
    }
  };

  useEffect(() => {
    if (!svgRef.current || historyItems.length === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Prepare dynamic time intervals based on log timestamps
    const timestamps = historyItems.map(d => d.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);

    // If all items are at exactly the same instant, pad the range
    const timeSpan = maxTime - minTime;
    const adjustedMin = timeSpan === 0 ? minTime - 3600000 : minTime; // -1 hr
    const adjustedMax = timeSpan === 0 ? maxTime + 3600000 : maxTime; // +1 hr

    // We split into 6 dynamic time buckets/intervals
    const numBuckets = 6;
    const intervalSize = (adjustedMax - adjustedMin) / numBuckets;
    
    // Initialize buckets
    interface Bucket {
      id: number;
      startTime: Date;
      endTime: Date;
      label: string;
      [key: string]: any; // Counts for logTypes
    }

    const buckets: Bucket[] = Array.from({ length: numBuckets }).map((_, i) => {
      const start = new Date(adjustedMin + i * intervalSize);
      const end = new Date(adjustedMin + (i + 1) * intervalSize);
      
      // Determine elegant formatted label based on duration of timeframe
      let label = '';
      if (timeSpan > 86400000 * 3) {
        // Multi-day: show date
        label = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else {
        // Short timeframe: show hour/minute
        label = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      const bucketData: Bucket = {
        id: i,
        startTime: start,
        endTime: end,
        label,
      };

      // Set counts of all types to 0
      logTypes.forEach(type => {
        bucketData[type] = 0;
      });

      return bucketData;
    });

    // Populate counts in correct buckets
    historyItems.forEach(item => {
      let mappedType = item.logType;
      if (!logTypes.includes(mappedType)) {
        mappedType = 'Other';
      }

      // Find the best bucket for this item
      const bucketIndex = Math.min(
        numBuckets - 1,
        Math.floor((item.timestamp - adjustedMin) / intervalSize)
      );
      if (bucketIndex >= 0 && bucketIndex < numBuckets) {
        buckets[bucketIndex][mappedType]++;
      }
    });

    // Setup scales
    const xScale = d3.scaleBand()
      .domain(buckets.map(b => b.label))
      .range([0, chartWidth])
      .padding(0.3);

    // For line chart, we also need point/ordinal coordinates
    const xPointScale = d3.scalePoint()
      .domain(buckets.map(b => b.label))
      .range([xScale.bandwidth() / 2, chartWidth - xScale.bandwidth() / 2]);

    // Stack the data for bar / area chart
    const stack = d3.stack()
      .keys(logTypes);

    const stackedData = stack(buckets as any);

    // Find max value for y axis
    let maxY = 0;
    if (chartType === 'multi-line') {
      // Max of any single type across all buckets
      buckets.forEach(b => {
        logTypes.forEach(t => {
          if (b[t] > maxY) maxY = b[t];
        });
      });
    } else {
      // Cumulative sum of types in each bucket
      buckets.forEach(b => {
        let sum = 0;
        logTypes.forEach(t => { sum += b[t]; });
        if (sum > maxY) maxY = sum;
      });
    }

    // Ensure maxY is at least 5 for elegant scale lines
    maxY = Math.max(5, Math.ceil(maxY * 1.15));

    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .range([chartHeight, 0]);

    // Create the main container group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Add glowing background filters for neon aesthetics
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    glowFilter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // Horizontal Grid Lines
    const yGrid = d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke', 'rgba(255, 255, 255, 0.04)')
        .attr('stroke-dasharray', '3,3')
      );

    // Draw Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
      .ticks(Math.min(5, maxY))
      .tickFormat(d3.format('d'));

    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .attr('class', 'x-axis')
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.1)'))
      .call(g => g.selectAll('.tick text')
        .attr('fill', 'rgba(255, 255, 255, 0.4)')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('class', 'uppercase tracking-tighter')
      )
      .call(g => g.selectAll('.tick line')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      );

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.1)'))
      .call(g => g.selectAll('.tick text')
        .attr('fill', 'rgba(255, 255, 255, 0.4)')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
      )
      .call(g => g.selectAll('.tick line')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      );

    // Render depending on chart type
    if (chartType === 'stacked-bar') {
      const layers = g.selectAll('.layer')
        .data(stackedData)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => getColor(d.key));

      layers.selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => xScale(String(d.data.label)) || 0)
        .attr('y', chartHeight) // Animation start position
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('rx', 3) // Slightly rounded bars
        .attr('ry', 3)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 0.85)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1);

          // Build items list for tooltip
          const bucketData = d.data;
          const itemsList = logTypes
            .map(t => ({
              label: t,
              value: bucketData[t],
              color: getColor(t)
            }))
            .filter(item => item.value > 0);

          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            setTooltip({
              show: true,
              x: event.clientX - svgRect.left + 15,
              y: event.clientY - svgRect.top - 20,
              title: `Synaptic Interval: ${bucketData.label}`,
              items: itemsList
            });
          }
        })
        .on('mousemove', function (event) {
          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            setTooltip(prev => ({
              ...prev,
              x: event.clientX - svgRect.left + 15,
              y: event.clientY - svgRect.top - 20,
            }));
          }
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('opacity', 1)
            .attr('stroke', 'none');
          setTooltip(prev => ({ ...prev, show: false }));
        })
        .transition()
        .duration(800)
        .delay((_, idx) => idx * 50)
        .attr('y', d => yScale(d[1]))
        .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])));

    } else if (chartType === 'stacked-area') {
      const areaGen = d3.area<any>()
        .x(d => xPointScale(d.data.label) || 0)
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      // Create unique linear gradients for glowing area fills
      stackedData.forEach((layer) => {
        const type = layer.key;
        const color = getColor(type);
        const gradId = `grad-${type.replace(/\s+/g, '-')}`;

        if (!defs.select(`#${gradId}`).node()) {
          const grad = defs.append('linearGradient')
            .attr('id', gradId)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
          grad.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', color)
            .attr('stop-opacity', 0.5);
          grad.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', color)
            .attr('stop-opacity', 0.0);
        }
      });

      const layers = g.selectAll('.area-layer')
        .data(stackedData)
        .enter()
        .append('g')
        .attr('class', 'area-layer');

      // Draw area
      layers.append('path')
        .attr('d', d => areaGen(d as any))
        .attr('fill', d => `url(#grad-${d.key.replace(/\s+/g, '-')})`)
        .attr('opacity', 0); // Start hidden for transition

      // Draw stroke on top of area
      layers.append('path')
        .attr('d', d => d3.line<any>()
          .x(item => xPointScale(item.data.label) || 0)
          .y(item => yScale(item[1]))
          .curve(d3.curveMonotoneX)(d as any)
        )
        .attr('fill', 'none')
        .attr('stroke', d => getColor(d.key))
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', function() {
          const l = (this as SVGPathElement).getTotalLength();
          return `${l} ${l}`;
        })
        .attr('stroke-dashoffset', function() {
          return (this as SVGPathElement).getTotalLength();
        })
        .transition()
        .duration(1000)
        .attr('stroke-dashoffset', 0)
        .end()
        .then(() => {
          layers.selectAll('path').transition().duration(400).attr('opacity', 1);
        });

      // Hover overlay vertical reference line and dots
      const hoverLine = g.append('line')
        .attr('stroke', 'rgba(255, 255, 255, 0.15)')
        .attr('stroke-width', 1)
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .attr('stroke-dasharray', '2,2')
        .style('display', 'none');

      // Capture overlay for mouse tracking
      g.append('rect')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mouseenter', () => hoverLine.style('display', null))
        .on('mouseleave', () => {
          hoverLine.style('display', 'none');
          setTooltip(prev => ({ ...prev, show: false }));
        })
        .on('mousemove', function (event) {
          const [mouseX] = d3.pointer(event, this);
          // Find closest bucket label
          const domain = xPointScale.domain();
          const range = domain.map(d => xPointScale(d) || 0);
          
          let closestIdx = 0;
          let minDiff = Infinity;
          range.forEach((val, idx) => {
            const diff = Math.abs(val - mouseX);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = idx;
            }
          });

          const selectedLabel = domain[closestIdx];
          const bData = buckets.find(b => b.label === selectedLabel);
          const lineX = xPointScale(selectedLabel) || 0;

          hoverLine.attr('x1', lineX).attr('x2', lineX);

          if (bData) {
            const itemsList = logTypes
              .map(t => ({
                label: t,
                value: bData[t],
                color: getColor(t)
              }))
              .filter(item => item.value > 0);

            const svgRect = svgRef.current?.getBoundingClientRect();
            if (svgRect) {
              setTooltip({
                show: true,
                x: event.clientX - svgRect.left + 15,
                y: event.clientY - svgRect.top - 20,
                title: `Synaptic Interval: ${bData.label}`,
                items: itemsList
              });
            }
          }
        });

    } else if (chartType === 'multi-line') {
      // Line generator for each specific logType
      logTypes.forEach(type => {
        const lineGen = d3.line<Bucket>()
          .x(d => xPointScale(d.label) || 0)
          .y(d => yScale(d[type]))
          .curve(d3.curveMonotoneX);

        const color = getColor(type);

        const path = g.append('path')
          .datum(buckets)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('d', lineGen);

        const totalLength = path.node()?.getTotalLength() || 0;

        path
          .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1000)
          .attr('stroke-dashoffset', 0);

        // Individual dots representing the points
        g.selectAll(`.dot-${type.replace(/\s+/g, '-')}`)
          .data(buckets)
          .enter()
          .append('circle')
          .attr('class', `dot-${type.replace(/\s+/g, '-')}`)
          .attr('cx', d => xPointScale(d.label) || 0)
          .attr('cy', d => yScale(d[type]))
          .attr('r', 3.5)
          .attr('fill', '#1e1b4b') // Deep dark background
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseenter', function (event, d) {
            d3.select(this)
              .transition()
              .duration(150)
              .attr('r', 6)
              .attr('stroke-width', 3);

            const svgRect = svgRef.current?.getBoundingClientRect();
            if (svgRect) {
              setTooltip({
                show: true,
                x: event.clientX - svgRect.left + 15,
                y: event.clientY - svgRect.top - 20,
                title: `${type} @ ${d.label}`,
                items: [{ label: type, value: d[type], color }]
              });
            }
          })
          .on('mouseleave', function () {
            d3.select(this)
              .transition()
              .duration(150)
              .attr('r', 3.5)
              .attr('stroke-width', 2);
            setTooltip(prev => ({ ...prev, show: false }));
          });
      });
    }

  }, [historyItems, chartType, dimensions]);

  if (historyItems.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden flex flex-col md:flex-row gap-8 items-stretch justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      
      {/* Sidebar: Description and Filter controls */}
      <div className="flex flex-col justify-between md:max-w-[220px] w-full flex-none">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] block mb-2">Synaptic Data</span>
          <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-2">
            Activity Pulse
          </h3>
          <p className="text-xs text-white/40 leading-relaxed font-medium">
            Real-time metric map of neuro-synthesis operations across your session.
          </p>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-6 border-t border-white/5 pt-4">
          {logTypes.slice(0, 6).map((type) => (
            <div key={type} className="flex items-center gap-1.5 min-w-0">
              <span 
                className="w-1.5 h-1.5 rounded-full flex-none shadow-[0_0_5px_currentColor]" 
                style={{ color: getColor(type), backgroundColor: getColor(type) }} 
              />
              <span className="text-[9px] font-black text-white/50 truncate uppercase tracking-tight">{type.replace(' Image', '')}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 min-w-0">
            <span 
              className="w-1.5 h-1.5 rounded-full flex-none" 
              style={{ color: getColor('Other'), backgroundColor: getColor('Other') }} 
            />
            <span className="text-[9px] font-black text-white/50 truncate uppercase tracking-tight">Other</span>
          </div>
        </div>

        {/* Chart View Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mt-6">
          {(['stacked-bar', 'multi-line', 'stacked-area'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${
                chartType === type 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {type.split('-')[1] || type}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="flex-1 min-h-[220px] relative flex items-center justify-center">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="overflow-visible"
        />

        {/* D3 Tooltip */}
        {tooltip.show && (
          <div
            className="absolute z-50 pointer-events-none bg-black/90 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
              {tooltip.title}
            </div>
            <div className="space-y-1">
              {tooltip.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-white/80">{item.label}</span>
                  </div>
                  <span className="font-bold text-white">{item.value} runs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
