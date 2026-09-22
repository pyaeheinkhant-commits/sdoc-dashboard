const workflows = [
  { label: 'A - Batch classification', file: 'n8n/workflows/Workflow_A_FX%20(1).json' },
  { label: 'C - SI vs. draft BL comparison', file: 'n8n/workflows/Workflow_BL.C_FX%20(1).json' },
  { label: 'D - Human review', file: 'n8n/workflows/Workflow_D_FX%20(1).json' },
  { label: 'E - Resolution follow-up', file: 'n8n/workflows/Workflow_E_FX%20(1).json' }
];

const shell = document.getElementById('canvasShell');
const canvas = document.getElementById('canvas');
const nodesEl = document.getElementById('nodes');
const edgesEl = document.getElementById('edges');
const select = document.getElementById('workflowSelect');
let scale = 1;
let pan = { x: 48, y: 48 };
let dragging = null;

workflows.forEach((workflow, index) => {
  const option = new Option(workflow.label, index);
  select.add(option);
});

function kind(node) {
  if (node.type.includes('stickyNote')) return 'note';
  if (node.type.includes('trigger') || node.type.includes('webhook')) return 'trigger';
  if (node.type.includes('code')) return 'code';
  if (node.type.includes('supabase') || node.type.includes('httpRequest')) return 'data';
  if (node.type.includes('if') || node.type.includes('switch') || node.type.includes('wait')) return 'review';
  return '';
}

function updateTransform() {
  canvas.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
}

function drawEdges(workflow, lookup) {
  edgesEl.replaceChildren();
  Object.entries(workflow.connections || {}).forEach(([sourceName, outputs]) => {
    const source = lookup.get(sourceName);
    if (!source) return;
    (outputs.main || []).forEach((branch, branchIndex) => branch.forEach(targetLink => {
      const target = lookup.get(targetLink.node);
      if (!target) return;
      const startX = source.x + 178;
      const startY = source.y + 31;
      const endX = target.x;
      const endY = target.y + 31;
      const midX = startX + (endX - startX) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`);
      path.setAttribute('class', `edge${branchIndex ? ' branch' : ''}`);
      edgesEl.append(path);
    }));
  });
}

function fit(nodes) {
  const xs = nodes.map(node => node.position[0]);
  const ys = nodes.map(node => node.position[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs) + 230;
  const maxY = Math.max(...ys) + 160;
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  scale = Math.min((shell.clientWidth - 72) / width, (shell.clientHeight - 72) / height, 1);
  pan = { x: (shell.clientWidth - width * scale) / 2 - minX * scale, y: (shell.clientHeight - height * scale) / 2 - minY * scale };
  updateTransform();
}

function render(workflow) {
  nodesEl.replaceChildren();
  const lookup = new Map();
  workflow.nodes.forEach(node => {
    const [x, y] = node.position;
    lookup.set(node.name, { x, y });
    const element = document.createElement('article');
    element.className = `node ${kind(node)}`;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    const type = node.type.split('.').pop();
    const label = node.type.includes('stickyNote') ? node.parameters?.content?.replace(/```[\s\S]*?```/g, '').replace(/#+\s*/g, '').trim() || node.name : node.name;
    element.innerHTML = `<span class="type">${type}</span><span class="name"></span>`;
    element.querySelector('.name').textContent = label;
    nodesEl.append(element);
  });
  drawEdges(workflow, lookup);
  document.getElementById('workflowTitle').textContent = workflow.name;
  document.getElementById('workflowMeta').textContent = `${workflow.nodes.length} nodes. Sanitized public view; no credentials or live controls.`;
  requestAnimationFrame(() => fit(workflow.nodes));
}

async function load(index) {
  nodesEl.innerHTML = '<p class="empty">Loading workflow canvas...</p>';
  edgesEl.replaceChildren();
  try {
    const response = await fetch(workflows[index].file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(await response.json());
  } catch (error) {
    nodesEl.innerHTML = `<p class="empty">Unable to load this workflow: ${error.message}</p>`;
  }
}

select.addEventListener('change', () => load(select.value));
document.getElementById('zoomIn').addEventListener('click', () => { scale = Math.min(scale * 1.2, 2); updateTransform(); });
document.getElementById('zoomOut').addEventListener('click', () => { scale = Math.max(scale / 1.2, 0.2); updateTransform(); });
document.getElementById('zoomReset').addEventListener('click', () => load(select.value));
shell.addEventListener('pointerdown', event => { dragging = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; shell.classList.add('dragging'); shell.setPointerCapture(event.pointerId); });
shell.addEventListener('pointermove', event => { if (!dragging) return; pan = { x: dragging.panX + event.clientX - dragging.x, y: dragging.panY + event.clientY - dragging.y }; updateTransform(); });
shell.addEventListener('pointerup', () => { dragging = null; shell.classList.remove('dragging'); });
shell.addEventListener('wheel', event => { event.preventDefault(); const next = event.deltaY < 0 ? scale * 1.1 : scale / 1.1; scale = Math.max(0.2, Math.min(next, 2)); updateTransform(); }, { passive: false });
window.addEventListener('resize', () => load(select.value));
load(0);