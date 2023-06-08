/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SetStateAction, useEffect, useState} from "react";
import {
    Box,
    ColumnLayout,
    Grid,
    Select,
    Textarea,
    TextContent,
    Toggle,
} from "@cloudscape-design/components";
import {useNavigate, useParams} from "react-router";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";

import Wizard from "@cloudscape-design/components/wizard";

import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";

import DatabaseSelector from "../components/selectors/DatabaseSelector";
import {
    cadFileFormats,
    modelFileFormats,
    columnarFileFormats,
    previewFileFormats,
} from "../common/constants/fileFormats";

import MetadataTable, {Metadata} from "../components/single/Metadata";
import {fetchDatabaseWorkflows} from "../services/APIService";
import Table from "@cloudscape-design/components/table";
import {ProgressBarProps} from "@cloudscape-design/components/progress-bar";
import {StatusIndicatorProps} from "@cloudscape-design/components/status-indicator";
import {OptionDefinition} from "@cloudscape-design/components/internal/components/option/interfaces";
import {
    validateEntityIdAsYouType,
    validateNonZeroLengthTextAsYouType,
} from "./AssetUpload/validations";
import {DisplayKV, FileUpload} from "./AssetUpload/components";
import ProgressScreen, {
} from "./AssetUpload/ProgressScreen";
import onSubmit, {onUploadRetry, UploadExecutionProps} from "./AssetUpload/onSubmit";
import FolderUpload from "../components/form/FolderUpload";
import {FileUploadTable, FileUploadTableItem} from "./AssetUpload/FileUploadTable";

// eslint-disable-next-line @typescript-eslint/no-array-constructor
const objectFileFormats = new Array().concat(cadFileFormats, modelFileFormats, columnarFileFormats);
const objectFileFormatsStr = objectFileFormats.join(", ");
const previewFileFormatsStr = previewFileFormats.join(", ");

export class AssetDetail {
    isMultiFile: boolean = false;
    assetId?: string;
    assetName?: string;
    databaseId?: string;
    description?: string;
    bucket?: string;
    key?: string;
    assetType?: string;
    isDistributable?: boolean;
    Comment?: string;
    specifiedPipelines?: string[];
    previewLocation?: {
        Bucket?: string;
        Key?: string;
    };
    Asset?: FileUploadTableItem[];
    Preview?: File;
}

const workflowColumnDefns = [
    {
        id: "workflowId",
        header: "Workflow Id",
        cell: (e: any) => e.workflowId,
    },
    {
        id: "description",
        header: "Description",
        cell: (e: any) => e.description,
    },
    {
        id: "pipelines",
        header: "Pipelines",
        cell: (wf: any) => wf.specifiedPipelines?.functions?.map((fn: any) => fn.name).join(", "),
    },
];

const isDistributableOptions: OptionDefinition[] = [
    {label: "Yes", value: "true"},
    {label: "No", value: "false"},
];

function nthIndex(str: string, pat: string, n: number){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}



