import Record from "@airtable/blocks/dist/types/src/models/record";
import { expandRecord } from "@airtable/blocks/ui";
import React from "react";
import { Node } from "reactflow";
import { Handle, NodeToolbar } from "reactflow";

const onNodeClick = (record: Record) => {
  if (record) {
    expandRecord(record);
  }
};

const CustomNode = ({
  data,
  selected,
  sourcePosition,
  targetPosition,
}: Node<{ label: string; record: Record }>) => {
  console.log(sourcePosition, targetPosition);
  return (
    <div className={`custom-node ${selected ? "selected" : ""}`}>
      <NodeToolbar isVisible={selected}>
        <button onClick={() => onNodeClick(data.record)}>open record</button>
      </NodeToolbar>
      <Handle type="source" position={sourcePosition} />
      <div>
        <label>{data.label}</label>
      </div>
      <Handle type="target" position={targetPosition} />
    </div>
  );
};

export default CustomNode;
