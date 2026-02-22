/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileUpload } from "../FileUpload";

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
    Upload: () => <div data-testid="upload-icon" />,
    X: () => <div data-testid="x-icon" />,
    FileText: () => <div data-testid="file-icon" />,
}));

describe("FileUpload", () => {
    const mockOnFilesSelected = jest.fn();

    beforeEach(() => {
        mockOnFilesSelected.mockClear();
    });

    it("renders upload zone with drop text", () => {
        render(
            <FileUpload
                acceptedTypes={[".pdf"]}
                onFilesSelected={mockOnFilesSelected}
            />
        );

        expect(screen.getByText(/drag/i)).toBeInTheDocument();
    });

    it("accepts valid file and shows file name", async () => {
        render(
            <FileUpload
                acceptedTypes={[".pdf"]}
                onFilesSelected={mockOnFilesSelected}
            />
        );

        const file = new File(["test content"], "document.pdf", {
            type: "application/pdf",
        });

        // Simulate file input change
        const input = document.querySelector('input[type="file"]');
        expect(input).not.toBeNull();

        if (input) {
            Object.defineProperty(input, "files", {
                value: [file],
            });
            fireEvent.change(input);
        }

        await waitFor(() => {
            expect(screen.getByText("document.pdf")).toBeInTheDocument();
        });

        expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
    });

    it("rejects oversized file and shows error", async () => {
        render(
            <FileUpload
                acceptedTypes={[".pdf"]}
                onFilesSelected={mockOnFilesSelected}
                maxSizeMB={0.001} // ~1KB max
            />
        );

        // Create a file that's larger than 1KB
        const largeContent = new Array(2000).fill("x").join("");
        const file = new File([largeContent], "big.pdf", {
            type: "application/pdf",
        });

        const input = document.querySelector('input[type="file"]');
        if (input) {
            Object.defineProperty(input, "files", {
                value: [file],
            });
            fireEvent.change(input);
        }

        await waitFor(() => {
            expect(screen.getByText(/exceeds/i)).toBeInTheDocument();
        });
    });

    it("allows removing a selected file", async () => {
        render(
            <FileUpload
                acceptedTypes={[".pdf"]}
                onFilesSelected={mockOnFilesSelected}
            />
        );

        const file = new File(["content"], "removable.pdf", {
            type: "application/pdf",
        });

        const input = document.querySelector('input[type="file"]');
        if (input) {
            Object.defineProperty(input, "files", {
                value: [file],
            });
            fireEvent.change(input);
        }

        await waitFor(() => {
            expect(screen.getByText("removable.pdf")).toBeInTheDocument();
        });

        // Find and click the remove button (the X icon container)
        const removeButtons = screen.getAllByRole("button");
        const removeBtn = removeButtons.find(btn =>
            btn.querySelector('[data-testid="x-icon"]')
        );
        if (removeBtn) {
            fireEvent.click(removeBtn);
        }

        await waitFor(() => {
            expect(screen.queryByText("removable.pdf")).not.toBeInTheDocument();
        });
    });
});
