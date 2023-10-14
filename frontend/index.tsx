import { Box, initializeBlock, useRecords, useSettingsButton, useViewport } from '@airtable/blocks/ui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { MiniMap, Controls, useNodesState, useEdgesState, addEdge, Node, Edge, useStoreApi, ReactFlowProvider, Background, Connection  } from 'reactflow';
import 'reactflow/dist/style.css';
import Record from '@airtable/blocks/dist/types/src/models/record';
import { addConnectionToTable, deleteConnectionsFromTable, deleteNodeFromTable, populateNodesAndEdges } from './nodes-edges';
import SettingsForm  from './SettingsForm';
import './style.css';
import { MIN_NODES_DISTANCE, NodeData, getLayoutElements, useSettings } from './utils';
import CustomNode from './CustomNode';
import difference from 'lodash/difference';

const nodeTypes = {
    customNode: CustomNode
}

function Flow() {
    const store = useStoreApi();
    const viewport = useViewport();
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    useSettingsButton(() => {
        if (!isSettingsVisible) {
            viewport.enterFullscreenIfPossible();
        }
        setIsSettingsVisible(!isSettingsVisible);
    });

    const settingsValidationResult = useSettings();
    const { table, edgeType, recordShape } = settingsValidationResult.settings;

    useEffect(() => {
        if (!settingsValidationResult.isValid) {
            setIsSettingsVisible(true);
        }
    }, [settingsValidationResult.isValid]);

    const records = useRecords(table) || [];   

    const populatedNodesAndEdges = useMemo(() => {
        if (settingsValidationResult.isValid)
            return populateNodesAndEdges(records, settingsValidationResult.settings);
        return {
            nodes: [],
            edges: []
        }
    }, [settingsValidationResult.isValid]);
    const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
        return getLayoutElements(
            populatedNodesAndEdges.nodes,
            populatedNodesAndEdges.edges
        )
    }, [populatedNodesAndEdges])

    useEffect(() => {
        if (nodes !== layoutedNodes) {
            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);
        }
    }, [layoutedNodes, layoutedEdges]);

    useEffect(() => {
        setEdges((edges) => edges.map(edge => ({
                ...edge,
                type: settingsValidationResult.settings.edgeType
            }))
        )
    }, [edgeType])
    useEffect(() => {
        setNodes((nodes) => nodes.map(node => ({
            ...node,
           className: settingsValidationResult.settings.recordShape
        })))
    }, [recordShape])

    const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>(layoutedNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

    const onConnect = useCallback(async (params: Connection) => {
        const { sourceRecord } = await addConnectionToTable(nodes, params, {...settingsValidationResult.settings});

        return setEdges((eds: Edge[]) => addEdge({
            ...params,
            id: `${params.source}-${params.target}`,
            data: {
                sourceRecord
            },
            type: settingsValidationResult.settings.edgeType
        }, eds))
    }, [settingsValidationResult.settings]);

    const onNodesDelete = useCallback(
        (deleted: typeof nodes) => {
            deleted.map(async node => {
                await deleteNodeFromTable(node.data.record, table);
            })
    }, [nodes, edges])

    const onEdgesDelete = useCallback((edgesDelete: Edge<{sourceRecord: Record}>[]) => {
        edgesDelete.map(async edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const { record } = sourceNode.data;
            const fieldName = settingsValidationResult.settings.field.name;

            await deleteConnectionsFromTable(
                edge,
                record,
                fieldName,
                table
            );
        })
    }, [nodes]);

    const getClosestEdge = useCallback((node: Node) => {
        const { nodeInternals } = store.getState();
        const storeNodes = Array.from(nodeInternals.values());

        const closestNode = storeNodes.reduce(
            (res, n) => {
                if (n.id !== node.id) {
                    const dx = n.positionAbsolute.x - node.positionAbsolute.x;
                    const dy = n.positionAbsolute.y - node.positionAbsolute.y;
                    const d = Math.sqrt(dx * dx + dy * dy);

                    if (d < res.distance && d < MIN_NODES_DISTANCE) {
                        res.distance = d;
                        res.node = n;
                    }
                }

                return res;
            },
            {
                distance: Number.MAX_VALUE,
                node: null,
            }
        );

        if (!closestNode.node) {
            return null;
        }

        const closeNodeIsSource = closestNode.node.positionAbsolute.y < node.positionAbsolute.y;
        
        return {
            id: `${node.id}-${closestNode.node.id}`,
            target: closeNodeIsSource ? node.id : closestNode.node.id,
            source: closeNodeIsSource ? closestNode.node.id : node.id,
        };
    }, [])

    const onNodeDrag = useCallback((_, node: Node) => {
        const closeEdge = getClosestEdge(node);

        setEdges((es) => {
            const nextEdges = es.filter((e) => e.className !== 'temp');

            if (
                closeEdge &&
                !nextEdges.find(ne => ne.source === closeEdge.source && ne.target === closeEdge.target)
            ) {
                closeEdge.className = 'temp';
                nextEdges.push({
                    ...closeEdge,
                    type: settingsValidationResult.settings.edgeType
                });
            }

            return nextEdges; 
        })
    }, [getClosestEdge, setEdges, settingsValidationResult.settings])

    const onNodeDragStop = useCallback(async (_, node: Node) => {
        const closeEdge = getClosestEdge(node);
        //todo: create more sprecific condition to determine already existed edge
        let isEdgeExists = false;

        setEdges((es) => {
            const linekdEdges = es?.filter(e => e.target === node.id) || [];
            console.log('linekdEdges', linekdEdges);

            let nextEdges = es.filter((e) => {
                if (e.source === closeEdge?.source && e.target === closeEdge?.target && e.className !== 'temp') {
                    isEdgeExists = true;
                }
                return e.className !== 'temp'
            });
            if (closeEdge && !isEdgeExists) {
                nextEdges = difference(nextEdges, linekdEdges);
                onEdgesDelete(linekdEdges);
                addConnectionToTable(nodes, closeEdge, { ...settingsValidationResult.settings });
                nextEdges.push({
                    ...closeEdge,
                    type: settingsValidationResult.settings.edgeType
                });
            }
    
            return nextEdges;
        });
    }, [getClosestEdge, settingsValidationResult.settings])

    const onLayout = useCallback(
        (direction) => {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutElements(
            nodes,
            edges,
            direction
          );
    
          setNodes([...layoutedNodes]);
          setEdges([...layoutedEdges]);
        },
        [nodes, edges]
    );

    return (
        <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            display="flex"
            backgroundColor="#f5f5f5"
            overflow="hidden"
            className='layoutflow'
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onConnect={onConnect}
                onEdgesDelete={onEdgesDelete}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
            >
                <Controls />
                <MiniMap />
                <Background variant='dots' gap={12} size={1} />
            </ReactFlow>
            <div className='controls'>
                <button onClick={() => onLayout('TB')}>vertical layout</button>
                <button onClick={() => onLayout('LR')}>horizontal layout</button>
            </div>
            {isSettingsVisible && 
            <SettingsForm 
                setIsSettingsVisible={setIsSettingsVisible}
                settingsValidationResult={settingsValidationResult}
            />}
        </Box>
    )
}

export const App = () => (
    <ReactFlowProvider>
        <Flow />
    </ReactFlowProvider>
);

initializeBlock(() => <App />);
