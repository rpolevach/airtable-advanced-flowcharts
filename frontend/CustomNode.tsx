import Record from '@airtable/blocks/dist/types/src/models/record';
import { expandRecord } from '@airtable/blocks/ui';
import React from 'react';
import { Node } from 'reactflow';
import { Handle, NodeToolbar, Position } from 'reactflow';

const onNodeClick = (record: Record) => {
    if (record) {
        expandRecord(record);
    }
}

const CustomNode = ({ data, selected, className }: Node<{ label: string, record: Record }>) => {
    console.log('className', className);
    return (
        <div
            className={`custom-node ${selected ? 'selected' : ''}`}
        >
            <NodeToolbar isVisible={selected} >
                <button onClick={() => onNodeClick(data.record)}>open record</button>
            </NodeToolbar>
            <Handle type='source' position={Position.Bottom} />
            <div>
                <label>{data.label}</label>
            </div>
            <Handle type='target' position={Position.Top} />
        </div>
    )
}

export default CustomNode;