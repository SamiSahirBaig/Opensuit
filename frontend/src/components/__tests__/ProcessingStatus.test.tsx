/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ProcessingStatus } from "../ProcessingStatus";
import type { JobStatusResponse } from "@/lib/api";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
    Download: () => <div data-testid="download-icon" />,
    CheckCircle: () => <div data-testid="check-icon" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    Loader2: () => <div data-testid="loader-icon" />,
    ServerOff: () => <div data-testid="server-off-icon" />,
}));

// Mock the getDownloadUrl function
jest.mock("@/lib/api", () => ({
    ...jest.requireActual("@/lib/api"),
    getDownloadUrl: (token: string) => `/api/download/${token}`,
}));

describe("ProcessingStatus", () => {
    it("renders nothing when no state is active", () => {
        const { container } = render(
            <ProcessingStatus status={null} isProcessing={false} error={null} />
        );

        expect(container.firstChild).toBeNull();
    });

    it("shows processing indicator when processing", () => {
        const status: JobStatusResponse = {
            jobId: "job-1",
            status: "PROCESSING",
            progress: 50,
            downloadToken: null,
            message: "Processing...",
            originalFileName: "test.pdf",
        };

        render(
            <ProcessingStatus status={status} isProcessing={true} error={null} />
        );

        expect(screen.getByText(/processing your file/i)).toBeInTheDocument();
        expect(screen.getByText("50% complete")).toBeInTheDocument();
    });

    it("shows completed state with download link", () => {
        const status: JobStatusResponse = {
            jobId: "job-2",
            status: "COMPLETED",
            progress: 100,
            downloadToken: "dl-token-abc",
            message: "Done",
            originalFileName: "result.pdf",
        };

        render(
            <ProcessingStatus status={status} isProcessing={false} error={null} />
        );

        expect(screen.getByText(/processing complete/i)).toBeInTheDocument();
        expect(screen.getByText("Download File")).toBeInTheDocument();

        const downloadLink = screen.getByRole("link", { name: /download file/i });
        expect(downloadLink).toHaveAttribute("href", "/api/download/dl-token-abc");
    });

    it("shows error message when failed", () => {
        render(
            <ProcessingStatus
                status={null}
                isProcessing={false}
                error="Something went wrong"
            />
        );

        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows server error hint when connection error", () => {
        render(
            <ProcessingStatus
                status={null}
                isProcessing={false}
                error="Unable to connect to the server"
            />
        );

        expect(screen.getByText(/backend server unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/cd backend/i)).toBeInTheDocument();
    });
});
