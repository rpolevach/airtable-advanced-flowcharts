import { Connection, Edge, Node, Position } from "reactflow";
import Record from "@airtable/blocks/dist/types/src/models/record";
import Table from "@airtable/blocks/dist/types/src/models/table";
import Field from "@airtable/blocks/dist/types/src/models/field";
import { Settings } from "./utils";

export const populateNodesAndEdges = (
  records: Record[],
  settings: Settings
): { nodes: Array<any>; edges: Array<any> } => {
  const nodes: Node<{ label: string; record: Record }>[] = [];
  const edges: Edge[] = [];

  records.map((record) => {
    if (!record.name) return;

    const nextActions = record.getCellValue(settings.field.name) as Field[];

    nodes.push({
      id: record.name,
      data: {
        label: record.name,
        record: record,
      },
      type: "customNode",
      sourcePosition: Position.Left,
      targetPosition: Position.Right,
      className: "rounded",
      position: {
        x: 0,
        y: 0,
      },
    });

    if (nextActions) {
      nextActions.map((field) => {
        edges.push({
          id: `${record.name}-${field.name}`,
          source: record.name,
          type: settings.edgeType,
          target: field.name,
          data: {
            sourceRecord: record,
          },
        });
      });
    }
  });

  return {
    nodes,
    edges,
  };
};

export const addConnectionToTable = async (
  nodes: Node[],
  params: Connection | Edge,
  obj: { table: Table; field: Field }
) => {
  try {
    const { table, field } = obj;
    const foundSourceRecord = nodes.find((node) => node.id === params.source);
    const foundTargetRecord = nodes.find((node) => node.id === params.target);
    const { record: sourceRecord } = foundSourceRecord.data;
    const { record: targetRecord } = foundTargetRecord.data;
    const sourceRecordlinkedRecords = sourceRecord?.getCellValue(field.name)
      ? (sourceRecord.getCellValue(field.name) as [])
      : [];

    const isDuplicated = sourceRecordlinkedRecords.filter(
      (record) => record.id === targetRecord.id
    );

    if (isDuplicated.length) throw new Error("Duplicate linked object");

    if (table.hasPermissionToUpdateRecord(sourceRecord)) {
      await table.updateRecordAsync(sourceRecord, {
        [field.name]: [...sourceRecordlinkedRecords, { id: targetRecord.id }],
      });
    }

    return {
      sourceRecord,
    };
  } catch (error) {
    return error.message;
  }
};

export const addNodeToTable = async (table: Table) => {
  if (table.hasPermissionToCreateRecord) {
    const nodeName = "New Node";
    const recordID = await table.createRecordAsync({
      Name: nodeName,
    });
    // const record = await table.selectRecordsAsync()
    return {
      name: nodeName,
      id: recordID,
    };
  }
};

export const deleteConnectionsFromTable = async (
  edge: Edge,
  record: Record,
  fieldName: string,
  table: Table
) => {
  const linkFieldData = record?.getCellValue(fieldName) as Record[];
  const filteredFieldData =
    linkFieldData?.filter((d) => d.name !== edge.target) || [];

  if (table.hasPermissionToUpdateRecord(record)) {
    await table.updateRecordAsync(record, {
      [fieldName]: filteredFieldData,
    });
  }
};

export const deleteNodeFromTable = async (record: Record, table: Table) => {
  try {
    if (table.hasPermissionToDeleteRecord(record)) {
      await table.deleteRecordAsync(record);
    }
  } catch (error) {
    logError("error");
  }
};

const logError = (msg: string) => {};
