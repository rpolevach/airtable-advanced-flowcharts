import { Box, FieldPickerSynced, FormField, Heading, SelectSynced, TablePickerSynced, ViewPickerSynced } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { ConfigKeys, EdgeType, RecordShape, allowedFieldTypes } from './utils';

const SettingsForm = ({ setIsSettingsVisible, settingsValidationResult }) => {
    const {settings, isValid} = settingsValidationResult;

    return (
        <Box
            flex="none"
            display="flex"
            flexDirection="column"
            width="300px"
            backgroundColor="white"
        >
            <Box
                flex="auto"
                display="flex"
                flexDirection="column"
                minHeight="0"
                padding={3}
                overflowY="auto"
            >
                <Heading marginBottom={3}>Settings</Heading>
                <FormField label="Table">
                    <TablePickerSynced globalConfigKey={ConfigKeys.TABLE_ID} />
                </FormField>
                {settings.table && (
                    <Fragment>
                        <FormField label="View">
                            <ViewPickerSynced
                                table={settings.table}
                                globalConfigKey={ConfigKeys.VIEW_ID}
                            />
                        </FormField>
                        <FormField
                            label="Linked record field"
                            description="Must be a self-linked record field"
                        >
                            <FieldPickerSynced
                                table={settings.table}
                                globalConfigKey={ConfigKeys.FIELD_ID}
                                allowedTypes={allowedFieldTypes}
                            />
                        </FormField>
                        <FormField
                            label="Edge style"
                        >
                            <SelectSynced
                                options={[
                                    { label: 'Default', value: EdgeType.DEFAULT },
                                    { label: 'Step', value: EdgeType.STEP },
                                    { label: 'Smoothstep', value: EdgeType.SMOOTHSTEP },
                                    { label: 'Straight', value: EdgeType.STRAIGHT },
                                ]}
                                globalConfigKey={ConfigKeys.EDGE_TYPE}
                            />
                        </FormField>
                        <FormField
                            label="Node style"
                        >
                            <SelectSynced
                                options={[
                                    { label: 'Rectangle', value: RecordShape.RECTANGLE },
                                    { label: 'Rounded', value: RecordShape.ROUNDED },
                                ]}
                                globalConfigKey={ConfigKeys.RECORD_SHAPE}
                            />
                        </FormField>
                    </Fragment>
                )}
            </Box>
        </Box>
    );
}

export default SettingsForm;