const UploadForm = () => {
    const navigate = useNavigate();
    const urlParams = useParams();
    const [databaseId, setDatabaseId] = useState({
        label: urlParams.databaseId,
        value: urlParams.databaseId,
    });
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    const [assetDetail, setAssetDetail] = useState<AssetDetail>({
        isMultiFile: false,
        isDistributable: false,
        databaseId: urlParams.databaseId,
    });
    const [counter, setCounter] = useState(1)
    const [isMultiFile, setMultiFile] = useState(false);
    const [fileHandles, setFileHandles] = useState<any>([]);
    const [metadata, setMetadata] = useState<Metadata>({});

    const [workflows, setWorkflows] = useState<any>([]);
    const [selectedWorkflows, setSelectedWorkflows] = useState<any>([]);
    const [fileUploadTableItems, setFileUploadTableItems] = useState<FileUploadTableItem[]>([]);

    const [freezeWizardButtons, setFreezeWizardButtons] = useState(false);

    const [showUploadAndExecProgress, setShowUploadAndExecProgress] = useState(false);

    const [assetUploadProgress, setAssetUploadProgress] = useState<ProgressBarProps>({
        value: 0,
        status: "in-progress",
    });
    const [uploadExecutionProps, setUploadExecutionProps] = useState<UploadExecutionProps>()

    const [previewUploadProgress, setPreviewUploadProgress] = useState<ProgressBarProps>({
        value: 0,
        status: "in-progress",
    });

    const [execStatus, setExecStatus] = useState<Record<string, StatusIndicatorProps.Type>>({});
    const [canNavigateToAssetPage, setCanNavigateToAssetPage] = useState(false);

    const getFilesFromFileHandles = async (fileHandles: any[]) => {
        const fileUploadTableItems: FileUploadTableItem[] = []
        for (let i = 0; i < fileHandles.length; i++) {
            const file = await fileHandles[i].handle.getFile() as File

            fileUploadTableItems.push({
                //@ts-ignore
                file: file,
                index: i,
                name: fileHandles[i].handle.name,
                size: file.size,
                relativePath: fileHandles[i].path,
                progress: 0,
                status: "Queued",
            })
        }
        console.log(fileUploadTableItems)
        return fileUploadTableItems
    }

    const updateProgressForFileUploadItem = (index: number, progress: number) => {
        console.log("Updating progress for file upload item", index, "with progress", progress)
        setFileUploadTableItems((prevState) => {
                return prevState.map((item) => item.index === index ? {...item, status: 'In Progress', progress: progress} : item);
        })
    }

    const fileUploadComplete = (index: number, event: any) => {
        setFileUploadTableItems((prevState) => {
            return prevState.map((item) => item.index === index ? {...item, status: 'Completed', progress: 100} : item);
        })
    }

    const fileUploadError = (index: number, event: any) => {
        setFileUploadTableItems((prevState) => {
            return prevState.map((item) => item.index === index ? {...item, status: 'Failed'} : item);
        })
    }

    useEffect(() => {

        if (!assetDetail?.databaseId) {
            return;
        }

        fetchDatabaseWorkflows({databaseId: assetDetail.databaseId}).then((w) => {
            console.log("received workflows", w);
            setWorkflows(w);
        });
    }, [assetDetail.databaseId]);

    return (
        <Box padding={{left: "l", right: "l"}}>
            {/*{canNavigateToAssetPage &&*/}
            {/*    navigate(`/databases/${assetDetail.databaseId}/assets/${assetDetail.assetId}`)}*/}
            {showUploadAndExecProgress && uploadExecutionProps && (
                <>
                    <ProgressScreen
                        assetDetail={assetDetail}
                        execStatus={execStatus}
                        previewUploadProgress={previewUploadProgress}
                        allFileUploadItems={fileUploadTableItems}
                        onRetry={() => onUploadRetry(uploadExecutionProps)}
                    />
                </>

            )}
            {!showUploadAndExecProgress && (
                <Wizard
                    i18nStrings={{
                        stepNumberLabel: (stepNumber) => `Step ${stepNumber}`,
                        collapsedStepsLabel: (stepNumber, stepsCount) =>
                            `Step ${stepNumber} of ${stepsCount}`,
                        skipToButtonLabel: (step, stepNumber) => `Skip to ${step.title}`,
                        navigationAriaLabel: "Steps",
                        cancelButton: "Cancel",
                        previousButton: "Previous",
                        nextButton: "Next",
                        submitButton: "Upload Object",
                        optional: "optional",
                    }}
                    isLoadingNextStep={freezeWizardButtons}
                    onNavigate={({detail}) => {
                        setActiveStepIndex(detail.requestedStepIndex);
                        console.log("detail on navigate", detail);
                    }}
                    activeStepIndex={activeStepIndex}
                    onSubmit={onSubmit({
                        assetDetail,
                        setFreezeWizardButtons,
                        metadata,
                        selectedWorkflows,
                        execStatus,
                        setExecStatus,
                        setShowUploadAndExecProgress,
                        setAssetUploadProgress,
                        updateProgressForFileUploadItem,
                        fileUploadComplete,
                        fileUploadError,
                        setPreviewUploadProgress,
                        setCanNavigateToAssetPage,
                        setUploadExecutionProps
                    })}
                    allowSkipTo
                    steps={[
                        {
                            title: "Project Details",
                            isOptional: false,
                            content: (
                                <Container header={<Header variant="h2">Project Details</Header>}>
                                    <SpaceBetween direction="vertical" size="l">
                                        <FormField
                                            label="Project Name"
                                            constraintText="All lower case, no special chars or spaces except - and _ only letters for first character min 4 and max 64."
                                            errorText={validateEntityIdAsYouType(
                                                assetDetail.assetId
                                            )}
                                        >
                                            <Input
                                                value={assetDetail.assetId || ""}
                                                data-testid="assetid-input"
                                                onChange={(e) => {
                                                    setAssetDetail((assetDetail) => ({
                                                        ...assetDetail,
                                                        assetId: e.detail.value,
                                                        description: e.detail.value,
                                                        Comment: e.detail.value,
                                                    }));
                                                }}
                                            />
                                        </FormField>

                                        <FormField label="Is Distributable?">
                                            <Select
                                                options={isDistributableOptions}
                                                selectedOption={
                                                    isDistributableOptions
                                                        .filter(
                                                            (o) =>
                                                                (assetDetail.isDistributable ===
                                                                true
                                                                    ? "Yes"
                                                                    : "No") === o.label
                                                        )
                                                        .pop() || null
                                                }
                                                onChange={({detail}) => {
                                                    setAssetDetail((assetDetail) => ({
                                                        ...assetDetail,
                                                        isDistributable:
                                                            detail.selectedOption.label === "Yes",
                                                    }));
                                                }}
                                                filteringType="auto"
                                                selectedAriaLabel="Selected"
                                                data-testid="isDistributable-select"
                                            />
                                        </FormField>

                                        <FormField
                                            label="Database"
                                            errorText={validateNonZeroLengthTextAsYouType(
                                                assetDetail.databaseId
                                            )}
                                        >
                                            <DatabaseSelector
                                                onChange={(x: any) => {
                                                    setDatabaseId(x.detail.selectedOption);
                                                    setAssetDetail((assetDetail) => ({
                                                        ...assetDetail,
                                                        databaseId: x.detail.selectedOption.value,
                                                    }));
                                                }}
                                                selectedOption={databaseId}
                                                data-testid="database-selector"
                                            />
                                        </FormField>

                                        <FormField
                                            label="Description"
                                            constraintText="Minimum 4 characters"
                                            errorText={validateNonZeroLengthTextAsYouType(
                                                assetDetail.description
                                            )}
                                        >
                                            <Textarea
                                                value={assetDetail.description || ""}
                                                onChange={(e) => {
                                                    setAssetDetail((assetDetail) => ({
                                                        ...assetDetail,
                                                        description: e.detail.value,
                                                    }));
                                                }}
                                                data-testid="asset-description-textarea"
                                            />
                                        </FormField>

                                        <FormField
                                            label="Comment"
                                            constraintText="Minimum 4 characters"
                                            errorText={validateNonZeroLengthTextAsYouType(
                                                assetDetail.Comment
                                            )}
                                        >
                                            <Input
                                                value={assetDetail.Comment || ""}
                                                onChange={(e) => {
                                                    setAssetDetail((assetDetail) => ({
                                                        ...assetDetail,
                                                        Comment: e.detail.value,
                                                    }));
                                                }}
                                                data-testid="asset-comment-input"
                                            />
                                        </FormField>

                                    </SpaceBetween>
                                </Container>
                            ),
                        },
                        {
                            title: "Project Metadata",
                            content: (
                                <Container header={<Header variant="h2">Asset Metadata</Header>}>
                                    <SpaceBetween direction="vertical" size="l">
                                        <MetadataTable
                                            assetId={assetDetail.assetId || ""}
                                            databaseId={assetDetail.databaseId || ""}
                                            initialState={metadata}
                                            store={(databaseId, assetId, record) => {
                                                return new Promise((resolve) => {
                                                    console.log("resolve promise", resolve);
                                                    setMetadata(record);
                                                    resolve(null);
                                                });
                                            }}
                                            data-testid="metadata-table"
                                        />
                                    </SpaceBetween>
                                </Container>
                            ),
                            isOptional: true,
                        },
                        {
                            title: "Select Files to upload",
                            content: (
                                <Container header={<Header variant="h2">Select Files to Upload</Header>}>
                                    { [...Array(counter)].map((e, i) =><>
                                    <FormField>
                                        <Toggle
                                            onChange={({detail}) => {
                                                setMultiFile(detail.checked)
                                                setAssetDetail((assetDetail) => ({
                                                    ...assetDetail,
                                                    isMultiFile: detail.checked
                                                }))
                                            }}
                                            checked={isMultiFile}
                                        >
                                            Folder Upload?
                                        </Toggle>
                                    </FormField>
                                    <Grid
                                        gridDefinition={[
                                            {colspan: {default: 6}},
                                            {colspan: {default: 6}},
                                        ]}
                                    >
                                        {!isMultiFile && <FileUpload
                                            label="Asset"
                                            disabled={false}
                                            errorText={
                                                (!assetDetail.Asset && "Asset is required") ||
                                                undefined
                                            }
                                            setFile={(file) => {
                                                setAssetDetail((assetDetail) => ({
                                                    ...assetDetail,
                                                    Asset: [{
                                                        index: 0,
                                                        file: file
                                                    }],
                                                }));
                                            }}
                                            fileFormats={objectFileFormatsStr}
                                            file={assetDetail.Asset ? assetDetail.Asset[0].file : undefined}
                                            data-testid="asset-file"
                                        />
                                        }
                                        {
                                            isMultiFile &&
                                            <FolderUpload label="Choose Folder" onSelect={async (fileHandles: any[]) => {
                                                setFileHandles(fileHandles)
                                                const files = await getFilesFromFileHandles(fileHandles)
                                                setFileUploadTableItems(files)
                                                setAssetDetail((assetDetail) =>({
                                                    ...assetDetail,
                                                    Asset: files
                                                }))
                                            } }></FolderUpload>

                                        }

                                    </Grid>
                                    </>

                                    )}
                                    {/*<SpaceBetween direction="vertical" size="l">*/}
                                    {/*    <Button onClick={()=>setCounter(counter+1)}> Add more </Button>*/}
                                    {/*</SpaceBetween>*/}
                                    {/*<SpaceBetween direction="vertical" size="l">*/}
                                    {/*    <Table*/}
                                    {/*        columnDefinitions={workflowColumnDefns}*/}
                                    {/*        items={workflows}*/}
                                    {/*        onSelectionChange={({ detail }) => {*/}
                                    {/*            console.log("detail selection change", detail);*/}
                                    {/*            setSelectedWorkflows(detail.selectedItems);*/}
                                    {/*        }}*/}
                                    {/*        selectedItems={selectedWorkflows}*/}
                                    {/*        trackBy="workflowId"*/}
                                    {/*        selectionType="multi"*/}
                                    {/*        ariaLabels={{*/}
                                    {/*            selectionGroupLabel: "Items selection",*/}
                                    {/*            allItemsSelectionLabel: ({ selectedItems }) =>*/}
                                    {/*                `${selectedItems.length} ${*/}
                                    {/*                    selectedItems.length === 1*/}
                                    {/*                        ? "item"*/}
                                    {/*                        : "items"*/}
                                    {/*                } selected`,*/}
                                    {/*            itemSelectionLabel: ({ selectedItems }, item) => {*/}
                                    {/*                const isItemSelected = selectedItems.filter(*/}
                                    {/*                    (i) => i.name === item.name*/}
                                    {/*                ).length;*/}
                                    {/*                return `${item.name} is ${*/}
                                    {/*                    isItemSelected ? "" : "not"*/}
                                    {/*                } selected`;*/}
                                    {/*            },*/}
                                    {/*        }}*/}
                                    {/*        data-testid="workflow-table"*/}
                                    {/*    />*/}
                                    {/*</SpaceBetween>*/}
                                </Container>
                            ),
                            isOptional: true,
                        },
                        {
                            title: "Review and Upload",
                            content: (
                                <SpaceBetween size="xs">
                                    <Header
                                        variant="h3"
                                        actions={
                                            <Button onClick={() => setActiveStepIndex(0)}>
                                                Edit
                                            </Button>
                                        }
                                    >
                                        Review
                                    </Header>
                                    <Container header={<Header variant="h2">Asset Detail</Header>}>
                                        <ColumnLayout columns={2} variant="text-grid">
                                            {Object.keys(assetDetail).filter((k) => k !== 'Asset').map((k) => (
                                                <DisplayKV
                                                    key={k}
                                                    label={k}
                                                    value={assetDetail[k as keyof AssetDetail]}
                                                />
                                            ))}
                                        </ColumnLayout>
                                    </Container>
                                    <Container
                                        header={<Header variant="h2">Asset Metadata</Header>}
                                    >
                                        <ColumnLayout columns={2} variant="text-grid">
                                            {Object.keys(metadata).map((k) => (
                                                <DisplayKV
                                                    key={k}
                                                    label={k}
                                                    value={metadata[k as keyof Metadata]}
                                                />
                                            ))}
                                        </ColumnLayout>
                                    </Container>
                                    <Container
                                        header={<Header variant="h2">Selected Workflows</Header>}
                                    >
                                        <Table
                                            columnDefinitions={workflowColumnDefns}
                                            items={selectedWorkflows}
                                        />
                                    </Container>
                                </SpaceBetween>
                            ),
                        },
                    ]}
                />
            )}
        </Box>
    );
};

export default function AssetUploadPage() {
    return (
        <Box padding={{ top: false ? "s" : "m", horizontal: "l" }}>
            <Grid gridDefinition={[{ colspan: { default: 12 } }]}>
                <div>
                    <TextContent>
                        <Header variant="h1">Create Asset</Header>
                    </TextContent>

                    <UploadForm />
                </div>
            </Grid>
        </Box>
    );
}
