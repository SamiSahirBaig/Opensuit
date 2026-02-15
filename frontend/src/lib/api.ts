// Use relative URLs in the browser so requests go through Next.js proxy rewrites.
// On the server (SSR), use the full backend URL.
const API_BASE = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    : '';

export interface UploadResponse {
    jobId: string;
    status: string;
    message: string;
}

export interface JobStatusResponse {
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    downloadToken: string | null;
    message: string;
    originalFileName: string;
}

class ApiError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

function getNetworkErrorMessage(): string {
    return 'Unable to connect to the server. Please make sure the backend is running on port 8080 and try again.';
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
    try {
        const res = await fetch(url, options);
        return res;
    } catch (error) {
        if (error instanceof TypeError && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed') ||
            error.message.includes('ECONNREFUSED')
        )) {
            throw new ApiError(getNetworkErrorMessage());
        }
        throw new ApiError(getNetworkErrorMessage());
    }
}

export async function uploadFile(file: File, endpoint: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await safeFetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `Upload failed (${res.status})` }));
        throw new ApiError(error.message || 'Upload failed', res.status);
    }

    return res.json();
}

export async function uploadFiles(files: File[], endpoint: string): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await safeFetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `Upload failed (${res.status})` }));
        throw new ApiError(error.message || 'Upload failed', res.status);
    }

    return res.json();
}

export async function checkJobStatus(jobId: string): Promise<JobStatusResponse> {
    const res = await safeFetch(`${API_BASE}/api/status/${jobId}`);

    if (!res.ok) {
        throw new ApiError('Failed to check job status', res.status);
    }

    return res.json();
}

export function getDownloadUrl(token: string): string {
    return `${API_BASE}/api/download/${token}`;
}

export async function pollJobStatus(
    jobId: string,
    onUpdate: (status: JobStatusResponse) => void,
    intervalMs: number = 1500
): Promise<JobStatusResponse> {
    return new Promise((resolve, reject) => {
        let retries = 0;
        const maxRetries = 60; // 90 seconds max

        const poll = async () => {
            try {
                const status = await checkJobStatus(jobId);
                onUpdate(status);
                retries = 0; // Reset on success

                if (status.status === 'COMPLETED') {
                    resolve(status);
                } else if (status.status === 'FAILED') {
                    reject(new ApiError(status.message || 'Processing failed'));
                } else {
                    setTimeout(poll, intervalMs);
                }
            } catch (error) {
                retries++;
                if (retries >= maxRetries) {
                    reject(new ApiError('Connection lost. Please try again.'));
                } else {
                    // Retry with backoff
                    setTimeout(poll, intervalMs * Math.min(retries, 3));
                }
            }
        };

        poll();
    });
}
