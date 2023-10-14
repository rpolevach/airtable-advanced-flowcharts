import Field from "@airtable/blocks/dist/types/src/models/field";
import Record from "@airtable/blocks/dist/types/src/models/record";
import Table from "@airtable/blocks/dist/types/src/models/table";
import TableOrViewQueryResult from "@airtable/blocks/dist/types/src/models/table_or_view_query_result";
import View from "@airtable/blocks/dist/types/src/models/view";
import { useBase, useGlobalConfig } from "@airtable/blocks/ui";
import dagre from 'dagre';
import { Edge, Node, Position } from "reactflow";

export const allowedFieldTypes = ['multipleRecordLinks'];

export const ChartOrientation = Object.freeze({
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
});

export const LinkStyle = Object.freeze({
    RIGHT_ANGLES: 'rightAngles',
    STRAIGHT_LINES: 'straightLines',
});

export const RecordShape = Object.freeze({
    ROUNDED: 'rounded',
    RECTANGLE: 'rectangle',
    ELLIPSE: 'ellipse',
    CIRCLE: 'circle',
    DIAMOND: 'diamond',
});

export const EdgeType = Object.freeze({
    DEFAULT: 'default',
    STEP: 'step',
    SMOOTHSTEP: 'smoothstep',
    STRAIGHT: 'straight' 
});

export const ConfigKeys = {
    TABLE_ID: 'tableId',
    VIEW_ID: 'viewId',
    FIELD_ID: 'fieldId',
    CHART_ORIENTATION: 'chartOrientation',
    LINK_STYLE: 'linkStyle',
    RECORD_SHAPE: 'recordShape',
    EDGE_TYPE: 'edgeType',
};

export const MIN_NODES_DISTANCE = 100;
export const nodeWidth = 100;
export const nodeHeight = 50;

export type NodeData = {
    label: string,
    record: Record  
}

function getSettingsValidationResult<T>(settings): {isValid: boolean, settings: T, message?: string} {
    const {queryResult, table, field} = settings;
    if (!queryResult) {
        return {
            isValid: false,
            message: 'Pick a table, view, and linked record field',
            settings: settings,
        };
    } else if (field.type !== 'multipleRecordLinks') {
        return {
            isValid: false,
            message: 'Select a linked record field',
            settings: settings,
        };
    } else if (field.options.linkedTableId !== table.id) {
        return {
            isValid: false,
            message: 'Linked record field must be linked to same table',
            settings: settings,
        };
    }
    return {
        isValid: true,
        settings: settings,
    };
}

function getRawSettingsWithDefaults(globalConfig) {
    const rawSettings = {};
    for (const globalConfigKey of Object.values(ConfigKeys)) {
        const storedValue = globalConfig.get(globalConfigKey);
        if (
            storedValue === undefined &&
            Object.prototype.hasOwnProperty.call(defaults, globalConfigKey)
        ) {
            rawSettings[globalConfigKey] = defaults[globalConfigKey];
        } else {
            rawSettings[globalConfigKey] = storedValue;
        }
    }

    return rawSettings;
}

export type Settings = {
    table: Table,
    view: View,
    field: Field,
    queryResult: TableOrViewQueryResult,
    chartOrientation: string,
    linkStyle: string,
    recordShape: string,
    edgeType: string
}
function getSettings(rawSettings, base): Settings {
    const table = base.getTableByIdIfExists(rawSettings.tableId);
    const view = table ? table.getViewByIdIfExists(rawSettings.viewId) : null;
    const field = table ? table.getFieldByIdIfExists(rawSettings.fieldId) : null;
    const queryResult =
        view && field ? view.selectRecords({fields: [table.primaryField, field]}) : null;
    return {
        table,
        view,
        field,
        queryResult,
        chartOrientation: rawSettings.chartOrientation,
        linkStyle: rawSettings.linkStyle,
        recordShape: rawSettings.recordShape,
        edgeType: rawSettings.edgeType
    };
}

const defaults = Object.freeze({
    [ConfigKeys.CHART_ORIENTATION]: ChartOrientation.VERTICAL,
    [ConfigKeys.LINK_STYLE]: LinkStyle.RIGHT_ANGLES,
    [ConfigKeys.RECORD_SHAPE]: RecordShape.ROUNDED,
});

export function useSettings() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const rawSettings = getRawSettingsWithDefaults(globalConfig);
    const settings = getSettings(rawSettings, base);
    return getSettingsValidationResult<typeof settings>(settings);
}

export const getLayoutElements = (nodes: Node[], edges: Edge[], direction = 'TB'): {nodes: Array<any>, edges: Array<any>} => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    })

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2
        }

        return node;
    })

    return { nodes, edges }
}
