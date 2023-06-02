import { SchemaContextData } from "../../pages/MetadataSchema";
import { Checkbox, DatePicker, Input, Select, Textarea } from "@cloudscape-design/components";
import MapLocationSelectorModal, { MapLocationSelectorModal2 } from "./MapLocationSelector";
import React from "react";
import { TableRow, Metadata } from "./ControlledMetadata";
import { FeatureCollection } from "geojson";

export interface EditCompProps {
    item: TableRow;
    schema: SchemaContextData;
    controlledLists: any;
    controlData: any;
    setValue: (row: string | undefined) => void;
    currentValue: string;
    metadata: Metadata;
}
export function EditComp({
    item,
    setValue,
    controlledLists,
    currentValue,
    metadata,
    schema,
    controlData,
}: EditCompProps) {
    const disabled = !item.dependsOn.every((x: string) => metadata[x] && metadata[x] !== "");

    if (item.type === "string") {
        return (
            <Input
                value={item.value}
                disabled={disabled}
                onChange={(event) => {
                    setValue(event.detail.value);
                }}
            />
        );
    }

    if (item.type === "textarea") {
        return (
            <Textarea
                disabled={disabled}
                onChange={({ detail }) => setValue(detail.value)}
                value={item.value}
            />
        );
    }

    if (item.type === "controlled-list" && item.dependsOn.length === 0) {
        const options = controlledLists[item.name].data.map((x: any) => ({
            label: x[item.name],
            value: x[item.name],
        }));
        let selectedOption = {
            label: currentValue,
            value: currentValue,
        };
        if (options.length === 1) {
            selectedOption = options[0];
        }
        return (
            <Select
                options={options}
                selectedOption={selectedOption}
                expandToViewport
                disabled={disabled}
                filteringType="auto"
                onChange={(e) => setValue(e.detail.selectedOption.value)}
            />
        );
    }
    if (item.type === "controlled-list" && item.dependsOn.length > 0) {
        const options = controlledLists[item.name].data
            .filter((x: any) => {
                return item.dependsOn.every((y: string) => {
                    return x[y] === metadata[y];
                });
            })
            .map((x: any) => ({
                label: x[item.name],
                value: x[item.name],
            }));
        let selectedOption = {
            label: currentValue,
            value: currentValue,
        };
        if (options.length === 1) {
            selectedOption = options[0];
        }

        return (
            <Select
                options={options}
                selectedOption={selectedOption}
                disabled={disabled || options.length === 1}
                expandToViewport
                filteringType="auto"
                onChange={(e) => setValue(e.detail.selectedOption.value)}
            />
        );
    }
    if (item.type === "location") {
        console.log("location current value", currentValue);

        let currentValueInit = {
            loc: [-95.37019986475366, 29.767650706163337], // Houston
            zoom: 5,
        };

        if (!currentValue) {
            const schemaItem = schema.schemas.find((x) => x.field === item.name);
            if (schemaItem) {
                const controlDataItem = controlData.find((x: any) =>
                    schemaItem.dependsOn.every((y: string) => x[y] === metadata[y])
                );
                if (controlDataItem) {
                    currentValueInit = {
                        loc: [
                            controlDataItem[schemaItem.longitudeField],
                            controlDataItem[schemaItem.latitudeField],
                        ],
                        zoom: controlDataItem[schemaItem.zoomLevelField],
                    };
                }
            }
        }

        return (
            <MapLocationSelectorModal2
                json={currentValue ? currentValue : JSON.stringify(currentValueInit)}
                setJson={(json) => {
                    setValue(json);
                }}
                disabled={disabled}
            />
        );
    }

    if (item.type === "number") {
        return (
            <Input
                value={item.value}
                inputMode="numeric"
                disabled={disabled}
                onChange={(event) => {
                    setValue(event.detail.value);
                }}
            />
        );
    }

    if (item.type === "boolean") {
        // checkbox
        return (
            <Checkbox
                checked={item.value === "true"}
                disabled={disabled}
                onChange={(e) => {
                    setValue(e.detail.checked ? "true" : "false");
                }}
            />
        );
    }

    if (item.type === "date") {
        return (
            <DatePicker
                onChange={({ detail }) => setValue(detail.value)}
                value={item.value}
                disabled={disabled}
                openCalendarAriaLabel={(selectedDate) =>
                    "Choose date" + (selectedDate ? `, selected date is ${selectedDate}` : "")
                }
                nextMonthAriaLabel="Next month"
                placeholder="YYYY/MM/DD"
                previousMonthAriaLabel="Previous month"
                todayAriaLabel="Today"
            />
        );
    }

    return null;
}
