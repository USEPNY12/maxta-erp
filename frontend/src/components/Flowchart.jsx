import React from 'react';

function FlowBox({ text, highlight }) {
  return (
    <div className={`erp-flow-box ${highlight ? 'border-2 border-blue-500 bg-blue-50' : ''}`}>
      {text}
    </div>
  );
}

function FlowArrow({ direction = 'down', label }) {
  const arrows = { down: '↓', right: '→', left: '←', up: '↑' };
  return (
    <div className="flex items-center gap-1">
      <span className="erp-flow-arrow">{arrows[direction]}</span>
      {label && <span className="text-xs font-bold">{label}</span>}
    </div>
  );
}

function FlowRow({ children }) {
  return (
    <div className="flex items-center gap-4">
      {children}
    </div>
  );
}

function Flowchart({ title, children }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{title}</h1>
      <div className="erp-flowchart">
        {children}
      </div>
    </div>
  );
}

Flowchart.Box = FlowBox;
Flowchart.Arrow = FlowArrow;
Flowchart.Row = FlowRow;

export default Flowchart;
