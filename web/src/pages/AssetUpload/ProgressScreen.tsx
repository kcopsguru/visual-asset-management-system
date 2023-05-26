/*
 * Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Box, Grid, TextContent } from "@cloudscape-design/components";

import ProgressBar, { ProgressBarProps } from "@cloudscape-design/components/progress-bar";
import StatusIndicator, {
    StatusIndicatorProps,
} from "@cloudscape-design/components/status-indicator";

export class AllUploadProgressBarProps {
    numberOfFilesToBeUploaded!: number;
    doneUploading!: number;
    currentFileName!: string;
}

class ProgressScreenProps {
    allAssetProgress!: AllUploadProgressBarProps
    assetUploadProgress!: ProgressBarProps;
    previewUploadProgress!: ProgressBarProps;
    execStatus!: Record<string, StatusIndicatorProps.Type>;
}

export default function ProgressScreen({
    allAssetProgress,
    assetUploadProgress,
    previewUploadProgress,
    execStatus,
}: ProgressScreenProps): JSX.Element {
    return (
        <Box padding={{ top: false ? "s" : "m", horizontal: "l" }}>
            <Grid gridDefinition={[{ colspan: { default: 12 } }]}>
                <div>
                    <Box variant="awsui-key-label">Upload Progress</Box>
                    <ProgressBar
                        status={allAssetProgress.doneUploading === allAssetProgress.numberOfFilesToBeUploaded ? 'success' : 'in-progress'}
                        value={(allAssetProgress.doneUploading / allAssetProgress.numberOfFilesToBeUploaded) * 100}
                        label={`Uploading ${allAssetProgress.doneUploading + 1} of ${allAssetProgress.numberOfFilesToBeUploaded}`}
                    />
                    <ProgressBar
                        status={assetUploadProgress.status}
                        value={assetUploadProgress.value}
                        label={` Uploading ${allAssetProgress.currentFileName}`}
                    />
                    <ProgressBar
                        status={previewUploadProgress.status}
                        value={previewUploadProgress.value}
                        label="Preview Upload Progress"
                    />
                    <Box variant="awsui-key-label">Exec Progress</Box>

                    {Object.keys(execStatus).map((label) => (
                        <div key={label}>
                            <StatusIndicator type={execStatus[label]}>{label}</StatusIndicator>
                        </div>
                    ))}
                    <div>
                        <TextContent>
                            Please do not close your browser window until processing completes.
                        </TextContent>
                    </div>
                </div>
            </Grid>
        </Box>
    );
}
