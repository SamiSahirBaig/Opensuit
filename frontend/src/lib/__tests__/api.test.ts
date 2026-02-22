/**
 * @jest-environment jsdom
 */

import { uploadFile, checkJobStatus, getDownloadUrl, pollJobStatus } from "../api";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
    mockFetch.mockClear();
});

describe("uploadFile", () => {
    it("returns upload response on success", async () => {
        const mockResponse = { jobId: "job-123", status: "QUEUED", message: "Upload successful" };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        });

        const file = new File(["test content"], "test.pdf", { type: "application/pdf" });
        const result = await uploadFile(file, "/api/convert/pdf-to-word");

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/convert/pdf-to-word",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("throws ApiError on server error", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ message: "Internal Server Error" }),
        });

        const file = new File(["test"], "test.pdf", { type: "application/pdf" });

        await expect(uploadFile(file, "/api/convert/pdf-to-word"))
            .rejects.toThrow("Internal Server Error");
    });

    it("throws ApiError on network error", async () => {
        mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

        const file = new File(["test"], "test.pdf", { type: "application/pdf" });

        await expect(uploadFile(file, "/api/convert/pdf-to-word"))
            .rejects.toThrow("Unable to connect");
    });
});

describe("checkJobStatus", () => {
    it("returns job status on success", async () => {
        const mockStatus = {
            jobId: "job-123",
            status: "PROCESSING",
            progress: 50,
            downloadToken: null,
            message: "Processing...",
            originalFileName: "test.pdf",
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockStatus),
        });

        const result = await checkJobStatus("job-123");
        expect(result).toEqual(mockStatus);
        expect(mockFetch).toHaveBeenCalledWith("/api/status/job-123", undefined);
    });

    it("throws on failed status check", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        await expect(checkJobStatus("missing-id")).rejects.toThrow("Failed to check job status");
    });
});

describe("getDownloadUrl", () => {
    it("constructs correct URL", () => {
        const url = getDownloadUrl("abc-token-123");
        expect(url).toBe("/api/download/abc-token-123");
    });
});

describe("pollJobStatus", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("resolves when job completes", async () => {
        const completedStatus = {
            jobId: "job-poll",
            status: "COMPLETED" as const,
            progress: 100,
            downloadToken: "dl-token",
            message: "Done",
            originalFileName: "test.pdf",
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(completedStatus),
        });

        const onUpdate = jest.fn();
        const promise = pollJobStatus("job-poll", onUpdate, 100);

        // Allow async poll to execute
        await jest.runAllTimersAsync();

        const result = await promise;
        expect(result.status).toBe("COMPLETED");
        expect(onUpdate).toHaveBeenCalledWith(completedStatus);
    });

    it("rejects when job fails", async () => {
        const failedStatus = {
            jobId: "job-fail",
            status: "FAILED" as const,
            progress: 0,
            downloadToken: null,
            message: "Conversion error",
            originalFileName: "test.pdf",
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(failedStatus),
        });

        const onUpdate = jest.fn();
        const promise = pollJobStatus("job-fail", onUpdate, 100);

        await jest.runAllTimersAsync();

        await expect(promise).rejects.toThrow("Conversion error");
    });
});
